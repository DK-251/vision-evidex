import type { ManifestEntry, ManifestFile, IntegrityCheckResult } from '@shared/types/entities';

/**
 * ManifestService — append-only SHA-256 manifest inside .evidex.
 *
 * Phase 1 Week 4 implementation. Manifest schema v1:
 *   { schemaVersion: "evidex-manifest-v1", projectId, entries[] }
 *
 * Entries are never removed. Integrity check recomputes SHA-256 on each
 * stored original image and reports mismatches.
 */
export class ManifestService {
  async append(_projectId: string, _entry: ManifestEntry): Promise<void> {
    throw new Error('ManifestService.append — Phase 1 Week 4');
  }

  async read(_projectId: string): Promise<ManifestFile> {
    throw new Error('ManifestService.read — Phase 1 Week 4');
  }

  async integrityCheck(_projectId: string): Promise<IntegrityCheckResult> {
    throw new Error('ManifestService.integrityCheck — Phase 4');
  }
}
