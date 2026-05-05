// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('electron', () => ({
  app:           { getPath: vi.fn(() => '/tmp/evidex-test'), isPackaged: false },
  BrowserWindow: { getAllWindows: vi.fn(() => []) },
  globalShortcut: {
    register:      vi.fn(() => true),
    unregister:    vi.fn(),
    unregisterAll: vi.fn(),
    isRegistered:  vi.fn(() => false),
  },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

vi.mock('node-machine-id', () => ({
  machineIdSync: vi.fn(() => 'test-machine-id-fixed'),
}));

import { DatabaseService } from '../src/main/services/database.service';
import { ShortcutService } from '../src/main/services/shortcut.service';
import { SessionService, type SessionWindowControls } from '../src/main/services/session.service';
import type { Settings } from '@shared/types/entities';

/**
 * End-to-end exercise of the SessionService lifecycle through real
 * better-sqlite3 (':memory:') + a real ShortcutService driven by the
 * mocked Electron globalShortcut. Container + windows are typed
 * stubs so the test stays unit-fast.
 *
 * Scope: every D32–D35 plumbing assertion the brief requires for a
 * D35 PASS — Rule 8 save invocation, shortcut register/unregister,
 * append-only access_log entries, SESSION_ALREADY_ACTIVE guard.
 */

const stubIntake = (overrides: Record<string, string> = {}) => ({
  projectId:            'proj_01TEST',
  testId:               'TC-001',
  testName:             'Login flow validation',
  scenario:             'User logs in with valid credentials',
  environment:          'QA-ENV-01',
  applicationUnderTest: 'MyApp v1.0',
  testerName:           'Jane Smith',
  testerEmail:          'j@test.com',
  ...overrides,
});

const stubSettings = (): { getSettings: () => Settings } => ({
  getSettings: () => ({
    schemaVersion:      1,
    onboardingComplete: true,
    theme:              'light',
    defaultStoragePath: '',
    defaultTemplateId:  '',
    hotkeys: {
      captureFullscreen: 'CmdOrCtrl+Shift+1',
      captureWindow:     'CmdOrCtrl+Shift+2',
      captureRegion:     'CmdOrCtrl+Shift+3',
    },
  }),
});

function seedProject(db: DatabaseService, projectId: string): void {
  db.insertProject({
    id: projectId, name: 'Test Project', clientName: 'ACME',
    description: 'integration test project', startDate: '2026-04-18',
    templateId: 'tpl_default', brandingProfileId: '',
    storagePath: '', namingPattern: '{Seq}', status: 'active',
    createdAt: '2026-04-18T00:00:00Z',
    appVersion: 'integration-test',
  });
}

let db:        DatabaseService;
let shortcuts: ShortcutService;
let container: { getCurrentHandle: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };
let windows:   SessionWindowControls & {
  showToolbar: ReturnType<typeof vi.fn>;
  hideToolbar: ReturnType<typeof vi.fn>;
  broadcastSessionStatus: ReturnType<typeof vi.fn>;
};
let sessions:  SessionService;

beforeEach(() => {
  db = new DatabaseService(':memory:');
  db.initProjectSchema();
  // Seed both projects we'll reference so FK constraints don't trip.
  seedProject(db, 'proj_01TEST');
  seedProject(db, 'proj_A');
  seedProject(db, 'proj_B');

  container = {
    getCurrentHandle: vi.fn(() => ({
      containerId: 'cont_01TEST',
      projectId: 'proj_01TEST',
      filePath: '/tmp/test.evidex',
      openedAt: '2026-04-18T09:00:00Z',
    })),
    save: vi.fn().mockResolvedValue(undefined),
  };

  windows = {
    showToolbar: vi.fn(),
    hideToolbar: vi.fn(),
    broadcastSessionStatus: vi.fn(),
  };

  shortcuts = new ShortcutService({ onCapture: vi.fn() });

  sessions = new SessionService({
    db,
    shortcuts,
    container: container as never,
    settings:  stubSettings() as never,
    windows,
  });
});

afterEach(() => {
  db.close();
  vi.clearAllMocks();
});

describe('Session lifecycle integration', () => {

  it('create() inserts a session record retrievable via DatabaseService', async () => {
    const session = await sessions.create(stubIntake());
    const found   = db.getSession(session.id);
    expect(found).not.toBeNull();
    expect(found?.testId).toBe('TC-001');
  });

  it('create() session has endedAt undefined (active per AQ3)', async () => {
    const session = await sessions.create(stubIntake());
    expect(db.getSession(session.id)?.endedAt).toBeUndefined();
  });

  it('create() registers global shortcuts via the (mocked) globalShortcut module', async () => {
    const { globalShortcut } = await import('electron');
    await sessions.create(stubIntake());
    expect(globalShortcut.register).toHaveBeenCalledWith(
      'CmdOrCtrl+Shift+1', expect.any(Function)
    );
  });

  it('create() calls windows.showToolbar with the new session', async () => {
    const session = await sessions.create(stubIntake());
    expect(windows.showToolbar).toHaveBeenCalledWith(
      expect.objectContaining({ id: session.id })
    );
  });

  it('create() writes a session_start access_log row', async () => {
    const session = await sessions.create(stubIntake());
    const log     = db.getAccessLog(session.projectId);
    expect(log.some((e) => e.eventType === 'session_start')).toBe(true);
  });

  it('end() closes the session in the DB (endedAt becomes a string)', async () => {
    const session = await sessions.create(stubIntake());
    await sessions.end(session.id);
    const closed = db.getSession(session.id);
    expect(closed?.endedAt).toBeDefined();
    expect(typeof closed?.endedAt).toBe('string');
  });

  it('end() unregisters global shortcuts (CLAUDE.md hotkey-release rule)', async () => {
    const { globalShortcut } = await import('electron');
    const session = await sessions.create(stubIntake());
    await sessions.end(session.id);
    expect(globalShortcut.unregisterAll).toHaveBeenCalled();
  });

  it('end() invokes container.save() — Architectural Rule 8', async () => {
    const session = await sessions.create(stubIntake());
    await sessions.end(session.id);
    expect(container.save).toHaveBeenCalledWith('cont_01TEST');
  });

  it('end() calls windows.hideToolbar', async () => {
    const session = await sessions.create(stubIntake());
    await sessions.end(session.id);
    expect(windows.hideToolbar).toHaveBeenCalled();
  });

  it('end() writes a session_end access_log row', async () => {
    const session = await sessions.create(stubIntake());
    await sessions.end(session.id);
    const log     = db.getAccessLog(session.projectId);
    expect(log.some((e) => e.eventType === 'session_end')).toBe(true);
  });

  it('end() returns a SessionSummary with the expected shape', async () => {
    const session = await sessions.create(stubIntake());
    const summary = await sessions.end(session.id);
    expect(summary).toMatchObject({
      sessionId:    session.id,
      captureCount: 0,
      passCount:    0,
      failCount:    0,
      blockedCount: 0,
    });
    expect(typeof summary.durationSec).toBe('number');
    expect(summary.durationSec).toBeGreaterThanOrEqual(0);
  });

  it('getActive() returns the session while it is active', async () => {
    const session = await sessions.create(stubIntake());
    expect(sessions.getActive(session.projectId)?.id).toBe(session.id);
  });

  it('getActive() returns null after the session is ended', async () => {
    const session = await sessions.create(stubIntake());
    await sessions.end(session.id);
    expect(sessions.getActive(session.projectId)).toBeNull();
  });

  it('throws SESSION_ALREADY_ACTIVE when creating a 2nd session on the same project (Rule 12)', async () => {
    await sessions.create(stubIntake({ testId: 'TC-001' }));
    await expect(
      sessions.create(stubIntake({ testId: 'TC-002' }))
    ).rejects.toMatchObject({ code: 'SESSION_ALREADY_ACTIVE' });
  });

  it('allows concurrent sessions on different projects', async () => {
    const s1 = await sessions.create(stubIntake({ projectId: 'proj_A', testId: 'TC-001' }));
    const s2 = await sessions.create(stubIntake({ projectId: 'proj_B', testId: 'TC-002' }));
    expect(s1.id).not.toBe(s2.id);
    expect(sessions.getActive('proj_A')?.id).toBe(s1.id);
    expect(sessions.getActive('proj_B')?.id).toBe(s2.id);
  });

  it('end() throws SESSION_NOT_FOUND for an unknown session id', async () => {
    await expect(
      sessions.end('sess_doesNotExist')
    ).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND' });
  });

  it('end() throws SESSION_NOT_ACTIVE for an already-ended session', async () => {
    const session = await sessions.create(stubIntake());
    await sessions.end(session.id);
    await expect(sessions.end(session.id))
      .rejects.toMatchObject({ code: 'SESSION_NOT_ACTIVE' });
  });

  it('end() skips container.save when no container is open (no throw — pre-Wk8 mode)', async () => {
    // Default mock returns a handle; create() doesn't read it, so we drop
    // the leading mockReturnValueOnce (its queue ordering ate the null
    // override end() needed). Switch to mockReturnValue so the override
    // sticks for the single getCurrentHandle() call in end().
    const session = await sessions.create(stubIntake());
    container.getCurrentHandle.mockReturnValue(null);
    const summary = await sessions.end(session.id);
    expect(container.save).not.toHaveBeenCalled();
    expect(summary.sessionId).toBe(session.id);
  });

  it('create() rolls the DB row back to closed if shortcut registration fails mid-flight', async () => {
    const { globalShortcut } = await import('electron');
    vi.mocked(globalShortcut.register).mockReturnValueOnce(false); // first register fails
    await expect(sessions.create(stubIntake())).rejects.toThrow();
    // No active session should remain on this project after rollback.
    expect(sessions.getActive('proj_01TEST')).toBeNull();
  });
});
