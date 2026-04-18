/**
 * Vision-EviDex — Core entity types.
 * Source of truth for all cross-process data shapes.
 * No imports from src/main/ or src/renderer/ — keep neutral.
 */

// ─── Enums ──────────────────────────────────────────────────────────────

export type StatusTag = 'pass' | 'fail' | 'blocked' | 'skip' | 'untagged';

export type CaptureMode = 'fullscreen' | 'active-window' | 'region';

export type ExportFormat = 'word' | 'pdf' | 'html' | 'audit-bundle';

export type SignOffDecision = 'accept' | 'reject' | 'accept_with_comments';

export type UserRole = 'tester' | 'lead' | 'pm' | 'audit' | 'other';

export type LicenceMode = 'keygen' | 'none';

export type ProjectStatus = 'active' | 'archived';

export type ReportType = 'TSR' | 'DSR' | 'UAT' | 'BUG' | 'AUDIT';

export type ThumbnailSize = 160 | 320 | 640;

export type ModuleStatus = 'PASS' | 'FAIL' | 'WARN' | 'SKIP' | 'SUSPECT';

// ─── Project ────────────────────────────────────────────────────────────

export interface Project {
  id: string; // ULID: proj_01HX...
  name: string;
  clientName: string;
  description?: string;
  startDate: string; // ISO-8601 YYYY-MM-DD
  templateId: string;
  brandingProfileId: string;
  brandingProfile?: BrandingProfile; // snapshot at creation
  storagePath: string; // absolute path to .evidex file
  namingPattern: string;
  status: ProjectStatus;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

// ─── Session ────────────────────────────────────────────────────────────

export interface Session {
  id: string; // ULID: sess_01HX...
  projectId: string;
  testId: string;
  testName: string;
  testDataMatrix?: string;
  scenario?: string;
  requirementId?: string;
  requirementDesc?: string;
  environment: string;
  testerName: string;
  testerEmail?: string;
  applicationUnderTest: string;
  startedAt: string;
  endedAt?: string;
  captureCount: number;
  passCount: number;
  failCount: number;
  blockedCount: number;
}

export interface SessionIntakeInput {
  projectId: string;
  testId: string;
  testName: string;
  testDataMatrix?: string;
  scenario?: string;
  requirementId?: string;
  requirementDesc?: string;
  environment: string;
  testerName: string;
  testerEmail?: string;
  applicationUnderTest: string;
}

export interface SessionSummary {
  sessionId: string;
  captureCount: number;
  passCount: number;
  failCount: number;
  blockedCount: number;
  durationSec: number;
}

export interface SessionStatus {
  sessionId: string;
  captureCount: number;
  passCount: number;
  failCount: number;
  blockedCount: number;
}

// ─── Capture ────────────────────────────────────────────────────────────

export interface ScreenRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Capture {
  id: string; // ULID: cap_01HX...
  sessionId: string;
  projectId: string;
  sequenceNum: number;
  originalFilename: string;
  annotatedFilename?: string;
  sha256Hash: string;
  fileSizeBytes: number;
  captureMode: CaptureMode;
  statusTag: StatusTag;
  capturedAt: string;
  machineName: string;
  osVersion: string;
  appVersion: string;
  testerName: string;
  notes?: string;
}

export interface CaptureRequestInput {
  sessionId: string;
  mode: CaptureMode;
  region?: ScreenRegion;
  statusTag?: StatusTag;
}

export interface CaptureResult {
  captureId: string;
  filename: string;
  sha256Hash: string;
  fileSizeBytes: number;
  thumbnail: string; // base64 data URL, 160x90
  capturedAt: string;
}

export interface CaptureCountDelta {
  total?: number;
  pass?: number;
  fail?: number;
  blocked?: number;
}

// ─── Annotation ─────────────────────────────────────────────────────────

export interface BlurRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  blurRadius: number; // minimum 20
}

export interface FabricObject {
  type: string;
  [key: string]: unknown;
}

export interface FabricCanvasJSON {
  version: string;
  objects: FabricObject[];
  [key: string]: unknown;
}

export interface AnnotationSaveInput {
  captureId: string;
  fabricCanvasJson: FabricCanvasJSON;
  compositeBuffer: Buffer;
  blurRegions: BlurRegion[];
}

export interface AnnotationResult {
  captureId: string;
  annotatedPath: string;
}

export interface StoredAnnotationLayer {
  captureId: string;
  layerJson: string; // JSON.stringify(FabricCanvasJSON)
  fabricVersion: string; // fabric.version at save time — forward compat
  blurRegions: BlurRegion[];
  savedAt: string;
}

export interface CaptureTagUpdate {
  captureId: string;
  tag: StatusTag;
}

// ─── Template ───────────────────────────────────────────────────────────

export type TemplateSectionType =
  | 'text_field'
  | 'image_slot'
  | 'metrics_table'
  | 'signature_block'
  | 'branding_header'
  | 'divider'
  | 'rich_text';

export interface TemplateSection {
  id: string;
  type: TemplateSectionType;
  label: string;
  required: boolean;
  columnSpan: 1 | 2 | 3;
  config: Record<string, unknown>;
}

export interface TemplateSchema {
  reportType: ReportType;
  sections: TemplateSection[];
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  schema: TemplateSchema;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateSaveInput {
  id: string;
  name: string;
  description?: string;
  schema: TemplateSchema;
}

// ─── Branding ───────────────────────────────────────────────────────────

export interface BrandingProfile {
  id: string;
  name: string;
  companyName: string;
  logoBase64: string | null; // base64-encoded image data (NOT file path)
  logoMimeType: 'image/png' | 'image/jpeg' | null;
  primaryColor: string;
  headerText?: string;
  footerText?: string;
  createdAt: string;
}

// ─── Sign-off (append-only) ─────────────────────────────────────────────

export interface SignOff {
  id: string;
  projectId: string;
  reviewerName: string;
  reviewerRole: string;
  decision: SignOffDecision;
  comments?: string;
  signedAt: string;
}

export interface SignOffSubmitInput {
  projectId: string;
  reviewerName: string;
  reviewerRole: string;
  decision: SignOffDecision;
  comments?: string;
}

// ─── Metrics ────────────────────────────────────────────────────────────

export interface ImportedMetricsData {
  template_version: string;
  report_type: ReportType;
  project_name: string;
  reporting_period_start: string;
  reporting_period_end: string;
  total_test_cases: number;
  executed: number;
  passed: number;
  failed: number;
  blocked: number;
  not_run: number;
  pass_rate_pct: number;
  defects_raised: number;
  defects_closed: number;
  defects_open: number;
  critical_defects: number;
  coverage_pct: number;
  environment: string;
  notes: string | null;
}

export interface ImportedMetrics {
  projectId: string;
  data: ImportedMetricsData;
  importedAt: string;
}

export interface MetricsImportInput {
  projectId: string;
  filePath: string;
  format: 'xlsx' | 'json';
}

export interface ImportHistoryEntry {
  id: string;
  projectId: string;
  filePath: string;
  format: 'xlsx' | 'json';
  importedAt: string;
  success: boolean;
  errorDetails?: string;
}

// ─── Manifest (append-only) ─────────────────────────────────────────────

export interface ManifestEntry {
  captureId: string;
  originalFilename: string;
  annotatedFilename?: string;
  sha256Hash: string;
  fileSizeBytes: number;
  capturedAt: string;
  sequenceNum: number;
}

export interface ManifestFile {
  schemaVersion: string;
  projectId: string;
  entries: ManifestEntry[];
}

export interface IntegrityCheckResult {
  projectId: string;
  totalChecked: number;
  passed: number;
  failed: number;
  mismatches: Array<{ captureId: string; expectedHash: string; actualHash: string }>;
  checkedAt: string;
}

// ─── Access log (append-only) ───────────────────────────────────────────

export type AccessEventType =
  | 'project_open'
  | 'project_close'
  | 'session_start'
  | 'session_end'
  | 'capture'
  | 'annotation_save'
  | 'export_word'
  | 'export_pdf'
  | 'export_html'
  | 'export_audit_bundle'
  | 'signoff_submit'
  | 'integrity_check';

export interface AccessLogEntry {
  id: string;
  projectId: string;
  eventType: AccessEventType;
  machineName: string;
  userIdentity: string;
  timestamp: string;
  details?: string;
}

// ─── Container ──────────────────────────────────────────────────────────

export interface CreateContainerConfig {
  projectId: string;
  filePath: string;
}

export interface ContainerHandle {
  containerId: string;
  projectId: string;
  filePath: string;
  openedAt: string;
}

// ─── Export ─────────────────────────────────────────────────────────────

export interface ExportOptionsInput {
  projectId: string;
  outputPath: string;
  sessionIds?: string[];
  includeOriginals?: boolean;
}

export interface ExportResult {
  success: boolean;
  outputPath?: string;
  fileSizeBytes?: number;
  reason?: string;
  missingFields?: string[];
}

// ─── Licence ────────────────────────────────────────────────────────────

export interface LicenceActivateInput {
  licenceKey: string;
}

export interface LicenceInfo {
  licenceKey: string;
  status: 'active' | 'expired' | 'invalid';
  activatedAt: string;
  machineFingerprint: string;
  expiresAt?: string;
}

export interface ActivationResult {
  success: boolean;
  licenceInfo?: LicenceInfo;
  reason?: string;
}

export interface LicenceValidationResult {
  valid: boolean;
  reason?: string;
}

// ─── Recent project (app.db) ────────────────────────────────────────────

export interface RecentProject {
  projectId: string;
  name: string;
  filePath: string;
  lastOpenedAt: string;
}

// ─── Settings (AppData/settings.json) ───────────────────────────────────

export interface Settings {
  schemaVersion: number;
  onboardingComplete: boolean;
}
