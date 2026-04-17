import type {
  CaptureRequestInput,
  CaptureResult,
  AnnotationSaveInput,
  AnnotationResult,
  StatusTag,
  ThumbnailSize,
} from '@shared/types/entities';

/**
 * CaptureService — screenshot pipeline, annotation compositing, tag updates.
 *
 * Phase 2 Week 7 implementation. Pipeline order (FIXED — do not reorder):
 *   1. desktopCapturer.getSources() → raw buffer
 *   2. SHA-256 hash on RAW bytes (before any compression)
 *   3. sharp(raw).jpeg({ quality: 85 }) compressed buffer
 *   4. sharp(raw).resize(160,90).jpeg({ quality: 70 }) thumbnail
 *   5. Write original JPEG to images/original/, append ManifestEntry
 */
export class CaptureService {
  async screenshot(_request: CaptureRequestInput): Promise<CaptureResult> {
    throw new Error('CaptureService.screenshot not implemented — Phase 2 Week 7');
  }

  async saveAnnotation(_request: AnnotationSaveInput): Promise<AnnotationResult> {
    throw new Error('CaptureService.saveAnnotation not implemented — Phase 2 Week 9');
  }

  async updateTag(_captureId: string, _tag: StatusTag): Promise<void> {
    throw new Error('CaptureService.updateTag not implemented — Phase 2 Week 8');
  }

  async getThumbnail(_captureId: string, _size: ThumbnailSize): Promise<Buffer> {
    throw new Error('CaptureService.getThumbnail not implemented — Phase 2 Week 8');
  }
}
