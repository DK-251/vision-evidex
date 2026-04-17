import type { ExportOptionsInput, ExportResult } from '@shared/types/entities';

/**
 * ExportService — Word, PDF, HTML, audit-bundle generation.
 *
 * Phase 3 implementation. Notes:
 *   - Word: `docx` package, DXA widths only, ShadingType.CLEAR, Arial.
 *   - PDF:  hidden BrowserWindow + webContents.printToPDF (no Puppeteer).
 *   - HTML: self-contained file, images as base64 data URIs.
 *   - Audit bundle: archiver ZIP with 7 required artefacts +
 *     integrity gate (blocks export on hash mismatch).
 */
export class ExportService {
  async word(_options: ExportOptionsInput): Promise<ExportResult> {
    throw new Error('ExportService.word — Phase 3');
  }

  async pdf(_options: ExportOptionsInput): Promise<ExportResult> {
    throw new Error('ExportService.pdf — Phase 3');
  }

  async html(_options: ExportOptionsInput): Promise<ExportResult> {
    throw new Error('ExportService.html — Phase 3');
  }

  async auditBundle(_options: ExportOptionsInput): Promise<ExportResult> {
    throw new Error('ExportService.auditBundle — Phase 4');
  }
}
