import type {
  ContainerHandle,
  CreateContainerConfig,
  ManifestEntry,
  ManifestFile,
  IntegrityCheckResult,
} from '@shared/types/entities';

/**
 * EvidexContainerService — .evidex file I/O (AES-256-GCM ZIP container).
 *
 * Locked decision: single-slot pattern. `open()` calls `close()` on the
 * currently-held handle (if any) before opening a new one. Multi-handle
 * map signature kept for future-proofing but single-open is enforced
 * at this service layer.
 *
 * Phase 1 Week 4 implementation. Uses:
 *   - PBKDF2-SHA256 (310,000 iters) keyed on machineId + EVIDEX_APP_SECRET
 *   - AES-256-GCM via node:crypto
 *   - Atomic save: .tmp → .bak → rename
 */
export class EvidexContainerService {
  private currentHandle: ContainerHandle | null = null;

  async create(_config: CreateContainerConfig): Promise<ContainerHandle> {
    throw new Error('EvidexContainerService.create not implemented — Phase 1 Week 4');
  }

  async open(_filePath: string): Promise<ContainerHandle> {
    throw new Error('EvidexContainerService.open not implemented — Phase 1 Week 4');
  }

  async close(_containerId: string): Promise<void> {
    throw new Error('EvidexContainerService.close not implemented — Phase 1 Week 4');
  }

  async save(_containerId: string): Promise<void> {
    throw new Error('EvidexContainerService.save not implemented — Phase 1 Week 4');
  }

  getActivePath(_containerId: string): string {
    throw new Error('EvidexContainerService.getActivePath not implemented — Phase 1 Week 4');
  }

  async addImage(
    _containerId: string,
    _filename: string,
    _imageBuffer: Buffer,
    _type: 'original' | 'annotated'
  ): Promise<string> {
    throw new Error('EvidexContainerService.addImage not implemented — Phase 1 Week 4');
  }

  async extractImage(_containerId: string, _imagePath: string): Promise<Buffer> {
    throw new Error('EvidexContainerService.extractImage not implemented — Phase 1 Week 4');
  }

  async extractAllImages(
    _containerId: string,
    _type: 'original' | 'annotated' | 'both'
  ): Promise<Map<string, Buffer>> {
    throw new Error('EvidexContainerService.extractAllImages not implemented — Phase 1 Week 4');
  }

  async appendManifest(_containerId: string, _entry: ManifestEntry): Promise<void> {
    throw new Error('EvidexContainerService.appendManifest not implemented — Phase 1 Week 4');
  }

  async readManifest(_containerId: string): Promise<ManifestFile> {
    throw new Error('EvidexContainerService.readManifest not implemented — Phase 1 Week 4');
  }

  async integrityCheck(_projectId: string): Promise<IntegrityCheckResult> {
    throw new Error('EvidexContainerService.integrityCheck not implemented — Phase 4');
  }

  async getSizeBytes(_containerId: string): Promise<number> {
    throw new Error('EvidexContainerService.getSizeBytes not implemented — Phase 1 Week 6');
  }

  getCurrentHandle(): ContainerHandle | null {
    return this.currentHandle;
  }
}
