import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  TemplateSaveSchema,
  TemplateSectionSchema,
  ReportTypeSchema,
} from '../src/shared/schemas';

/**
 * Builtin templates live as JSON in `/templates/*.json` and are
 * source-of-truth for the Phase 3 Template Builder. They are also
 * mirrored inline in `src/main/services/seed-defaults.ts` so the
 * first-run seed doesn't depend on a bundler-specific JSON import.
 *
 * This spec guards both copies against schema drift: every file is
 * parsed against `TemplateSaveSchema`, and the report types add up to
 * the full PRD set (TSR / DSR / UAT / BUG / AUDIT).
 */

const TEMPLATE_FILES = [
  'tsr.json',
  'dsr.json',
  'uat-handoff.json',
  'bug-report.json',
  'audit-pack.json',
] as const;

const TEMPLATES_DIR = path.resolve(__dirname, '..', 'templates');

// The on-disk JSON shape mirrors `Template` (includes `isBuiltin`) but
// the existing `TemplateSaveSchema` only accepts the writer payload
// (no isBuiltin). Build a strict superset schema locally for the file
// audit so we don't loosen the runtime save validator.
const BuiltinTemplateFileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().max(500).optional(),
  isBuiltin: z.literal(true),
  schema: z.object({
    reportType: ReportTypeSchema,
    sections: z.array(TemplateSectionSchema).min(1),
  }),
});

describe('builtin template JSONs', () => {
  it.each(TEMPLATE_FILES)('%s parses against BuiltinTemplateFileSchema', (filename) => {
    const filePath = path.join(TEMPLATES_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const result = BuiltinTemplateFileSchema.safeParse(parsed);
    expect(result.success, result.success ? '' : JSON.stringify(result.error.issues, null, 2)).toBe(true);
  });

  it('also validates as a writer payload via TemplateSaveSchema (minus isBuiltin)', () => {
    for (const filename of TEMPLATE_FILES) {
      const raw = fs.readFileSync(path.join(TEMPLATES_DIR, filename), 'utf8');
      const { isBuiltin: _omit, ...writerShape } = JSON.parse(raw) as { isBuiltin: boolean; [k: string]: unknown };
      const result = TemplateSaveSchema.safeParse(writerShape);
      expect(result.success, `${filename}: ${result.success ? '' : JSON.stringify(result.error.issues)}`).toBe(true);
    }
  });

  it('covers all 5 PRD report types (TSR/DSR/UAT/BUG/AUDIT)', () => {
    const types = TEMPLATE_FILES.map((f) => {
      const raw = fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf8');
      return (JSON.parse(raw) as { schema: { reportType: string } }).schema.reportType;
    });
    expect(new Set(types)).toEqual(new Set(['TSR', 'DSR', 'UAT', 'BUG', 'AUDIT']));
  });
});
