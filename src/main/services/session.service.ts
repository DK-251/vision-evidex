import { ulid } from 'ulid';
import type { BrowserWindow } from 'electron';
import type {
  Session,
  SessionIntakeInput,
  SessionSummary,
  SessionStatus,
  Settings,
} from '@shared/types/entities';
import { IPC_EVENTS } from '@shared/ipc-channels';
import { EvidexError } from '@shared/types/errors';
import { EvidexErrorCode } from '@shared/types/ipc';
import type { DatabaseService } from './database.service';
import type { EvidexContainerService } from './evidex-container.service';
import type { SettingsService } from './settings.service';
import {
  ShortcutService,
  DEFAULT_HOTKEY_BINDINGS,
  type HotkeyBindings,
} from './shortcut.service';
import { logger } from '../logger';

/**
 * SessionService — Phase 2 Week 7 / D33.
 *
 * Owns the session lifecycle: create / end / lookup. Closes the
 * Architectural Rule 8 gap by calling `EvidexContainerService.save()`
 * after every session end.
 *
 * What this service is NOT (yet): the `SessionLookup` adapter that
 * `CaptureService` depends on. That adapter assembles a
 * `CaptureSessionContext` from project-DB rows and therefore needs
 * Project-open to have happened first. It lands in Phase 2 Wk 8.
 */

/** Window-manager surface SessionService needs — keeps testability cheap. */
export interface SessionWindowControls {
  showToolbar(session: Session): void;
  hideToolbar(): void;
  /**
   * Optional broadcaster for `session:statusUpdate` push events. The IPC
   * router is the natural owner; SessionService only fires the event
   * when count deltas land — currently only on session end.
   */
  broadcastSessionStatus?: (status: SessionStatus) => void;
}

export interface SessionServiceDeps {
  /**
   * Resolver for the per-container project DB. Returns null when no
   * container is open — every method that touches DB tables guards on
   * this and throws PROJECT_NOT_FOUND with a UI-friendly message.
   * (Phase 2 Wk 8: the active project's DB is per-container, swapped
   * in/out on PROJECT_OPEN / PROJECT_CLOSE.)
   */
  getDb:      () => DatabaseService | null;
  container:  EvidexContainerService;
  shortcuts:  ShortcutService;
  settings:   SettingsService;
  windows:    SessionWindowControls;
  /** Override clock for deterministic tests. */
  now?: () => Date;
}

export class SessionService {
  constructor(private readonly deps: SessionServiceDeps) {}

  // ─── Lifecycle ──────────────────────────────────────────────────────

  async create(intake: SessionIntakeInput): Promise<Session> {
    // Replaces the pre-Wk8 NO_CONTAINER sentinel: if no project is open,
    // surface PROJECT_NOT_FOUND through IpcResult so the UI shows a clean
    // "open a project first" message rather than a SQLite parse error.
    const db = this.deps.getDb();
    if (!db) {
      throw new EvidexError(
        EvidexErrorCode.PROJECT_NOT_FOUND,
        'Open a project before starting a session.',
        { projectId: intake.projectId }
      );
    }

    // Rule 12 — single active session per project.
    const existing = db.getActiveSession(intake.projectId);
    if (existing) {
      throw new EvidexError(
        EvidexErrorCode.SESSION_ALREADY_ACTIVE,
        `Project ${intake.projectId} already has an active session`,
        { projectId: intake.projectId, activeSessionId: existing.id }
      );
    }

    const startedAt = this.now();
    const session: Session = {
      id: `sess_${ulid()}`,
      projectId: intake.projectId,
      testId: intake.testId,
      testName: intake.testName,
      ...(intake.testDataMatrix !== undefined ? { testDataMatrix: intake.testDataMatrix } : {}),
      ...(intake.scenario !== undefined ? { scenario: intake.scenario } : {}),
      ...(intake.requirementId !== undefined ? { requirementId: intake.requirementId } : {}),
      ...(intake.requirementDesc !== undefined ? { requirementDesc: intake.requirementDesc } : {}),
      environment: intake.environment,
      testerName: intake.testerName,
      ...(intake.testerEmail !== undefined ? { testerEmail: intake.testerEmail } : {}),
      applicationUnderTest: intake.applicationUnderTest,
      startedAt,
      // endedAt omitted — implicit `active` per AQ3.
      captureCount: 0,
      passCount: 0,
      failCount: 0,
      blockedCount: 0,
    };

    // DB takes Session minus the four counts (DB defaults handle them).
    const { captureCount, passCount, failCount, blockedCount, ...sessionForInsert } = session;
    void captureCount; void passCount; void failCount; void blockedCount;
    db.insertSession(sessionForInsert);

    db.insertAccessLog({
      id: `alog_${ulid()}`,
      projectId: session.projectId,
      eventType: 'session_start',
      details: `session ${session.id} (${session.testId})`,
      performedBy: session.testerName,
      performedAt: startedAt,
    });

    // Hotkeys: read from settings, fall back to the Ctrl+Shift+1/2/3 defaults.
    const bindings = resolveHotkeyBindings(this.deps.settings.getSettings());
    try {
      this.deps.shortcuts.registerSessionShortcuts(session.id, bindings);
    } catch (err) {
      // Roll back: DB insert + access log already happened. Close the session
      // cleanly so we never leave a half-active row behind.
      db.closeSession(session.id, this.now());
      throw err;
    }

    this.deps.windows.showToolbar(session);

    // Toolbar + gallery both subscribe to SESSION_STATUS_UPDATE; pushing
    // here means the counter renders "0" immediately rather than blank
    // until the first capture arrives.
    this.deps.windows.broadcastSessionStatus?.({
      sessionId:    session.id,
      captureCount: 0,
      passCount:    0,
      failCount:    0,
      blockedCount: 0,
    });

    logger.info('session.create', {
      sessionId: session.id,
      projectId: session.projectId,
      testId: session.testId,
    });
    return session;
  }

  async end(sessionId: string): Promise<SessionSummary> {
    const db = this.deps.getDb();
    if (!db) {
      throw new EvidexError(
        EvidexErrorCode.PROJECT_NOT_FOUND,
        'No project is currently open.',
        { sessionId }
      );
    }
    const existing = db.getSession(sessionId);
    if (!existing) {
      throw new EvidexError(
        EvidexErrorCode.SESSION_NOT_FOUND,
        `Session ${sessionId} not found`,
        { sessionId }
      );
    }
    if (existing.endedAt !== undefined) {
      throw new EvidexError(
        EvidexErrorCode.SESSION_NOT_ACTIVE,
        `Session ${sessionId} has already ended`,
        { sessionId, endedAt: existing.endedAt }
      );
    }

    const endedAt = this.now();
    db.closeSession(sessionId, endedAt);

    db.insertAccessLog({
      id: `alog_${ulid()}`,
      projectId: existing.projectId,
      eventType: 'session_end',
      details: `session ${sessionId} closed (captures=${existing.captureCount})`,
      performedBy: existing.testerName,
      performedAt: endedAt,
    });

    // Order matters: unregister BEFORE hiding the toolbar so the next
    // hotkey press cannot fire into a hidden window.
    this.deps.shortcuts.unregisterSessionShortcuts();
    this.deps.windows.hideToolbar();

    // Architectural Rule 8 — flush the container after every session end.
    const handle = this.deps.container.getCurrentHandle();
    if (handle && handle.projectId === existing.projectId) {
      try {
        await this.deps.container.save(handle.containerId);
      } catch (err) {
        // The session is already closed in the DB; surface a save failure
        // explicitly rather than letting it pretend to succeed.
        logger.error('session.end.containerSaveFailed', {
          sessionId,
          containerId: handle.containerId,
          err: String(err),
        });
        throw new EvidexError(
          EvidexErrorCode.CONTAINER_SAVE_FAILED,
          `Failed to persist .evidex after session ${sessionId} ended`,
          { sessionId, containerId: handle.containerId }
        );
      }
    } else {
      logger.warn('session.end.noActiveContainer — Rule 8 save skipped', {
        sessionId,
        projectId: existing.projectId,
        currentContainerProject: handle?.projectId ?? null,
      });
    }

    const durationSec = Math.max(
      0,
      Math.round((Date.parse(endedAt) - Date.parse(existing.startedAt)) / 1000)
    );
    const summary: SessionSummary = {
      sessionId,
      captureCount: existing.captureCount,
      passCount: existing.passCount,
      failCount: existing.failCount,
      blockedCount: existing.blockedCount,
      durationSec,
    };

    this.deps.windows.broadcastSessionStatus?.({
      sessionId,
      captureCount: existing.captureCount,
      passCount: existing.passCount,
      failCount: existing.failCount,
      blockedCount: existing.blockedCount,
    });

    logger.info('session.end', summary as unknown as Record<string, unknown>);
    return summary;
  }

  // ─── Lookup ─────────────────────────────────────────────────────────
  // Read paths return null/[]/false when no project is open instead of
  // throwing — callers (capture handler, gallery hooks) treat "no DB"
  // and "row not found" identically.

  get(sessionId: string): Session | null {
    return this.deps.getDb()?.getSession(sessionId) ?? null;
  }

  getActive(projectId: string): Session | null {
    return this.deps.getDb()?.getActiveSession(projectId) ?? null;
  }

  getAll(projectId: string): Session[] {
    return this.deps.getDb()?.getSessionsForProject(projectId) ?? [];
  }

  /**
   * True when ANY session is currently open. CLAUDE.md §9 locks the app
   * to a single active project at a time, so "any active session" maps
   * to "active session on the active project".
   */
  hasActiveSession(): boolean {
    const handle = this.deps.container.getCurrentHandle();
    if (!handle) return false;
    return this.deps.getDb()?.getActiveSession(handle.projectId) !== null;
  }

  // ─── Internal ───────────────────────────────────────────────────────

  private now(): string {
    return (this.deps.now ? this.deps.now() : new Date()).toISOString();
  }
}

/**
 * Adapter for the `SESSION_STATUS_UPDATE` push. Broadcasts to ALL
 * windows because both the gallery (main window) and the toolbar
 * subscribe — the toolbar shows the counter, the gallery shows the
 * pass/fail/blocked breakdown. Destroyed windows are skipped.
 */
export function makeSessionWindowControls(
  showToolbarWindow: (session: Session) => void,
  hideToolbarWindow: () => void,
  getAllWindows: () => BrowserWindow[]
): SessionWindowControls {
  return {
    showToolbar: showToolbarWindow,
    hideToolbar: hideToolbarWindow,
    broadcastSessionStatus: (status: SessionStatus): void => {
      for (const win of getAllWindows()) {
        if (win.isDestroyed()) continue;
        win.webContents.send(IPC_EVENTS.SESSION_STATUS_UPDATE, status);
      }
    },
  };
}

function resolveHotkeyBindings(settings: Settings): HotkeyBindings {
  const hotkeys = settings.hotkeys ?? {};
  return {
    captureFullscreen: hotkeys['captureFullscreen'] ?? DEFAULT_HOTKEY_BINDINGS.captureFullscreen,
    captureWindow:     hotkeys['captureWindow']     ?? DEFAULT_HOTKEY_BINDINGS.captureWindow,
    captureRegion:     hotkeys['captureRegion']     ?? DEFAULT_HOTKEY_BINDINGS.captureRegion,
  };
}
