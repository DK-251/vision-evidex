import Database, { type Database as DatabaseT } from 'better-sqlite3';
import type {
  Project,
  ProjectStatus,
  Session,
  Capture,
  CaptureCountDelta,
  StatusTag,
  SignOff,
  SignOffDecision,
  Template,
  TemplateSaveInput,
  BrandingProfile,
  RecentProject,
  ImportedMetricsData,
  ImportHistoryEntry,
  StoredAnnotationLayer,
  AccessLogEntry,
  AccessEventType,
  BlurRegion,
  CaptureMode,
} from '@shared/types/entities';
import { PROJECT_MIGRATIONS } from '../migrations';

/**
 * DatabaseService — prepared-statement wrapper around better-sqlite3.
 *
 * Two instances at runtime (Architecture §5):
 *   - `projectDb` — the SQLite handle inside the currently-open .evidex
 *   - `appDb`     — %APPDATA%\VisionEviDex\app.db (templates, branding,
 *                   recent_projects, metrics_data)
 *
 * Architectural Rule 4: all writes go through prepared statements —
 * no string interpolation anywhere in this file.
 * Architectural Rule 5: sign_offs, access_log, version_history are
 * append-only — this class exposes NO update/delete methods for them.
 *
 * Phase 1 Week 4 D18 deliverables landed in this file:
 *   - initProjectSchema() + migration runner against PROJECT_MIGRATIONS
 *   - Real prepared statements for projects / sessions / captures /
 *     annotation_layers / sign_offs / import_history / access_log /
 *     version_history
 *   - Append-only discipline enforced by omission
 *
 * Remaining phase-stubs (Phase 3 metrics import, Phase 1 Wk5 templates,
 * Phase 1 Wk5 branding profiles) throw with their target phase label.
 */
export class DatabaseService {
  private readonly db: DatabaseT;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  /** App-level schema: %APPDATA%/VisionEviDex/app.db tables. */
  initAppSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        schema_json TEXT NOT NULL,
        is_builtin INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS branding_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        company_name TEXT NOT NULL,
        logo_base64 TEXT,
        logo_mime_type TEXT,
        primary_color TEXT NOT NULL,
        header_text TEXT,
        footer_text TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS recent_projects (
        project_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        last_opened_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS metrics_data (
        project_id TEXT PRIMARY KEY,
        data_json TEXT NOT NULL,
        imported_at TEXT NOT NULL
      );
    `);
  }

  /**
   * Project-DB schema: runs pending migrations from PROJECT_MIGRATIONS
   * against the open handle. Idempotent — already-applied versions are
   * recorded in `schema_migrations` and skipped on re-run.
   */
  initProjectSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);
    const applied = new Set(
      (this.db.prepare('SELECT version FROM schema_migrations').all() as { version: string }[]).map(
        (r) => r.version
      )
    );
    const insertApplied = this.db.prepare(
      'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)'
    );
    for (const m of PROJECT_MIGRATIONS) {
      if (applied.has(m.version)) continue;
      const txn = this.db.transaction(() => {
        this.db.exec(m.up);
        insertApplied.run(m.version, new Date().toISOString());
      });
      txn();
    }
  }

  getAppliedMigrations(): string[] {
    try {
      return (this.db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as {
        version: string;
      }[]).map((r) => r.version);
    } catch {
      return [];
    }
  }

  /** Flush WAL → main DB file. Called by container.save() (Tech Spec §7.2 step 1). */
  walCheckpoint(): void {
    this.db.pragma('wal_checkpoint(TRUNCATE)');
  }

  close(): void {
    this.db.close();
  }

  // ─── projects ───────────────────────────────────────────────────────

  insertProject(project: Omit<Project, 'updatedAt'> & { appVersion: string }): void {
    this.db
      .prepare(
        `INSERT INTO projects
         (id, name, client_name, description, start_date, template_id,
          branding_profile, naming_pattern, status, created_at, updated_at, app_version)
         VALUES (@id, @name, @clientName, @description, @startDate, @templateId,
                 @brandingProfile, @namingPattern, @status, @createdAt, @createdAt, @appVersion)`
      )
      .run({
        id: project.id,
        name: project.name,
        clientName: project.clientName,
        description: project.description ?? null,
        startDate: project.startDate,
        templateId: project.templateId,
        brandingProfile: JSON.stringify(project.brandingProfile ?? null),
        namingPattern: project.namingPattern,
        status: project.status,
        createdAt: project.createdAt,
        appVersion: project.appVersion,
      });
  }

  getProject(projectId: string): Project | null {
    const row = this.db
      .prepare(
        `SELECT id, name, client_name, description, start_date, template_id,
                branding_profile, naming_pattern, status, created_at, updated_at, app_version
         FROM projects WHERE id = ?`
      )
      .get(projectId) as ProjectRow | undefined;
    return row ? mapProject(row) : null;
  }

  updateProjectStatus(projectId: string, status: ProjectStatus): void {
    this.db
      .prepare(
        `UPDATE projects SET status = ?, updated_at = ? WHERE id = ?`
      )
      .run(status, new Date().toISOString(), projectId);
  }

  updateProjectUpdatedAt(projectId: string): void {
    this.db
      .prepare('UPDATE projects SET updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), projectId);
  }

  // ─── sessions ───────────────────────────────────────────────────────

  insertSession(
    session: Omit<Session, 'captureCount' | 'passCount' | 'failCount' | 'blockedCount'>
  ): void {
    this.db
      .prepare(
        `INSERT INTO sessions
         (id, project_id, test_id, test_name, test_data_matrix, scenario,
          requirement_id, requirement_desc, environment, app_under_test,
          tester_name, tester_email, started_at, ended_at, status)
         VALUES (@id, @projectId, @testId, @testName, @testDataMatrix, @scenario,
                 @requirementId, @requirementDesc, @environment, @appUnderTest,
                 @testerName, @testerEmail, @startedAt, @endedAt, @status)`
      )
      .run({
        id: session.id,
        projectId: session.projectId,
        testId: session.testId,
        testName: session.testName,
        testDataMatrix: session.testDataMatrix ?? null,
        scenario: session.scenario ?? '',
        requirementId: session.requirementId ?? null,
        requirementDesc: session.requirementDesc ?? null,
        environment: session.environment,
        appUnderTest: session.applicationUnderTest,
        testerName: session.testerName,
        testerEmail: session.testerEmail ?? '',
        startedAt: session.startedAt,
        endedAt: session.endedAt ?? null,
        status: session.endedAt ? 'closed' : 'active',
      });
  }

  getSession(sessionId: string): Session | null {
    const row = this.db
      .prepare(
        `SELECT id, project_id, test_id, test_name, test_data_matrix, scenario,
                requirement_id, requirement_desc, environment, app_under_test,
                tester_name, tester_email, started_at, ended_at,
                capture_count, pass_count, fail_count, blocked_count
         FROM sessions WHERE id = ?`
      )
      .get(sessionId) as SessionRow | undefined;
    return row ? mapSession(row) : null;
  }

  getActiveSession(projectId: string): Session | null {
    const row = this.db
      .prepare(
        `SELECT id, project_id, test_id, test_name, test_data_matrix, scenario,
                requirement_id, requirement_desc, environment, app_under_test,
                tester_name, tester_email, started_at, ended_at,
                capture_count, pass_count, fail_count, blocked_count
         FROM sessions WHERE project_id = ? AND status = 'active' LIMIT 1`
      )
      .get(projectId) as SessionRow | undefined;
    return row ? mapSession(row) : null;
  }

  getSessionsForProject(projectId: string): Session[] {
    const rows = this.db
      .prepare(
        `SELECT id, project_id, test_id, test_name, test_data_matrix, scenario,
                requirement_id, requirement_desc, environment, app_under_test,
                tester_name, tester_email, started_at, ended_at,
                capture_count, pass_count, fail_count, blocked_count
         FROM sessions WHERE project_id = ? ORDER BY started_at DESC`
      )
      .all(projectId) as SessionRow[];
    return rows.map(mapSession);
  }

  updateSessionCounts(sessionId: string, delta: CaptureCountDelta): void {
    this.db
      .prepare(
        `UPDATE sessions SET
           capture_count = capture_count + @total,
           pass_count    = pass_count    + @pass,
           fail_count    = fail_count    + @fail,
           blocked_count = blocked_count + @blocked
         WHERE id = @id`
      )
      .run({
        id: sessionId,
        total: delta.total ?? 0,
        pass: delta.pass ?? 0,
        fail: delta.fail ?? 0,
        blocked: delta.blocked ?? 0,
      });
  }

  closeSession(sessionId: string, endedAt: string): void {
    this.db
      .prepare(`UPDATE sessions SET ended_at = ?, status = 'closed' WHERE id = ?`)
      .run(endedAt, sessionId);
  }

  getNextSequenceNum(projectId: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(sequence_num), 0) AS max_seq FROM captures WHERE project_id = ?')
      .get(projectId) as { max_seq: number };
    return (row.max_seq ?? 0) + 1;
  }

  // ─── captures ───────────────────────────────────────────────────────

  insertCapture(capture: Capture): void {
    this.db
      .prepare(
        `INSERT INTO captures
         (id, session_id, project_id, sequence_num, filename,
          original_path, annotated_path, sha256_hash, file_size_bytes,
          capture_mode, status_tag, os_version, machine_name, app_version,
          notes, captured_at, has_annotation)
         VALUES (@id, @sessionId, @projectId, @sequenceNum, @filename,
                 @originalPath, @annotatedPath, @sha256Hash, @fileSizeBytes,
                 @captureMode, @statusTag, @osVersion, @machineName, @appVersion,
                 @notes, @capturedAt, @hasAnnotation)`
      )
      .run({
        id: capture.id,
        sessionId: capture.sessionId,
        projectId: capture.projectId,
        sequenceNum: capture.sequenceNum,
        filename: capture.originalFilename,
        originalPath: `images/original/${capture.originalFilename}`,
        annotatedPath: capture.annotatedFilename
          ? `images/annotated/${capture.annotatedFilename}`
          : null,
        sha256Hash: capture.sha256Hash,
        fileSizeBytes: capture.fileSizeBytes,
        captureMode: capture.captureMode,
        statusTag: capture.statusTag,
        osVersion: capture.osVersion,
        machineName: capture.machineName,
        appVersion: capture.appVersion,
        notes: capture.notes ?? null,
        capturedAt: capture.capturedAt,
        hasAnnotation: capture.annotatedFilename ? 1 : 0,
      });
  }

  getCapture(captureId: string): Capture | null {
    const row = this.db
      .prepare(`${CAPTURE_SELECT} WHERE id = ?`)
      .get(captureId) as CaptureRow | undefined;
    return row ? mapCapture(row) : null;
  }

  getCapturesForSession(sessionId: string): Capture[] {
    const rows = this.db
      .prepare(`${CAPTURE_SELECT} WHERE session_id = ? ORDER BY sequence_num ASC`)
      .all(sessionId) as CaptureRow[];
    return rows.map(mapCapture);
  }

  getCapturesForProject(projectId: string): Capture[] {
    const rows = this.db
      .prepare(`${CAPTURE_SELECT} WHERE project_id = ? ORDER BY sequence_num ASC`)
      .all(projectId) as CaptureRow[];
    return rows.map(mapCapture);
  }

  updateCaptureTag(captureId: string, tag: StatusTag): void {
    this.db.prepare('UPDATE captures SET status_tag = ? WHERE id = ?').run(tag, captureId);
  }

  updateCaptureAnnotation(captureId: string, annotatedPath: string): void {
    this.db
      .prepare(
        'UPDATE captures SET annotated_path = ?, has_annotation = 1 WHERE id = ?'
      )
      .run(annotatedPath, captureId);
  }

  updateCaptureNotes(captureId: string, notes: string): void {
    this.db.prepare('UPDATE captures SET notes = ? WHERE id = ?').run(notes, captureId);
  }

  // ─── annotation_layers ──────────────────────────────────────────────

  insertAnnotationLayer(layer: StoredAnnotationLayer & { id: string }): void {
    this.db
      .prepare(
        `INSERT INTO annotation_layers (id, capture_id, layer_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(layer.id, layer.captureId, layer.layerJson, layer.savedAt, layer.savedAt);
  }

  getAnnotationLayer(captureId: string): StoredAnnotationLayer | null {
    const row = this.db
      .prepare(
        `SELECT capture_id, layer_json, created_at, updated_at
         FROM annotation_layers WHERE capture_id = ?`
      )
      .get(captureId) as AnnotationLayerRow | undefined;
    if (!row) return null;
    const parsed = JSON.parse(row.layer_json) as {
      version?: string;
      blurRegions?: BlurRegion[];
    };
    return {
      captureId: row.capture_id,
      layerJson: row.layer_json,
      fabricVersion: parsed.version ?? 'unknown',
      blurRegions: parsed.blurRegions ?? [],
      savedAt: row.updated_at,
    };
  }

  updateAnnotationLayer(captureId: string, layerJson: string): void {
    this.db
      .prepare(
        `UPDATE annotation_layers SET layer_json = ?, updated_at = ? WHERE capture_id = ?`
      )
      .run(layerJson, new Date().toISOString(), captureId);
  }

  // ─── sign_offs (APPEND-ONLY — no update/delete methods) ─────────────

  insertSignOff(
    signOff: Omit<SignOff, 'id' | 'signedAt'> & { id: string; signedAt: string; submittedBy: string }
  ): SignOff {
    this.db
      .prepare(
        `INSERT INTO sign_offs
         (id, project_id, reviewer_name, reviewer_role, decision, comments, signed_at, submitted_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        signOff.id,
        signOff.projectId,
        signOff.reviewerName,
        signOff.reviewerRole,
        signOff.decision,
        signOff.comments ?? null,
        signOff.signedAt,
        signOff.submittedBy
      );
    return {
      id: signOff.id,
      projectId: signOff.projectId,
      reviewerName: signOff.reviewerName,
      reviewerRole: signOff.reviewerRole,
      decision: signOff.decision,
      ...(signOff.comments !== undefined ? { comments: signOff.comments } : {}),
      signedAt: signOff.signedAt,
    };
  }

  getSignOffsForProject(projectId: string): SignOff[] {
    const rows = this.db
      .prepare(
        `SELECT id, project_id, reviewer_name, reviewer_role, decision, comments, signed_at
         FROM sign_offs WHERE project_id = ? ORDER BY signed_at ASC`
      )
      .all(projectId) as SignOffRow[];
    return rows.map((r) => {
      const base: SignOff = {
        id: r.id,
        projectId: r.project_id,
        reviewerName: r.reviewer_name,
        reviewerRole: r.reviewer_role,
        decision: r.decision as SignOffDecision,
        signedAt: r.signed_at,
      };
      return r.comments !== null ? { ...base, comments: r.comments } : base;
    });
  }

  // ─── import_history ─────────────────────────────────────────────────

  insertImportHistory(
    entry: Omit<ImportHistoryEntry, 'success' | 'errorDetails'> & {
      importedBy: string;
      fieldCount: number;
      schemaVersion: string;
      filename: string;
    }
  ): void {
    this.db
      .prepare(
        `INSERT INTO import_history
         (id, project_id, filename, imported_at, imported_by, field_count, schema_version)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.id,
        entry.projectId,
        entry.filename,
        entry.importedAt,
        entry.importedBy,
        entry.fieldCount,
        entry.schemaVersion
      );
  }

  getImportHistory(projectId: string): Array<{
    id: string;
    projectId: string;
    filename: string;
    importedAt: string;
    importedBy: string;
    fieldCount: number;
    schemaVersion: string;
  }> {
    const rows = this.db
      .prepare(
        `SELECT id, project_id, filename, imported_at, imported_by, field_count, schema_version
         FROM import_history WHERE project_id = ? ORDER BY imported_at DESC`
      )
      .all(projectId) as ImportHistoryRow[];
    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      filename: r.filename,
      importedAt: r.imported_at,
      importedBy: r.imported_by,
      fieldCount: r.field_count,
      schemaVersion: r.schema_version,
    }));
  }

  // ─── access_log (APPEND-ONLY) ───────────────────────────────────────

  insertAccessLog(
    entry: Omit<AccessLogEntry, 'id' | 'machineName' | 'userIdentity' | 'timestamp'> & {
      id: string;
      performedBy: string;
      performedAt: string;
    }
  ): void {
    this.db
      .prepare(
        `INSERT INTO access_log
         (id, project_id, event_type, event_detail, performed_by, performed_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.id,
        entry.projectId,
        entry.eventType,
        entry.details ?? null,
        entry.performedBy,
        entry.performedAt
      );
  }

  getAccessLog(projectId: string): Array<{
    id: string;
    projectId: string;
    eventType: AccessEventType;
    details: string | null;
    performedBy: string;
    performedAt: string;
  }> {
    const rows = this.db
      .prepare(
        `SELECT id, project_id, event_type, event_detail, performed_by, performed_at
         FROM access_log WHERE project_id = ? ORDER BY performed_at ASC`
      )
      .all(projectId) as AccessLogRow[];
    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      eventType: r.event_type as AccessEventType,
      details: r.event_detail,
      performedBy: r.performed_by,
      performedAt: r.performed_at,
    }));
  }

  // ─── version_history (APPEND-ONLY) ──────────────────────────────────

  insertVersionHistory(entry: {
    id: string;
    projectId: string;
    savedAt: string;
    savedBy: string;
    appVersion: string;
  }): void {
    this.db
      .prepare(
        `INSERT INTO version_history (id, project_id, saved_at, saved_by, app_version)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(entry.id, entry.projectId, entry.savedAt, entry.savedBy, entry.appVersion);
  }

  getVersionHistory(projectId: string): Array<{
    id: string;
    projectId: string;
    savedAt: string;
    savedBy: string;
    appVersion: string;
  }> {
    const rows = this.db
      .prepare(
        `SELECT id, project_id, saved_at, saved_by, app_version
         FROM version_history WHERE project_id = ? ORDER BY saved_at ASC`
      )
      .all(projectId) as VersionHistoryRow[];
    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      savedAt: r.saved_at,
      savedBy: r.saved_by,
      appVersion: r.app_version,
    }));
  }

  // ─── app.db (Phase 1 Wk5 onboarding / Phase 3 metrics) ──────────────

  getTemplates(): Template[] {
    throw new Error('DatabaseService.getTemplates — Phase 1 Week 5');
  }
  getTemplate(_templateId: string): Template | null {
    throw new Error('DatabaseService.getTemplate — Phase 1 Week 5');
  }
  saveTemplate(_template: TemplateSaveInput): Template {
    throw new Error('DatabaseService.saveTemplate — Phase 3');
  }
  deleteTemplate(_templateId: string): void {
    throw new Error('DatabaseService.deleteTemplate — Phase 3');
  }
  getBrandingProfiles(): BrandingProfile[] {
    const rows = this.db
      .prepare(
        `SELECT id, name, company_name, logo_base64, logo_mime_type,
                primary_color, header_text, footer_text, created_at
         FROM branding_profiles ORDER BY name`
      )
      .all() as BrandingProfileRow[];
    return rows.map(mapBrandingProfile);
  }
  getBrandingProfile(profileId: string): BrandingProfile | null {
    const row = this.db
      .prepare(
        `SELECT id, name, company_name, logo_base64, logo_mime_type,
                primary_color, header_text, footer_text, created_at
         FROM branding_profiles WHERE id = ?`
      )
      .get(profileId) as BrandingProfileRow | undefined;
    return row ? mapBrandingProfile(row) : null;
  }
  saveBrandingProfile(profile: Omit<BrandingProfile, 'createdAt'>): BrandingProfile {
    const createdAt = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO branding_profiles
           (id, name, company_name, logo_base64, logo_mime_type,
            primary_color, header_text, footer_text, created_at)
         VALUES (@id, @name, @companyName, @logoBase64, @logoMimeType,
                 @primaryColor, @headerText, @footerText, @createdAt)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           company_name = excluded.company_name,
           logo_base64 = excluded.logo_base64,
           logo_mime_type = excluded.logo_mime_type,
           primary_color = excluded.primary_color,
           header_text = excluded.header_text,
           footer_text = excluded.footer_text`
      )
      .run({
        id: profile.id,
        name: profile.name,
        companyName: profile.companyName,
        logoBase64: profile.logoBase64 ?? null,
        logoMimeType: profile.logoMimeType ?? null,
        primaryColor: profile.primaryColor,
        headerText: profile.headerText ?? null,
        footerText: profile.footerText ?? null,
        createdAt,
      });
    return { ...profile, createdAt };
  }
  deleteBrandingProfile(_profileId: string): void {
    throw new Error('DatabaseService.deleteBrandingProfile — Phase 3');
  }
  upsertMetricsData(_projectId: string, _metrics: ImportedMetricsData): void {
    throw new Error('DatabaseService.upsertMetricsData — Phase 3');
  }
  getMetricsData(_projectId: string): ImportedMetricsData | null {
    throw new Error('DatabaseService.getMetricsData — Phase 3');
  }

  getRecentProjects(): RecentProject[] {
    const rows = this.db
      .prepare(
        `SELECT project_id, name, file_path, last_opened_at
         FROM recent_projects
         ORDER BY last_opened_at DESC`
      )
      .all() as RecentProjectRow[];
    return rows.map((r) => ({
      projectId: r.project_id,
      name: r.name,
      filePath: r.file_path,
      lastOpenedAt: r.last_opened_at,
    }));
  }

  upsertRecentProject(entry: RecentProject): void {
    this.db
      .prepare(
        `INSERT INTO recent_projects (project_id, name, file_path, last_opened_at)
         VALUES (@projectId, @name, @filePath, @lastOpenedAt)
         ON CONFLICT(project_id) DO UPDATE SET
           name = excluded.name,
           file_path = excluded.file_path,
           last_opened_at = excluded.last_opened_at`
      )
      .run(entry);
  }
}

// ─── Row shape types + mappers (keep SQL column naming quarantined) ──

const CAPTURE_SELECT = `
  SELECT id, session_id, project_id, sequence_num, filename,
         original_path, annotated_path, sha256_hash, file_size_bytes,
         capture_mode, status_tag, os_version, machine_name, app_version,
         notes, captured_at, has_annotation
  FROM captures
`;

interface ProjectRow {
  id: string;
  name: string;
  client_name: string;
  description: string | null;
  start_date: string;
  template_id: string;
  branding_profile: string;
  naming_pattern: string;
  status: string;
  created_at: string;
  updated_at: string;
  app_version: string;
}

function mapProject(r: ProjectRow): Project {
  const base: Project = {
    id: r.id,
    name: r.name,
    clientName: r.client_name,
    startDate: r.start_date,
    templateId: r.template_id,
    brandingProfileId: '', // populated from brandingProfile JSON on demand by caller
    storagePath: '', // the .evidex path is owned by the container handle, not this table
    namingPattern: r.naming_pattern,
    status: r.status as ProjectStatus,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
  if (r.description !== null) base.description = r.description;
  try {
    const snapshot = JSON.parse(r.branding_profile) as BrandingProfile | null;
    if (snapshot) base.brandingProfile = snapshot;
  } catch {
    /* malformed snapshot — leave base.brandingProfile undefined */
  }
  return base;
}

interface SessionRow {
  id: string;
  project_id: string;
  test_id: string;
  test_name: string;
  test_data_matrix: string | null;
  scenario: string;
  requirement_id: string | null;
  requirement_desc: string | null;
  environment: string;
  app_under_test: string;
  tester_name: string;
  tester_email: string;
  started_at: string;
  ended_at: string | null;
  capture_count: number;
  pass_count: number;
  fail_count: number;
  blocked_count: number;
}

function mapSession(r: SessionRow): Session {
  const base: Session = {
    id: r.id,
    projectId: r.project_id,
    testId: r.test_id,
    testName: r.test_name,
    environment: r.environment,
    applicationUnderTest: r.app_under_test,
    testerName: r.tester_name,
    startedAt: r.started_at,
    captureCount: r.capture_count,
    passCount: r.pass_count,
    failCount: r.fail_count,
    blockedCount: r.blocked_count,
  };
  if (r.test_data_matrix !== null) base.testDataMatrix = r.test_data_matrix;
  if (r.scenario !== '') base.scenario = r.scenario;
  if (r.requirement_id !== null) base.requirementId = r.requirement_id;
  if (r.requirement_desc !== null) base.requirementDesc = r.requirement_desc;
  if (r.tester_email !== '') base.testerEmail = r.tester_email;
  if (r.ended_at !== null) base.endedAt = r.ended_at;
  return base;
}

interface CaptureRow {
  id: string;
  session_id: string;
  project_id: string;
  sequence_num: number;
  filename: string;
  original_path: string;
  annotated_path: string | null;
  sha256_hash: string;
  file_size_bytes: number;
  capture_mode: string;
  status_tag: string;
  os_version: string;
  machine_name: string;
  app_version: string;
  notes: string | null;
  captured_at: string;
  has_annotation: number;
}

function mapCapture(r: CaptureRow): Capture {
  const base: Capture = {
    id: r.id,
    sessionId: r.session_id,
    projectId: r.project_id,
    sequenceNum: r.sequence_num,
    originalFilename: r.filename,
    sha256Hash: r.sha256_hash,
    fileSizeBytes: r.file_size_bytes,
    captureMode: r.capture_mode as CaptureMode,
    statusTag: r.status_tag as StatusTag,
    capturedAt: r.captured_at,
    machineName: r.machine_name,
    osVersion: r.os_version,
    appVersion: r.app_version,
    testerName: '',
  };
  if (r.annotated_path !== null) {
    // annotated_path is "images/annotated/<filename>" — extract last segment
    const slash = r.annotated_path.lastIndexOf('/');
    base.annotatedFilename = slash >= 0 ? r.annotated_path.slice(slash + 1) : r.annotated_path;
  }
  if (r.notes !== null) base.notes = r.notes;
  return base;
}

interface AnnotationLayerRow {
  capture_id: string;
  layer_json: string;
  created_at: string;
  updated_at: string;
}

interface SignOffRow {
  id: string;
  project_id: string;
  reviewer_name: string;
  reviewer_role: string;
  decision: string;
  comments: string | null;
  signed_at: string;
}

interface ImportHistoryRow {
  id: string;
  project_id: string;
  filename: string;
  imported_at: string;
  imported_by: string;
  field_count: number;
  schema_version: string;
}

interface AccessLogRow {
  id: string;
  project_id: string;
  event_type: string;
  event_detail: string | null;
  performed_by: string;
  performed_at: string;
}

interface VersionHistoryRow {
  id: string;
  project_id: string;
  saved_at: string;
  saved_by: string;
  app_version: string;
}

interface RecentProjectRow {
  project_id: string;
  name: string;
  file_path: string;
  last_opened_at: string;
}

interface BrandingProfileRow {
  id: string;
  name: string;
  company_name: string;
  logo_base64: string | null;
  logo_mime_type: string | null;
  primary_color: string;
  header_text: string | null;
  footer_text: string | null;
  created_at: string;
}

function mapBrandingProfile(r: BrandingProfileRow): BrandingProfile {
  const base: BrandingProfile = {
    id: r.id,
    name: r.name,
    companyName: r.company_name,
    logoBase64: r.logo_base64,
    logoMimeType:
      r.logo_mime_type === 'image/png' || r.logo_mime_type === 'image/jpeg'
        ? r.logo_mime_type
        : null,
    primaryColor: r.primary_color,
    createdAt: r.created_at,
  };
  if (r.header_text !== null) base.headerText = r.header_text;
  if (r.footer_text !== null) base.footerText = r.footer_text;
  return base;
}
