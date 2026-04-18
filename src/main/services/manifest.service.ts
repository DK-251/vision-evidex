import { createHash } from 'node:crypto';
import type {
  ManifestEntry,
  ManifestFile,
  IntegrityCheckResult,
} from '@shared/types/entities';
import type { EvidexContainerService } from './evidex-container.service';

/**
 * ManifestService — the append-only SHA-256 manifest inside every
 * `.evidex` container. Thin wrapper on top of EvidexContainerService:
 *
 *   - `append()` delegates to `container.appendManifest()` (in-memory;
 *     persists on next `container.save()`).
 *   - `read()` reads `manifest.json` from the currently-open container.
 *   - `integrityCheck()` recomputes SHA-256 for every original image in
 *     the container and reports hash mismatches + missing files.
 *
 * Single-slot semantics are inherited from EvidexContainerService:
 * every call resolves the currently-open handle, then verifies the
 * caller's projectId matches it.
 */

export class ManifestService {
  constructor(
    private readonly container: EvidexContainerService,
    private readonly opts: { now?: () => Date } = {}
  ) {}

  async append(projectId: string, entry: ManifestEntry): Promise<void> {
    const handle = this.requireHandle(projectId);
    await this.container.appendManifest(handle.containerId, entry);
  }

  async read(projectId: string): Promise<ManifestFile> {
    const handle = this.requireHandle(projectId);
    return this.container.readManifest(handle.containerId);
  }

  async integrityCheck(projectId: string): Promise<IntegrityCheckResult> {
    const handle = this.requireHandle(projectId);
    const manifest = await this.container.readManifest(handle.containerId);
    const images = await this.container.extractAllImages(handle.containerId, 'original');

    const mismatches: IntegrityCheckResult['mismatches'] = [];
    let passed = 0;
    let failed = 0;

    for (const entry of manifest.entries) {
      const internalPath = `images/original/${entry.originalFilename}`;
      const buffer = images.get(internalPath);
      if (!buffer) {
        failed += 1;
        mismatches.push({
          captureId: entry.captureId,
          expectedHash: entry.sha256Hash,
          actualHash: '(missing)',
        });
        continue;
      }
      const actual = createHash('sha256').update(buffer).digest('hex');
      if (actual === entry.sha256Hash) {
        passed += 1;
      } else {
        failed += 1;
        mismatches.push({
          captureId: entry.captureId,
          expectedHash: entry.sha256Hash,
          actualHash: actual,
        });
      }
    }

    const now = this.opts.now ? this.opts.now() : new Date();
    return {
      projectId,
      totalChecked: manifest.entries.length,
      passed,
      failed,
      mismatches,
      checkedAt: now.toISOString(),
    };
  }

  private requireHandle(projectId: string) {
    const handle = this.container.getCurrentHandle();
    if (!handle) throw new Error('no container is currently open');
    if (handle.projectId !== projectId) {
      throw new Error(
        `projectId mismatch: open container is ${handle.projectId}, got ${projectId}`
      );
    }
    return handle;
  }
}
