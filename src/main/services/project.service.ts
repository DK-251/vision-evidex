import fs from 'node:fs';
import path from 'node:path';
import { ulid } from 'ulid';
import type {
  ContainerHandle,
  Project,
  RecentProject,
} from '@shared/types/entities';
import type { ProjectCreateInput } from '@shared/schemas';
import { EvidexError } from '@shared/types/errors';
import { EvidexErrorCode } from '@shared/types/ipc';
import type { DatabaseService } from './database.service';
import type { EvidexContainerService } from './evidex-container.service';
import type { SessionService } from './session.service';
import { logger } from '../logger';

/**
 * ProjectService — Phase 2 Week 8.
 *
 * Owns project lifecycle: `create()` materialises a new `.evidex` file
 * on disk, `open()` decrypts an existing one, `close()` flushes + tears
 * down. Lookups (`get`, `list`, `getRecent`) read from whichever DB is
 * currently in scope (per-container project DB for entity rows; `app.db`
 * for the recent-projects table).
 *
 * Wiring contract (resolved at construction time in `app.ts`):
 *   - `appDb` is the singleton `app.db` DatabaseService.
 *   - `container` owns the per-container project DB lifecycle —
 *     `getProjectDb()` returns the live instance for the open .evidex
 *     or null. ProjectService never instantiates a project DB itself.
 *   - `sessions` is required only by `close()`, which ends an active
 *     session (if any) before tearing down — the dep stays minimal so
 *     test setup doesn't need to spin up a full SessionService.
 */

export interface ProjectServiceDeps {
  appDb:     DatabaseService;
  container: EvidexContainerService;
  sessions:  Pick<SessionService, 'getActive' | 'end'>;
  /** Override clock for deterministic tests. */
  now?:        () => Date;
  /** Stamped onto the project row at create time (Tech Spec §5.2). */
  appVersion: string;
}

export class ProjectService {
  constructor(private readonly deps: ProjectServiceDeps) {}

  private now(): string {
    return (this.deps.now ? this.deps.now() : new Date()).toISOString();
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────

  async create(input: ProjectCreateInput): Promise<Project> {
    // 1. Storage path must exist + be writable. Surface a clean error so
    //    the UI shows "pick a different folder" rather than a raw EACCES.
    if (!isWritableDir(input.storagePath)) {
      throw new EvidexError(
        EvidexErrorCode.STORAGE_PATH_NOT_WRITABLE,
        `Storage path is not writable: ${input.storagePath}`,
        { storagePath: input.storagePath }
      );
    }

    // 2. Build absolute .evidex path. Sanitise project name → filename
    //    so Windows-illegal characters never reach the FS layer.
    const safeName = sanitiseFilename(input.name);
    const filePath = path.join(input.storagePath, `${safeName}.evidex`);

    // 3. Build the Project entity. brandingProfile (snapshot) is read
    //    from app.db at creation time — Tech Spec §5.2 freezes it
    //    against later edits to the branding library.
    const projectId = `proj_${ulid()}`;
    const createdAt = this.now();
    const brandingSnapshot = this.deps.appDb.getBrandingProfile(input.brandingProfileId);

    const project: Project = {
      id: projectId,
      name: input.name,
      clientName: input.clientName,
      ...(input.description !== undefined ? { description: input.description } : {}),
      startDate: input.startDate,
      templateId: input.templateId,
      brandingProfileId: input.brandingProfileId,
      ...(brandingSnapshot ? { brandingProfile: brandingSnapshot } : {}),
      storagePath: filePath,
      namingPattern: input.namingPattern,
      status: 'active',
      createdAt,
      updatedAt: createdAt,
    };

    // 4. Create the container — this also spawns the per-container
    //    project DB and runs initProjectSchema(). The new
    //    `getProjectDb()` getter returns the live DatabaseService.
    const handle = await this.deps.container.create({
      projectId,
      filePath,
    });

    // 5. Insert into the per-container project DB (NOT app.db — those
    //    rows live with the .evidex so the project survives moves).
    const projectDb = this.deps.container.getProjectDb();
    if (!projectDb) {
      // Defensive — container.create() always materialises a project DB.
      throw new EvidexError(
        EvidexErrorCode.PROJECT_CORRUPTED,
        'Container created but project DB unavailable',
        { containerId: handle.containerId }
      );
    }
    projectDb.insertProject({ ...project, appVersion: this.deps.appVersion });

    // 6. Project-create audit row. CLAUDE.md rule 5 — append-only.
    projectDb.insertAccessLog({
      id: `alog_${ulid()}`,
      projectId,
      eventType: 'project_create',
      details: `created ${project.name} for ${project.clientName}`,
      performedBy: '',
      performedAt: createdAt,
    });

    // 7. Persist the container so project.db is in the encrypted ZIP
    //    on disk after this call returns. Without this save() the
    //    project record only exists in the tmpfile.
    await this.deps.container.save(handle.containerId);

    // 8. App-level recent-projects entry. Survives container close so
    //    the dashboard / project-list can show it.
    this.deps.appDb.upsertRecentProject({
      projectId,
      name: project.name,
      filePath,
      lastOpenedAt: createdAt,
    });

    logger.info('project.create', { projectId, name: project.name, filePath });
    return project;
  }

  async open(filePath: string): Promise<{ project: Project; handle: ContainerHandle }> {
    if (!fs.existsSync(filePath)) {
      throw new EvidexError(
        EvidexErrorCode.PROJECT_NOT_FOUND,
        `Project file not found: ${filePath}`,
        { filePath }
      );
    }

    let handle: ContainerHandle;
    try {
      handle = await this.deps.container.open(filePath);
    } catch (err) {
      // Decryption / corruption / wrong-machine — surface as PROJECT_CORRUPTED
      // so the UI can show "this project can't be opened on this machine".
      logger.warn('project.open failed', { filePath, err: String(err) });
      throw new EvidexError(
        EvidexErrorCode.CONTAINER_DECRYPT_FAILED,
        'Could not open project — file is corrupted or was created on a different machine.',
        { filePath }
      );
    }

    const projectDb = this.deps.container.getProjectDb();
    if (!projectDb) {
      throw new EvidexError(
        EvidexErrorCode.PROJECT_CORRUPTED,
        'Container opened but project DB unavailable',
        { containerId: handle.containerId }
      );
    }
    const project = projectDb.getProject(handle.projectId);
    if (!project) {
      throw new EvidexError(
        EvidexErrorCode.PROJECT_NOT_FOUND,
        'Container opened but no project record found inside.',
        { containerId: handle.containerId, projectId: handle.projectId }
      );
    }

    const openedAt = this.now();
    this.deps.appDb.upsertRecentProject({
      projectId: project.id,
      name: project.name,
      filePath,
      lastOpenedAt: openedAt,
    });
    projectDb.insertAccessLog({
      id: `alog_${ulid()}`,
      projectId: project.id,
      eventType: 'project_open',
      details: `opened ${project.name}`,
      performedBy: '',
      performedAt: openedAt,
    });

    logger.info('project.open', { projectId: project.id, filePath });
    return { project, handle };
  }

  async close(projectId: string): Promise<void> {
    const handle = this.deps.container.getCurrentHandle();
    if (!handle || handle.projectId !== projectId) {
      // Idempotent — closing an already-closed project is not an error.
      return;
    }

    // End any active session first so Rule 8 (container.save on session
    // end) fires before the close-time save. SessionService.end already
    // logs + persists; we just trigger it.
    const activeSession = this.deps.sessions.getActive(projectId);
    if (activeSession) {
      try {
        await this.deps.sessions.end(activeSession.id);
      } catch (err) {
        logger.warn('project.close: ending active session failed', {
          projectId, sessionId: activeSession.id, err: String(err),
        });
        // Continue with close — the container.save below will still
        // persist whatever state landed before the failure.
      }
    }

    const projectDb = this.deps.container.getProjectDb();
    projectDb?.insertAccessLog({
      id: `alog_${ulid()}`,
      projectId,
      eventType: 'project_close',
      details: 'closed',
      performedBy: '',
      performedAt: this.now(),
    });

    try {
      await this.deps.container.save(handle.containerId);
    } catch (err) {
      logger.error('project.close: container.save failed', {
        projectId, containerId: handle.containerId, err: String(err),
      });
      throw new EvidexError(
        EvidexErrorCode.CONTAINER_SAVE_FAILED,
        `Failed to persist .evidex while closing project ${projectId}`,
        { projectId, containerId: handle.containerId }
      );
    }
    await this.deps.container.close(handle.containerId);
    logger.info('project.close', { projectId });
  }

  // ─── Lookup ─────────────────────────────────────────────────────────

  /** The currently-open project, or null when nothing is open. */
  get(projectId: string): Project | null {
    const handle = this.deps.container.getCurrentHandle();
    if (!handle || handle.projectId !== projectId) return null;
    return this.deps.container.getProjectDb()?.getProject(projectId) ?? null;
  }

  /** Single-slot semantics: 1-element array if a project is open, else []. */
  list(): Project[] {
    const handle = this.deps.container.getCurrentHandle();
    const projectDb = this.deps.container.getProjectDb();
    if (!handle || !projectDb) return [];
    const project = projectDb.getProject(handle.projectId);
    return project ? [project] : [];
  }

  /** App-level recent projects (lives in app.db, survives container close). */
  getRecent(): RecentProject[] {
    return this.deps.appDb.getRecentProjects();
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

const FILENAME_INVALID = /[<>:"/\\|?*\x00-\x1f]/g;

function sanitiseFilename(name: string): string {
  const cleaned = name.replace(FILENAME_INVALID, '_').trim();
  return cleaned.length > 0 ? cleaned : 'project';
}

function isWritableDir(dirPath: string): boolean {
  try {
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) return false;
    fs.accessSync(dirPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
