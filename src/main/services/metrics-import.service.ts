import type { MetricsImportInput, ImportedMetricsData } from '@shared/types/entities';

export type MetricsImportResult =
  | { success: true; metrics: ImportedMetricsData; warningCount: number }
  | { success: false; reason: string; details?: string; fields?: Record<string, string> };

/**
 * MetricsImportService — reads xlsx or json metrics files.
 *
 * Risk R-15 mitigation: all numeric fields use `z.coerce` so LibreOffice
 * string-encoded numbers pass validation. Use `xlsx.utils.sheet_to_json`
 * with `{ header: 1, raw: false }` → all values come out as strings,
 * then Zod coerces on parse.
 *
 * Phase 3 implementation.
 */
export class MetricsImportService {
  async import(_input: MetricsImportInput): Promise<MetricsImportResult> {
    throw new Error('MetricsImportService.import — Phase 3');
  }
}
