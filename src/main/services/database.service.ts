import Database, { type Database as DatabaseT } from 'better-sqlite3';
import type {
  Project,
  ProjectStatus,
  Session,
  Capture,
  CaptureCountDelta,
  StatusTag,
  SignOff,
  Template,
  TemplateSaveInput,
  BrandingProfile,
  RecentProject,
  ImportedMetricsData,
  ImportHistoryEntry,
  StoredAnnotationLayer,
  AccessLogEntry,
} from '@shared/types/entities';

/**
 * DatabaseService — prepared-statement wrapper around better-sqlite3.
 *
 * Two instances at runtime:
 *   - `projectDb` — the SQLite handle inside the currently-open .evidex
 *   - `appDb`     — %APPDATA%\VisionEviDex\app.db (templates, branding,
 *                   recent_projects, metrics_data)
 *
 * Architectural Rule 4: all writes go through prepared statements.
 * Architectural Rule 5: sign_offs, access_log, version_history are
 *   append-only — this class provides NO update*/delete* methods for them.
 *
 * Phase 1 Week 3 (D14): constructor + app-level schema + recent_projects
 * CRUD. Project-db methods (sessions, captures, etc.) land Phase 1 Wk4–
 * Phase 2 per the thrown-phase messages.
 */
export class DatabaseService {
  private readonly db: DatabaseT;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  /** Create tables used by `app.db`. Idempotent. */
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

  close(): void {
    this.db.close();
  }

  // ─── Project ────────────────────────────────────────────────────────
  insertProject(_project: Omit<Project, 'updatedAt'>): void {
    throw new Error('DatabaseService.insertProject — Phase 1 Week 4');
  }
  getProject(_projectId: string): Project | null {
    throw new Error('DatabaseService.getProject — Phase 1 Week 4');
  }
  updateProjectStatus(_projectId: string, _status: ProjectStatus): void {
    throw new Error('DatabaseService.updateProjectStatus — Phase 1 Week 4');
  }
  updateProjectUpdatedAt(_projectId: string): void {
    throw new Error('DatabaseService.updateProjectUpdatedAt — Phase 1 Week 4');
  }

  // ─── Session ────────────────────────────────────────────────────────
  insertSession(
    _session: Omit<Session, 'captureCount' | 'passCount' | 'failCount' | 'blockedCount'>
  ): void {
    throw new Error('DatabaseService.insertSession — Phase 2 Week 7');
  }
  getSession(_sessionId: string): Session | null {
    throw new Error('DatabaseService.getSession — Phase 2 Week 7');
  }
  getActiveSession(_projectId: string): Session | null {
    throw new Error('DatabaseService.getActiveSession — Phase 2 Week 7');
  }
  getSessionsForProject(_projectId: string): Session[] {
    throw new Error('DatabaseService.getSessionsForProject — Phase 2 Week 7');
  }
  updateSessionCounts(_sessionId: string, _delta: CaptureCountDelta): void {
    throw new Error('DatabaseService.updateSessionCounts — Phase 2 Week 7');
  }
  closeSession(_sessionId: string, _endedAt: string): void {
    throw new Error('DatabaseService.closeSession — Phase 2 Week 7');
  }
  getNextSequenceNum(_projectId: string): number {
    throw new Error('DatabaseService.getNextSequenceNum — Phase 2 Week 7');
  }

  // ─── Capture ────────────────────────────────────────────────────────
  insertCapture(_capture: Capture): void {
    throw new Error('DatabaseService.insertCapture — Phase 2 Week 7');
  }
  getCapture(_captureId: string): Capture | null {
    throw new Error('DatabaseService.getCapture — Phase 2 Week 8');
  }
  getCapturesForSession(_sessionId: string): Capture[] {
    throw new Error('DatabaseService.getCapturesForSession — Phase 2 Week 8');
  }
  getCapturesForProject(_projectId: string): Capture[] {
    throw new Error('DatabaseService.getCapturesForProject — Phase 3');
  }
  updateCaptureTag(_captureId: string, _tag: StatusTag): void {
    throw new Error('DatabaseService.updateCaptureTag — Phase 2 Week 8');
  }
  updateCaptureAnnotation(_captureId: string, _annotatedPath: string): void {
    throw new Error('DatabaseService.updateCaptureAnnotation — Phase 2 Week 9');
  }
  updateCaptureNotes(_captureId: string, _notes: string): void {
    throw new Error('DatabaseService.updateCaptureNotes — Phase 2 Week 8');
  }

  // ─── Annotation layer ───────────────────────────────────────────────
  insertAnnotationLayer(_layer: StoredAnnotationLayer): void {
    throw new Error('DatabaseService.insertAnnotationLayer — Phase 2 Week 9');
  }
  getAnnotationLayer(_captureId: string): StoredAnnotationLayer | null {
    throw new Error('DatabaseService.getAnnotationLayer — Phase 2 Week 9');
  }
  updateAnnotationLayer(_captureId: string, _layerJson: string): void {
    throw new Error('DatabaseService.updateAnnotationLayer — Phase 2 Week 9');
  }

  // ─── Sign-offs (APPEND-ONLY — no update/delete methods) ─────────────
  insertSignOff(_signOff: Omit<SignOff, 'id'>): SignOff {
    throw new Error('DatabaseService.insertSignOff — Phase 4');
  }
  getSignOffsForProject(_projectId: string): SignOff[] {
    throw new Error('DatabaseService.getSignOffsForProject — Phase 4');
  }

  // ─── Metrics ────────────────────────────────────────────────────────
  upsertMetricsData(_projectId: string, _metrics: ImportedMetricsData): void {
    throw new Error('DatabaseService.upsertMetricsData — Phase 3');
  }
  getMetricsData(_projectId: string): ImportedMetricsData | null {
    throw new Error('DatabaseService.getMetricsData — Phase 3');
  }
  insertImportHistory(_entry: ImportHistoryEntry): void {
    throw new Error('DatabaseService.insertImportHistory — Phase 3');
  }
  getImportHistory(_projectId: string): ImportHistoryEntry[] {
    throw new Error('DatabaseService.getImportHistory — Phase 3');
  }

  // ─── Access log (APPEND-ONLY — no update/delete methods) ────────────
  insertAccessLog(_entry: Omit<AccessLogEntry, 'id'>): void {
    throw new Error('DatabaseService.insertAccessLog — Phase 4');
  }
  getAccessLog(_projectId: string): AccessLogEntry[] {
    throw new Error('DatabaseService.getAccessLog — Phase 4');
  }

  // ─── App-level (app.db) ─────────────────────────────────────────────
  getTemplates(): Template[] {
    throw new Error('DatabaseService.getTemplates — Phase 1 Week 4');
  }
  getTemplate(_templateId: string): Template | null {
    throw new Error('DatabaseService.getTemplate — Phase 1 Week 4');
  }
  saveTemplate(_template: TemplateSaveInput): Template {
    throw new Error('DatabaseService.saveTemplate — Phase 3');
  }
  deleteTemplate(_templateId: string): void {
    throw new Error('DatabaseService.deleteTemplate — Phase 3');
  }
  getBrandingProfiles(): BrandingProfile[] {
    throw new Error('DatabaseService.getBrandingProfiles — Phase 1 Week 5');
  }
  getBrandingProfile(_profileId: string): BrandingProfile | null {
    throw new Error('DatabaseService.getBrandingProfile — Phase 1 Week 5');
  }
  saveBrandingProfile(_profile: Omit<BrandingProfile, 'createdAt'>): BrandingProfile {
    throw new Error('DatabaseService.saveBrandingProfile — Phase 1 Week 5');
  }
  deleteBrandingProfile(_profileId: string): void {
    throw new Error('DatabaseService.deleteBrandingProfile — Phase 3');
  }
  getRecentProjects(): RecentProject[] {
    const rows = this.db
      .prepare(
        `SELECT project_id, name, file_path, last_opened_at
         FROM recent_projects
         ORDER BY last_opened_at DESC`
      )
      .all() as Array<{
      project_id: string;
      name: string;
      file_path: string;
      last_opened_at: string;
    }>;
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
