/**
 * Zod schemas — all IPC payload validation lives here.
 * Every IPC handler MUST call `schema.parse()` before passing to services.
 * Inferred types are re-exported for service/handler typing.
 */

import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────────────────────────

export const StatusTagSchema = z.enum(['pass', 'fail', 'blocked', 'skip', 'untagged']);

export const CaptureModeSchema = z.enum(['fullscreen', 'active-window', 'region']);

export const SignOffDecisionSchema = z.enum(['accept', 'reject', 'accept_with_comments']);

export const ReportTypeSchema = z.enum(['TSR', 'DSR', 'UAT', 'BUG', 'AUDIT']);

export const TemplateSectionTypeSchema = z.enum([
  'text_field',
  'image_slot',
  'metrics_table',
  'signature_block',
  'branding_header',
  'divider',
  'rich_text',
]);

// ─── Session ────────────────────────────────────────────────────────────

export const SessionIntakeSchema = z.object({
  projectId: z.string().min(1),
  testId: z.string().min(1).max(100),
  testName: z.string().min(1).max(200),
  testDataMatrix: z.string().optional(),
  scenario: z.string().optional(),
  requirementId: z.string().optional(),
  requirementDesc: z.string().optional(),
  environment: z.string().min(1),
  testerName: z.string().min(1),
  testerEmail: z.string().email().optional(),
  applicationUnderTest: z.string().min(1),
});

export const SessionEndSchema = z.object({
  sessionId: z.string().min(1),
});

// ─── Capture ────────────────────────────────────────────────────────────

export const ScreenRegionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const CaptureRequestSchema = z
  .object({
    sessionId: z.string().min(1),
    mode: CaptureModeSchema,
    region: ScreenRegionSchema.optional(),
    statusTag: StatusTagSchema.default('untagged'),
  })
  .refine((d) => d.mode !== 'region' || d.region !== undefined, {
    message: 'region required when mode is "region"',
    path: ['region'],
  });

export const BlurRegionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  blurRadius: z.number().min(20), // OWASP PII redaction threshold
});

export const FabricObjectSchema = z
  .object({
    type: z.string(),
  })
  .passthrough();

export const FabricCanvasJSONSchema = z
  .object({
    version: z.string(),
    objects: z.array(FabricObjectSchema),
  })
  .passthrough();

export const AnnotationSaveSchema = z.object({
  captureId: z.string().min(1),
  fabricCanvasJson: FabricCanvasJSONSchema,
  compositeBuffer: z.instanceof(Buffer),
  blurRegions: z.array(BlurRegionSchema),
});

export const CaptureTagUpdateSchema = z.object({
  captureId: z.string().min(1),
  tag: StatusTagSchema,
});

// ─── Project ────────────────────────────────────────────────────────────

export const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(100),
  clientName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  templateId: z.string().min(1),
  brandingProfileId: z.string().min(1),
  storagePath: z.string().min(1),
  namingPattern: z.string().default('{ProjectCode}_{TestID}_{Date}_{Time}_{Seq}'),
});

export const ProjectOpenSchema = z.object({
  filePath: z.string().min(1),
});

export const ProjectCloseSchema = z.object({
  projectId: z.string().min(1),
});

// ─── Export ─────────────────────────────────────────────────────────────

export const ExportOptionsSchema = z.object({
  projectId: z.string().min(1),
  outputPath: z.string().min(1),
  sessionIds: z.array(z.string()).optional(),
  includeOriginals: z.boolean().default(true),
});

// ─── Metrics ────────────────────────────────────────────────────────────

export const MetricsImportSchema = z.object({
  projectId: z.string().min(1),
  filePath: z.string().min(1),
  format: z.enum(['xlsx', 'json']),
});

// LibreOffice compatibility: all numeric fields use z.coerce
// so string-encoded numbers from xlsx parsing succeed.
export const ImportedMetricsSchema = z.object({
  template_version: z.string(),
  report_type: ReportTypeSchema,
  project_name: z.string(),
  reporting_period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reporting_period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_test_cases: z.coerce.number().int().min(0),
  executed: z.coerce.number().int().min(0),
  passed: z.coerce.number().int().min(0),
  failed: z.coerce.number().int().min(0),
  blocked: z.coerce.number().int().min(0),
  not_run: z.coerce.number().int().min(0),
  pass_rate_pct: z.coerce.number().min(0).max(100),
  defects_raised: z.coerce.number().int().min(0),
  defects_closed: z.coerce.number().int().min(0),
  defects_open: z.coerce.number().int().min(0),
  critical_defects: z.coerce.number().int().min(0),
  coverage_pct: z.coerce.number().min(0).max(100),
  environment: z.string(),
  notes: z.string().nullable(),
});

// ─── Template ───────────────────────────────────────────────────────────

export const TemplateSectionSchema = z.object({
  id: z.string().min(1),
  type: TemplateSectionTypeSchema,
  label: z.string().min(1),
  required: z.boolean(),
  columnSpan: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  config: z.record(z.unknown()),
});

export const TemplateSaveSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  schema: z.object({
    reportType: ReportTypeSchema,
    sections: z.array(TemplateSectionSchema).min(1),
  }),
});

// ─── Sign-off ───────────────────────────────────────────────────────────

export const SignOffSubmitSchema = z
  .object({
    projectId: z.string().min(1),
    reviewerName: z.string().min(1),
    reviewerRole: z.string().min(1),
    decision: SignOffDecisionSchema,
    comments: z.string().optional(),
  })
  .refine(
    (d) => d.decision !== 'reject' || (d.comments !== undefined && d.comments.trim().length > 0),
    { message: 'Comments required when decision is "reject"', path: ['comments'] }
  );

// ─── Licence ────────────────────────────────────────────────────────────

export const LicenceActivateSchema = z.object({
  licenceKey: z.string().min(1),
});

export const LicenceValidateSchema = z.object({});

// ─── Settings ───────────────────────────────────────────────────────────

export const SettingsSchema = z.object({
  schemaVersion: z.number().int().min(1),
  onboardingComplete: z.boolean(),
});

// ─── Type inference ─────────────────────────────────────────────────────

export type SessionIntakeInput = z.infer<typeof SessionIntakeSchema>;
export type SessionEndInput = z.infer<typeof SessionEndSchema>;
export type CaptureRequestInput = z.infer<typeof CaptureRequestSchema>;
export type AnnotationSaveInput = z.infer<typeof AnnotationSaveSchema>;
export type CaptureTagUpdateInput = z.infer<typeof CaptureTagUpdateSchema>;
export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;
export type ProjectOpenInput = z.infer<typeof ProjectOpenSchema>;
export type ProjectCloseInput = z.infer<typeof ProjectCloseSchema>;
export type ExportOptionsInput = z.infer<typeof ExportOptionsSchema>;
export type MetricsImportInput = z.infer<typeof MetricsImportSchema>;
export type ImportedMetricsInput = z.infer<typeof ImportedMetricsSchema>;
export type TemplateSaveInput = z.infer<typeof TemplateSaveSchema>;
export type SignOffSubmitInput = z.infer<typeof SignOffSubmitSchema>;
export type LicenceActivateInput = z.infer<typeof LicenceActivateSchema>;
