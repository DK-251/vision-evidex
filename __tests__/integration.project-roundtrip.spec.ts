// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sharp from 'sharp';

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
import { SessionService } from '../src/main/services/session.service';
import { ProjectService } from '../src/main/services/project.service';
import { CaptureService, type CaptureSource, type SessionLookup } from '../src/main/services/capture.service';
import { NamingService } from '../src/main/services/naming.service';
import { seedBuiltinDefaults } from '../src/main/services/seed-defaults';
import type { ProjectCreateInput, ContainerHandle } from '@shared/types/entities';

/**
 * Phase 2 Wk 8 / W8-10 — full project round-trip.
 *
 * Wires ProjectService → SessionService → CaptureService end-to-end
 * against a real in-memory DatabaseService that doubles as the
 * per-container project DB. The container service is mocked at the
 * surface level (no sharp/jszip/crypto) but obeys its single-slot
 * contract: `getProjectDb()` returns the live test DB only when a
 * project is "open"; `getCurrentHandle()` flips with create / close.
 *
 * The single test asserts the gate-success criteria from the Wk 8
 * brief Step 5: project + session + capture rows in the project DB,
 * container.save invoked at every persistence point, shortcuts
 * registered on session-create and unregistered on session-end.
 */

const FIXED_NOW = new Date('2026-05-05T10:00:00.000Z');

let workDir: string;
let appDb: DatabaseService;
let projectDb: DatabaseService;
let containerOpen: boolean;
let containerHandle: ContainerHandle | null;
let containerMock: {
  create: ReturnType<typeof vi.fn>;
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  getCurrentHandle: ReturnType<typeof vi.fn>;
  getProjectDb: ReturnType<typeof vi.fn>;
  addImage: ReturnType<typeof vi.fn>;
  appendManifest: ReturnType<typeof vi.fn>;
  getSizeBytes: ReturnType<typeof vi.fn>;
};

let captureSource: CaptureSource;

beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidex-roundtrip-'));

  appDb = new DatabaseService(':memory:');
  appDb.initAppSchema();
  seedBuiltinDefaults(appDb);

  projectDb = new DatabaseService(':memory:');
  projectDb.initProjectSchema();

  containerOpen = false;
  containerHandle = null;

  containerMock = {
    create: vi.fn(async (cfg: { projectId: string; filePath: string }) => {
      containerOpen = true;
      containerHandle = {
        containerId: 'cont_RT',
        projectId: cfg.projectId,
        filePath: cfg.filePath,
        openedAt: FIXED_NOW.toISOString(),
      };
      return { ...containerHandle };
    }),
    open: vi.fn(async () => containerHandle!),
    close: vi.fn(async () => {
      containerOpen = false;
      containerHandle = null;
    }),
    save: vi.fn(async () => undefined),
    getCurrentHandle: vi.fn(() => containerHandle),
    getProjectDb: vi.fn(() => (containerOpen ? projectDb : null)),
    addImage: vi.fn(async () => 'images/original/stub.jpg'),
    appendManifest: vi.fn(async () => undefined),
    getSizeBytes: vi.fn(async () => 1024),
  };

  captureSource = {
    getRawScreen: vi.fn(async () =>
      sharp({
        create: {
          width: 1,
          height: 1,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer()
    ),
  };
});

afterEach(() => {
  appDb.close();
  projectDb.close();
  fs.rmSync(workDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('Phase 2 Wk 8 — full project round-trip', () => {

  it('create project → start session → capture (mocked) → end session — every Wk 8 contract holds', async () => {
    const shortcuts = new ShortcutService({ onCapture: vi.fn() });

    const sessions = new SessionService({
      getDb: () => containerMock.getProjectDb(),
      container: containerMock as never,
      shortcuts,
      settings: {
        getSettings: () => ({
          schemaVersion:      1,
          onboardingComplete: true,
          theme:              'light',
          defaultStoragePath: workDir,
          defaultTemplateId:  'tpl-default-tsr',
        }),
      } as never,
      windows: {
        showToolbar: vi.fn(),
        hideToolbar: vi.fn(),
        broadcastSessionStatus: vi.fn(),
      },
      now: () => FIXED_NOW,
    });

    const projects = new ProjectService({
      appDb,
      container: containerMock as never,
      sessions,
      appVersion: '1.0.0-test',
      now: () => FIXED_NOW,
    });

    // ─── 1. Create project ──────────────────────────────────────────
    const intake: ProjectCreateInput = {
      name: 'Round Trip Project',
      clientName: 'ACME',
      startDate: '2026-05-05',
      templateId: 'tpl-default-tsr',
      brandingProfileId: 'brand-default',
      storagePath: workDir,
      namingPattern: '{ProjectCode}_{TestID}_{Date}_{Time}_{Seq}',
    };
    const project = await projects.create(intake);
    expect(project.id).toMatch(/^proj_/);
    // Project row landed in the project DB (NOT app.db).
    expect(projectDb.getProject(project.id)?.name).toBe('Round Trip Project');
    expect(appDb.getRecentProjects()).toHaveLength(1);
    // container.save was called as part of create.
    expect(containerMock.save).toHaveBeenCalled();

    // ─── 2. Start session ───────────────────────────────────────────
    const session = await sessions.create({
      projectId: project.id,
      testId: 'TC-RT-001',
      testName: 'Round-trip test',
      scenario: 'create project then run a session',
      environment: 'TEST',
      testerName: 'Deepak Sahu',
      applicationUnderTest: 'Vision-EviDex',
    });
    expect(session.id).toMatch(/^sess_/);
    expect(projectDb.getSession(session.id)?.testId).toBe('TC-RT-001');

    // ─── 3. Capture (mocked source — real sharp pipeline) ──────────
    const capture = new CaptureService({
      source:    captureSource,
      sessions:  buildSessionLookupForRoundtrip(projects, sessions, containerMock),
      container: containerMock as never,
      getDb:     () => containerMock.getProjectDb(),
      naming:    new NamingService(),
      runtime:   { machineName: 'TEST-PC', osVersion: 'Win11', appVersion: '1.0.0-test' },
      now:       () => FIXED_NOW,
    });
    const result = await capture.screenshot({ sessionId: session.id, mode: 'fullscreen' });
    expect(result.captureId).toMatch(/^cap_/);
    expect(result.sha256Hash).toMatch(/^[a-f0-9]{64}$/);
    expect(projectDb.getCapturesForSession(session.id)).toHaveLength(1);
    expect(containerMock.addImage).toHaveBeenCalled();
    expect(containerMock.appendManifest).toHaveBeenCalled();

    // ─── 4. End session — Rule 8 + shortcut release ─────────────────
    const beforeSaveCount = containerMock.save.mock.calls.length;
    const summary = await sessions.end(session.id);
    expect(summary.sessionId).toBe(session.id);
    // container.save must fire at least once more on session end (Rule 8).
    expect(containerMock.save.mock.calls.length).toBeGreaterThan(beforeSaveCount);
    // Session row closed.
    expect(projectDb.getSession(session.id)?.endedAt).toBeDefined();
    // Shortcuts released.
    const { globalShortcut } = await import('electron');
    expect(globalShortcut.unregisterAll).toHaveBeenCalled();

    // ─── 5. Close project — saves once more, then teardown ─────────
    await projects.close(project.id);
    expect(containerMock.close).toHaveBeenCalledWith('cont_RT');
  });
});

/**
 * Inline SessionLookup adapter mirroring the real one in app.ts —
 * resolves projectName/clientName from the project DB so the naming
 * pipeline produces a real filename (and doesn't surface the pre-Wk8
 * 'Pre-Wk8 Project' stubs).
 */
function buildSessionLookupForRoundtrip(
  _projects: ProjectService,
  sessions: SessionService,
  container: typeof containerMock
): SessionLookup {
  return {
    async getSessionContext(sessionId: string) {
      const sess = sessions.get(sessionId);
      const handle = container.getCurrentHandle();
      const projectDbInstance = container.getProjectDb();
      if (!sess || !handle || !projectDbInstance) {
        throw new Error('roundtrip lookup: state invariants violated');
      }
      const project = projectDbInstance.getProject(sess.projectId);
      if (!project) throw new Error('roundtrip lookup: project missing');
      return {
        sessionId,
        projectId:       sess.projectId,
        containerId:     handle.containerId,
        testerName:      sess.testerName,
        projectName:     project.name,
        clientName:      project.clientName,
        ...(project.namingPattern ? { namingPattern: project.namingPattern } : {}),
        testId:          sess.testId,
        environment:     sess.environment,
        nextSequenceNum: projectDbInstance.getNextSequenceNum(sess.projectId),
      };
    },
  };
}
