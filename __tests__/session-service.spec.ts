import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Session, SessionIntakeInput, Settings } from '../src/shared/types/entities';
import { SessionService } from '../src/main/services/session.service';
import {
  ShortcutService,
  DEFAULT_HOTKEY_BINDINGS,
  type GlobalShortcutLike,
} from '../src/main/services/shortcut.service';
import { EvidexErrorCode } from '../src/shared/types/ipc';

/**
 * Phase 2 Week 7 / D33. SessionService closes the Architectural Rule 8
 * gap: every session end MUST call `EvidexContainerService.save()`.
 *
 * The brief Task 3 contract:
 *   - create() inserts session + registers shortcuts
 *   - create() throws SESSION_ALREADY_ACTIVE on duplicate active session
 *   - end() calls unregisterSessionShortcuts + container.save (Rule 8)
 *   - end() throws SESSION_NOT_FOUND for unknown sessionId
 *
 * Mocks: DatabaseService, EvidexContainerService, ShortcutService,
 * WindowManager. Dep injection rather than vi.mock — same pattern as
 * `capture-service.spec.ts` / `shortcut-service.spec.ts`.
 */

const INTAKE: SessionIntakeInput = {
  projectId:            'proj_01HXTEST',
  testId:               'TC-001',
  testName:             'Login validation',
  scenario:             'Happy path',
  environment:          'UAT',
  testerName:           'Deepak Sahu',
  applicationUnderTest: 'EviDex',
};

const FIXED_NOW = new Date('2026-04-30T10:00:00Z');

function makeFakeShortcuts(): GlobalShortcutLike & {
  registered: Map<string, () => void>;
} {
  const registered = new Map<string, () => void>();
  return {
    registered,
    register: vi.fn((accel, cb) => {
      registered.set(accel, cb);
      return true;
    }),
    unregister: vi.fn((accel) => {
      registered.delete(accel);
    }),
    unregisterAll: vi.fn(() => {
      registered.clear();
    }),
    isRegistered: vi.fn((accel) => registered.has(accel)),
  };
}

function buildSessionRow(overrides: Partial<Session> = {}): Session {
  return {
    id:                   'sess_01HXTEST',
    projectId:            INTAKE.projectId,
    testId:               INTAKE.testId,
    testName:             INTAKE.testName,
    environment:          INTAKE.environment,
    testerName:           INTAKE.testerName,
    applicationUnderTest: INTAKE.applicationUnderTest,
    startedAt:            FIXED_NOW.toISOString(),
    captureCount:         0,
    passCount:            0,
    failCount:            0,
    blockedCount:         0,
    ...overrides,
  };
}

describe('SessionService — lifecycle (Phase 2 Wk7 / D33)', () => {
  let db: {
    getActiveSession: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    getSessionsForProject: ReturnType<typeof vi.fn>;
    insertSession: ReturnType<typeof vi.fn>;
    closeSession: ReturnType<typeof vi.fn>;
    insertAccessLog: ReturnType<typeof vi.fn>;
  };
  let container: {
    getCurrentHandle: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let settings: { getSettings: ReturnType<typeof vi.fn> };
  let windows: {
    showToolbar: ReturnType<typeof vi.fn>;
    hideToolbar: ReturnType<typeof vi.fn>;
    broadcastSessionStatus: ReturnType<typeof vi.fn>;
  };
  let shortcutsApi: ReturnType<typeof makeFakeShortcuts>;
  let shortcuts: ShortcutService;
  let onCapture: ReturnType<typeof vi.fn>;
  let service: SessionService;

  beforeEach(() => {
    db = {
      getActiveSession: vi.fn(() => null),
      getSession: vi.fn(() => null),
      getSessionsForProject: vi.fn(() => []),
      insertSession: vi.fn(),
      closeSession: vi.fn(),
      insertAccessLog: vi.fn(),
    };
    container = {
      getCurrentHandle: vi.fn(() => ({
        containerId: 'cont_01HXTEST',
        projectId: INTAKE.projectId,
        filePath: 'C:/proj.evidex',
        openedAt: FIXED_NOW.toISOString(),
      })),
      save: vi.fn(async () => undefined),
    };
    settings = {
      getSettings: vi.fn(
        (): Settings => ({
          schemaVersion: 1,
          onboardingComplete: true,
          theme: 'light',
          defaultStoragePath: '',
          defaultTemplateId: '',
        })
      ),
    };
    windows = {
      showToolbar: vi.fn(),
      hideToolbar: vi.fn(),
      broadcastSessionStatus: vi.fn(),
    };
    onCapture = vi.fn();
    shortcutsApi = makeFakeShortcuts();
    shortcuts = new ShortcutService({ callbacks: { onCapture }, shortcuts: shortcutsApi });

    service = new SessionService({
      getDb: () => db as never,
      container: container as never,
      shortcuts,
      settings: settings as never,
      windows,
      now: () => FIXED_NOW,
    });
  });

  // ─── create() ───────────────────────────────────────────────────────

  it('create() inserts a session row, logs access_log, registers shortcuts, shows toolbar', async () => {
    const session = await service.create(INTAKE);

    expect(session.id).toMatch(/^sess_/);
    expect(session.projectId).toBe(INTAKE.projectId);
    expect(session.startedAt).toBe(FIXED_NOW.toISOString());
    expect(session.endedAt).toBeUndefined(); // implicit "active" per AQ3

    expect(db.insertSession).toHaveBeenCalledTimes(1);
    expect(db.insertSession.mock.calls[0]?.[0]).toMatchObject({
      id: session.id,
      projectId: INTAKE.projectId,
      testId: INTAKE.testId,
      startedAt: FIXED_NOW.toISOString(),
    });
    // The four count fields must NOT be present in the insert payload —
    // DB defaults handle them.
    expect(db.insertSession.mock.calls[0]?.[0]).not.toHaveProperty('captureCount');

    expect(db.insertAccessLog).toHaveBeenCalledTimes(1);
    expect(db.insertAccessLog.mock.calls[0]?.[0]).toMatchObject({
      eventType: 'session_start',
      projectId: INTAKE.projectId,
      performedBy: INTAKE.testerName,
    });

    expect(shortcuts.getCurrentBindings()).toEqual(DEFAULT_HOTKEY_BINDINGS);
    expect(windows.showToolbar).toHaveBeenCalledWith(
      expect.objectContaining({ id: session.id })
    );
  });

  it('create() throws SESSION_ALREADY_ACTIVE when an active session exists for the project', async () => {
    db.getActiveSession.mockReturnValueOnce(buildSessionRow({ id: 'sess_OLD' }));

    await expect(service.create(INTAKE)).rejects.toMatchObject({
      code: EvidexErrorCode.SESSION_ALREADY_ACTIVE,
      fields: expect.objectContaining({
        projectId: INTAKE.projectId,
        activeSessionId: 'sess_OLD',
      }),
    });

    expect(db.insertSession).not.toHaveBeenCalled();
    expect(shortcuts.getCurrentBindings()).toBeNull();
    expect(windows.showToolbar).not.toHaveBeenCalled();
  });

  it('create() rolls the DB row back to closed if shortcut registration fails', async () => {
    // Make the underlying globalShortcut report the fullscreen accel as held.
    shortcutsApi.isRegistered = vi.fn(
      (accel) => accel === DEFAULT_HOTKEY_BINDINGS.captureFullscreen
    );

    await expect(service.create(INTAKE)).rejects.toMatchObject({
      code: EvidexErrorCode.SHORTCUT_CONFLICT,
    });

    // DB row was inserted, so it must be closed to avoid a half-active leak.
    expect(db.insertSession).toHaveBeenCalledTimes(1);
    expect(db.closeSession).toHaveBeenCalledTimes(1);
    expect(windows.showToolbar).not.toHaveBeenCalled();
  });

  it('create() resolves hotkeys from settings.hotkeys, falling back to defaults per missing key', async () => {
    settings.getSettings.mockReturnValueOnce({
      schemaVersion: 1,
      onboardingComplete: true,
      theme: 'light',
      defaultStoragePath: '',
      defaultTemplateId: '',
      hotkeys: { captureFullscreen: 'CmdOrCtrl+Alt+F' }, // only one override
    } as Settings);

    await service.create(INTAKE);

    expect(shortcuts.getCurrentBindings()).toEqual({
      captureFullscreen:   'CmdOrCtrl+Alt+F',
      captureActiveWindow: DEFAULT_HOTKEY_BINDINGS.captureActiveWindow,
      captureRegion:       DEFAULT_HOTKEY_BINDINGS.captureRegion,
      tagPass:             DEFAULT_HOTKEY_BINDINGS.tagPass,
      tagFail:             DEFAULT_HOTKEY_BINDINGS.tagFail,
      openToolbar:         DEFAULT_HOTKEY_BINDINGS.openToolbar,
    });
  });

  // ─── end() ──────────────────────────────────────────────────────────

  it('end() unregisters shortcuts AND calls container.save (Rule 8)', async () => {
    db.getSession.mockReturnValueOnce(buildSessionRow({ captureCount: 5, passCount: 4 }));
    await service.create(INTAKE);
    const summary = await service.end('sess_01HXTEST');

    expect(shortcuts.getCurrentBindings()).toBeNull();
    expect(windows.hideToolbar).toHaveBeenCalled();
    expect(container.save).toHaveBeenCalledWith('cont_01HXTEST');
    expect(summary).toMatchObject({
      sessionId: 'sess_01HXTEST',
      captureCount: 5,
      passCount: 4,
      durationSec: 0, // FIXED_NOW used for both start and end → 0s
    });
  });

  it('end() throws SESSION_NOT_FOUND for an unknown sessionId', async () => {
    db.getSession.mockReturnValueOnce(null);

    await expect(service.end('sess_GHOST')).rejects.toMatchObject({
      code: EvidexErrorCode.SESSION_NOT_FOUND,
      fields: { sessionId: 'sess_GHOST' },
    });

    expect(db.closeSession).not.toHaveBeenCalled();
    expect(container.save).not.toHaveBeenCalled();
  });

  it('end() throws SESSION_NOT_ACTIVE when the session has already ended', async () => {
    db.getSession.mockReturnValueOnce(
      buildSessionRow({ endedAt: '2026-04-29T15:00:00Z' })
    );

    await expect(service.end('sess_01HXTEST')).rejects.toMatchObject({
      code: EvidexErrorCode.SESSION_NOT_ACTIVE,
    });

    expect(db.closeSession).not.toHaveBeenCalled();
    expect(container.save).not.toHaveBeenCalled();
    expect(shortcuts.getCurrentBindings()).toBeNull();
  });

  it('end() surfaces CONTAINER_SAVE_FAILED if save() throws', async () => {
    db.getSession.mockReturnValueOnce(buildSessionRow());
    container.save.mockRejectedValueOnce(new Error('disk full'));

    await expect(service.end('sess_01HXTEST')).rejects.toMatchObject({
      code: EvidexErrorCode.CONTAINER_SAVE_FAILED,
    });
    // The DB row IS already closed by the time save() is attempted —
    // closing happens before the save call by design.
    expect(db.closeSession).toHaveBeenCalled();
  });

  it('end() skips Rule 8 save when no container is open (defensive — logged warning, not a throw)', async () => {
    db.getSession.mockReturnValueOnce(buildSessionRow());
    container.getCurrentHandle.mockReturnValueOnce(null);

    const summary = await service.end('sess_01HXTEST');

    expect(container.save).not.toHaveBeenCalled();
    expect(db.closeSession).toHaveBeenCalled();
    expect(summary.sessionId).toBe('sess_01HXTEST');
  });

  // ─── Lookup ─────────────────────────────────────────────────────────

  it('get / getActive / getAll delegate to DatabaseService', () => {
    const sample = buildSessionRow();
    db.getSession.mockReturnValueOnce(sample);
    db.getActiveSession.mockReturnValueOnce(sample);
    db.getSessionsForProject.mockReturnValueOnce([sample]);

    expect(service.get('sess_01HXTEST')).toBe(sample);
    expect(service.getActive(INTAKE.projectId)).toBe(sample);
    expect(service.getAll(INTAKE.projectId)).toEqual([sample]);
  });

  it('hasActiveSession returns true only when container is open AND DB has an active row', () => {
    db.getActiveSession.mockReturnValueOnce(buildSessionRow());
    expect(service.hasActiveSession()).toBe(true);

    container.getCurrentHandle.mockReturnValueOnce(null);
    expect(service.hasActiveSession()).toBe(false);
  });
});
