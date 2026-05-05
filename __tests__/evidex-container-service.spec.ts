import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EvidexContainerService } from '../src/main/services/evidex-container.service';

const PASSWORD = 'unit-test-password';

describe('EvidexContainerService', () => {
  let tmpDir: string;
  let svc: EvidexContainerService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidex-container-'));
    svc = new EvidexContainerService({ password: PASSWORD });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function containerPath(name = 'test.evidex'): string {
    return path.join(tmpDir, name);
  }

  describe('create + save', () => {
    it('writes an encrypted file that is not plaintext-readable', async () => {
      const fp = containerPath();
      await svc.create({ projectId: 'proj_1', filePath: fp });
      expect(fs.existsSync(fp)).toBe(true);
      const raw = fs.readFileSync(fp);
      // First 4 bytes must be the EVDX magic — not a plain ZIP (PK\x03\x04).
      expect(raw.subarray(0, 4).toString('ascii')).toBe('EVDX');
      // The literal projectId must not appear in the encrypted bytes.
      expect(raw.includes(Buffer.from('proj_1'))).toBe(false);
    });

    it('create + save leaves no .tmp and creates .bak only on second save', async () => {
      const fp = containerPath();
      const handle = await svc.create({ projectId: 'proj_1', filePath: fp });
      expect(fs.existsSync(`${fp}.tmp`)).toBe(false);
      expect(fs.existsSync(`${fp}.bak`)).toBe(false);

      await svc.save(handle.containerId);
      expect(fs.existsSync(`${fp}.tmp`)).toBe(false);
      expect(fs.existsSync(`${fp}.bak`)).toBe(true);
    });
  });

  describe('open round-trip', () => {
    it('open reads projectId from the manifest', async () => {
      const fp = containerPath();
      await svc.create({ projectId: 'proj_42', filePath: fp });

      const svc2 = new EvidexContainerService({ password: PASSWORD });
      const handle = await svc2.open(fp);
      expect(handle.projectId).toBe('proj_42');
      expect(handle.filePath).toBe(fp);
    });

    it('addImage → save → open recovers the image bytes', async () => {
      const fp = containerPath();
      const handle = await svc.create({ projectId: 'proj_1', filePath: fp });
      const original = Buffer.from('pretend-jpeg-bytes');
      await svc.addImage(handle.containerId, 'cap_1.jpg', original, 'original');
      await svc.save(handle.containerId);

      const svc2 = new EvidexContainerService({ password: PASSWORD });
      const newHandle = await svc2.open(fp);
      const recovered = await svc2.extractImage(
        newHandle.containerId,
        'images/original/cap_1.jpg'
      );
      expect(recovered.equals(original)).toBe(true);
    });

    it('wrong password rejects open', async () => {
      const fp = containerPath();
      await svc.create({ projectId: 'proj_1', filePath: fp });
      const svc2 = new EvidexContainerService({ password: 'wrong' });
      await expect(svc2.open(fp)).rejects.toThrow();
    });

    it('tampered ciphertext is rejected', async () => {
      const fp = containerPath();
      await svc.create({ projectId: 'proj_1', filePath: fp });
      const bytes = fs.readFileSync(fp);
      bytes[bytes.length - 5] = bytes[bytes.length - 5] ^ 0xff;
      fs.writeFileSync(fp, bytes);
      await expect(svc.open(fp)).rejects.toThrow();
    });
  });

  describe('manifest', () => {
    it('starts with an empty entries array and appends durably', async () => {
      const fp = containerPath();
      const handle = await svc.create({ projectId: 'proj_1', filePath: fp });
      const manifest = await svc.readManifest(handle.containerId);
      expect(manifest.projectId).toBe('proj_1');
      expect(manifest.entries).toEqual([]);

      await svc.appendManifest(handle.containerId, {
        captureId: 'cap_1',
        originalFilename: 'cap_1.jpg',
        sha256Hash: 'a'.repeat(64),
        fileSizeBytes: 1024,
        capturedAt: '2026-04-18T00:00:00Z',
        sequenceNum: 1,
      });
      await svc.save(handle.containerId);

      const svc2 = new EvidexContainerService({ password: PASSWORD });
      const newHandle = await svc2.open(fp);
      const reopened = await svc2.readManifest(newHandle.containerId);
      expect(reopened.entries).toHaveLength(1);
      expect(reopened.entries[0]?.captureId).toBe('cap_1');
    });
  });

  describe('extractAllImages', () => {
    it('filters by type', async () => {
      const fp = containerPath();
      const handle = await svc.create({ projectId: 'proj_1', filePath: fp });
      await svc.addImage(handle.containerId, 'a.jpg', Buffer.from('A'), 'original');
      await svc.addImage(handle.containerId, 'a.jpg', Buffer.from('B'), 'annotated');

      const originals = await svc.extractAllImages(handle.containerId, 'original');
      expect([...originals.keys()]).toEqual(['images/original/a.jpg']);

      const annotated = await svc.extractAllImages(handle.containerId, 'annotated');
      expect([...annotated.keys()]).toEqual(['images/annotated/a.jpg']);

      const both = await svc.extractAllImages(handle.containerId, 'both');
      expect([...both.keys()].sort()).toEqual([
        'images/annotated/a.jpg',
        'images/original/a.jpg',
      ]);
    });
  });

  describe('single-slot enforcement (Rule 11)', () => {
    it('create closes a previously-open container', async () => {
      const fp1 = containerPath('a.evidex');
      const fp2 = containerPath('b.evidex');
      const h1 = await svc.create({ projectId: 'proj_a', filePath: fp1 });
      await svc.create({ projectId: 'proj_b', filePath: fp2 });

      // First handle must no longer be usable via its id.
      await expect(svc.save(h1.containerId)).rejects.toThrow(/mismatch|not currently open/);
      expect(svc.getCurrentHandle()?.projectId).toBe('proj_b');
    });

    it('open closes a previously-open container', async () => {
      const fp1 = containerPath('a.evidex');
      const fp2 = containerPath('b.evidex');
      const h1 = await svc.create({ projectId: 'proj_a', filePath: fp1 });
      await svc.save(h1.containerId);

      // Create + save fp2 so it exists on disk, then close so we can
      // `open()` it through the same service instance.
      const svcTmp = new EvidexContainerService({ password: PASSWORD });
      const h2 = await svcTmp.create({ projectId: 'proj_b', filePath: fp2 });
      await svcTmp.save(h2.containerId);

      await svc.open(fp2);
      await expect(svc.save(h1.containerId)).rejects.toThrow(/mismatch|not currently open/);
    });
  });

  describe('getCurrentHandle', () => {
    it('returns null when no container is open', () => {
      expect(svc.getCurrentHandle()).toBeNull();
    });

    it('returns a copy of the handle after create', async () => {
      const fp = containerPath();
      const h = await svc.create({ projectId: 'proj_1', filePath: fp });
      const returned = svc.getCurrentHandle();
      expect(returned).toEqual(h);
      // Mutating the returned handle must not mutate internal state.
      if (returned) returned.projectId = 'mutated';
      expect(svc.getCurrentHandle()?.projectId).toBe('proj_1');
    });
  });

  describe('getSizeBytes', () => {
    it('returns a positive byte count for a non-empty container', async () => {
      const fp = containerPath();
      const handle = await svc.create({ projectId: 'proj_1', filePath: fp });
      await svc.addImage(handle.containerId, 'a.jpg', Buffer.from('A'.repeat(2048)), 'original');
      await svc.save(handle.containerId);
      const size = await svc.getSizeBytes(handle.containerId);
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('atomic save resilience (Rule 6)', () => {
    it('preserves the original .evidex when a second save fails mid-write', async () => {
      // First save succeeds — the file on disk is the canonical original.
      const fp = containerPath('resilient.evidex');
      const handle = await svc.create({ projectId: 'proj_1', filePath: fp });
      await svc.addImage(handle.containerId, 'a.jpg', Buffer.from('original-bytes'), 'original');
      await svc.save(handle.containerId);
      const originalBytes = fs.readFileSync(fp);

      // Second save: make writeFile throw before the rename can run. The
      // .evidex on disk must still be the original byte-for-byte (atomic
      // rename pattern means a failed write never lands at the final path).
      const writeSpy = vi.spyOn(fs.promises, 'writeFile')
        .mockRejectedValueOnce(new Error('ENOSPC simulated'));

      await svc.addImage(handle.containerId, 'b.jpg', Buffer.from('new-bytes'), 'original');
      await expect(svc.save(handle.containerId)).rejects.toThrow(/ENOSPC simulated/);

      const afterFailure = fs.readFileSync(fp);
      expect(afterFailure.equals(originalBytes)).toBe(true);

      writeSpy.mockRestore();
    });
  });
});
