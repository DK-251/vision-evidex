import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { EvidexContainerService } from '../src/main/services/evidex-container.service';
import { ManifestService } from '../src/main/services/manifest.service';
import type { ManifestEntry } from '@shared/types/entities';

const PASSWORD = 'manifest-test-password';
const FIXED_NOW = new Date('2026-04-18T12:00:00Z');

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

describe('ManifestService', () => {
  let tmpDir: string;
  let containerPath: string;
  let container: EvidexContainerService;
  let manifest: ManifestService;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidex-manifest-'));
    containerPath = path.join(tmpDir, 'test.evidex');
    container = new EvidexContainerService({ password: PASSWORD });
    manifest = new ManifestService(container, { now: () => FIXED_NOW });
    await container.create({ projectId: 'proj_1', filePath: containerPath });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function addOriginal(filename: string, bytes: Buffer) {
    const handle = container.getCurrentHandle()!;
    return container.addImage(handle.containerId, filename, bytes, 'original');
  }

  function buildEntry(overrides: Partial<ManifestEntry> & Pick<ManifestEntry, 'originalFilename' | 'sha256Hash'>): ManifestEntry {
    return {
      captureId: 'cap_1',
      fileSizeBytes: 1024,
      capturedAt: '2026-04-18T09:05:07Z',
      sequenceNum: 1,
      ...overrides,
    };
  }

  describe('append / read', () => {
    it('append writes an entry readable via read()', async () => {
      const bytes = Buffer.from('image-bytes-1');
      await addOriginal('cap_1.jpg', bytes);
      await manifest.append(
        'proj_1',
        buildEntry({ originalFilename: 'cap_1.jpg', sha256Hash: sha256(bytes) })
      );
      const file = await manifest.read('proj_1');
      expect(file.projectId).toBe('proj_1');
      expect(file.entries).toHaveLength(1);
      expect(file.entries[0]?.captureId).toBe('cap_1');
    });

    it('append preserves every entry across multiple calls (append-only)', async () => {
      await addOriginal('a.jpg', Buffer.from('a'));
      await addOriginal('b.jpg', Buffer.from('b'));
      await manifest.append(
        'proj_1',
        buildEntry({ captureId: 'cap_a', originalFilename: 'a.jpg', sha256Hash: sha256(Buffer.from('a')), sequenceNum: 1 })
      );
      await manifest.append(
        'proj_1',
        buildEntry({ captureId: 'cap_b', originalFilename: 'b.jpg', sha256Hash: sha256(Buffer.from('b')), sequenceNum: 2 })
      );
      const file = await manifest.read('proj_1');
      expect(file.entries.map((e) => e.captureId)).toEqual(['cap_a', 'cap_b']);
    });

    it('survives a container save + reopen roundtrip', async () => {
      const bytes = Buffer.from('persisted');
      await addOriginal('p.jpg', bytes);
      await manifest.append(
        'proj_1',
        buildEntry({ originalFilename: 'p.jpg', sha256Hash: sha256(bytes) })
      );
      const handle = container.getCurrentHandle()!;
      await container.save(handle.containerId);

      const container2 = new EvidexContainerService({ password: PASSWORD });
      const manifest2 = new ManifestService(container2, { now: () => FIXED_NOW });
      await container2.open(containerPath);
      const file = await manifest2.read('proj_1');
      expect(file.entries).toHaveLength(1);
      expect(file.entries[0]?.originalFilename).toBe('p.jpg');
    });
  });

  describe('integrityCheck', () => {
    it('all-pass when every stored image hash matches its manifest entry', async () => {
      const a = Buffer.from('image-a');
      const b = Buffer.from('image-b');
      await addOriginal('a.jpg', a);
      await addOriginal('b.jpg', b);
      await manifest.append(
        'proj_1',
        buildEntry({ captureId: 'cap_a', originalFilename: 'a.jpg', sha256Hash: sha256(a), sequenceNum: 1 })
      );
      await manifest.append(
        'proj_1',
        buildEntry({ captureId: 'cap_b', originalFilename: 'b.jpg', sha256Hash: sha256(b), sequenceNum: 2 })
      );
      const result = await manifest.integrityCheck('proj_1');
      expect(result).toEqual({
        projectId: 'proj_1',
        totalChecked: 2,
        passed: 2,
        failed: 0,
        mismatches: [],
        checkedAt: FIXED_NOW.toISOString(),
      });
    });

    it('detects hash mismatch when manifest claims a wrong hash', async () => {
      const bytes = Buffer.from('real-bytes');
      await addOriginal('x.jpg', bytes);
      await manifest.append(
        'proj_1',
        buildEntry({
          captureId: 'cap_x',
          originalFilename: 'x.jpg',
          sha256Hash: 'f'.repeat(64), // deliberately wrong
        })
      );
      const result = await manifest.integrityCheck('proj_1');
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.mismatches).toHaveLength(1);
      expect(result.mismatches[0]?.captureId).toBe('cap_x');
      expect(result.mismatches[0]?.actualHash).toBe(sha256(bytes));
    });

    it('detects a missing image referenced by the manifest', async () => {
      const bytes = Buffer.from('never-added');
      await manifest.append(
        'proj_1',
        buildEntry({
          captureId: 'cap_ghost',
          originalFilename: 'ghost.jpg',
          sha256Hash: sha256(bytes),
        })
      );
      const result = await manifest.integrityCheck('proj_1');
      expect(result.failed).toBe(1);
      expect(result.mismatches[0]?.actualHash).toBe('(missing)');
    });

    it('mixed pass + fail tallies correctly', async () => {
      const good = Buffer.from('good');
      const bad = Buffer.from('bad');
      await addOriginal('good.jpg', good);
      await addOriginal('bad.jpg', bad);
      await manifest.append(
        'proj_1',
        buildEntry({ captureId: 'g', originalFilename: 'good.jpg', sha256Hash: sha256(good), sequenceNum: 1 })
      );
      await manifest.append(
        'proj_1',
        buildEntry({ captureId: 'b', originalFilename: 'bad.jpg', sha256Hash: 'f'.repeat(64), sequenceNum: 2 })
      );
      const result = await manifest.integrityCheck('proj_1');
      expect(result.totalChecked).toBe(2);
      expect(result.passed).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('single-slot guard', () => {
    it('rejects calls when no container is open', async () => {
      const container2 = new EvidexContainerService({ password: PASSWORD });
      const manifest2 = new ManifestService(container2);
      await expect(manifest2.read('proj_1')).rejects.toThrow(/no container is currently open/);
    });

    it('rejects calls for a projectId that does not match the open container', async () => {
      await expect(manifest.read('proj_99')).rejects.toThrow(/projectId mismatch/);
      await expect(
        manifest.append('proj_99', buildEntry({ originalFilename: 'x.jpg', sha256Hash: 'a'.repeat(64) }))
      ).rejects.toThrow(/projectId mismatch/);
      await expect(manifest.integrityCheck('proj_99')).rejects.toThrow(/projectId mismatch/);
    });
  });
});
