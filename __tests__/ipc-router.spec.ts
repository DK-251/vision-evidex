import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Phase 1 Week 3 security gate (logged in BACKLOG 2026-04-18).
 *
 * Every IPC handler must:
 *   1. Register with a Zod schema and reject invalid input with
 *      `IpcResult.ok=false` + `error.code=VALIDATION_FAILED` — never throw
 *      across the IPC boundary (Architectural Rule 3).
 *   2. Pass validated input through to the handler and wrap the result as
 *      `IpcResult.ok=true`.
 *
 * This test mocks `electron`'s `ipcMain.handle` to capture each registered
 * callback, then invokes the callbacks directly with crafted payloads.
 */

type Callback = (event: unknown, input: unknown) => Promise<unknown>;

const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, Callback>(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: Callback): void => {
      handlers.set(channel, fn);
    },
  },
  app: {
    isPackaged: false,
  },
  dialog: {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
  },
  BrowserWindow: vi.fn(),
  nativeTheme: { shouldUseDarkColors: false },
}));

import { IPC } from '@shared/ipc-channels';
import { EvidexErrorCode } from '@shared/types/ipc';
import { registerAllHandlers, type ServiceRegistry } from '../src/main/ipc-router';

const mockServices: ServiceRegistry = {
  licence: {
    activate: async () => ({ success: true }),
    validate: () => ({ valid: true, mode: 'none' as const }),
    getLicenceInfo: () => null,
    deactivate: async () => undefined,
    getMode: () => 'none' as const,
  } as unknown as ServiceRegistry['licence'],
  settings: {
    getSettings: () => ({
      schemaVersion: 1,
      onboardingComplete: false,
      theme: 'system' as const,
      defaultStoragePath: '',
      defaultTemplateId: '',
    }),
    saveSettings: (p: unknown) => ({
      schemaVersion: 1,
      onboardingComplete: false,
      theme: 'system' as const,
      defaultStoragePath: '',
      defaultTemplateId: '',
      ...(p as object),
    }),
  } as unknown as ServiceRegistry['settings'],
  appDb: {
    saveBrandingProfile: (p: unknown) => ({ ...(p as object), createdAt: 'ts' }),
    getRecentProjects: () => [],
  } as unknown as ServiceRegistry['appDb'],
  metrics: {
    summary: () => ({
      activeProjects: 0,
      sessionsToday: 0,
      capturesThisWeek: 0,
      exportsThisWeek: 0,
    }),
  } as unknown as ServiceRegistry['metrics'],
  session: {
    // Wired in PH2-W7 D35. Tests below cover happy-path validation only;
    // the stub returns null so the existing assertion stays accurate.
    create: async () => null,
    end: async () => null,
    get: () => null,
  } as unknown as ServiceRegistry['session'],
  capture: {
    screenshot: async () => null,
    updateTag: () => undefined,
  } as unknown as ServiceRegistry['capture'],
  container: {
    getCurrentHandle: () => null,
    getSizeBytes: async () => 0,
    getProjectDb: () => null,
  } as unknown as ServiceRegistry['container'],
  project: {
    create: async () => null,
    open: async () => null,
    close: async () => undefined,
    get: () => null,
    list: () => [],
    getRecent: () => [],
  } as unknown as ServiceRegistry['project'],
  naming: {
    preview: () => 'sample.jpg',
    generate: () => 'sample.jpg',
  } as unknown as ServiceRegistry['naming'],
  getMainWindow: () => undefined,
};

describe('ipc-router (Phase 1 Wk3 security gate)', () => {
  beforeEach(() => {
    handlers.clear();
    registerAllHandlers(mockServices);
  });

  it('registers every IPC invoke channel', () => {
    // W10: ANNOTATION_LOAD moved to IPC_EVENTS (one-way push), so 40 invoke channels remain
    expect(handlers.size).toBe(Object.values(IPC).length);
    for (const channel of Object.values(IPC)) {
      expect(handlers.has(channel)).toBe(true);
    }
  });

  it('rejects empty payload on session:create with VALIDATION_FAILED', async () => {
    const fn = handlers.get(IPC.SESSION_CREATE)!;
    const result = (await fn({}, {})) as { ok: false; error: { code: string; message: string } };
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe(EvidexErrorCode.VALIDATION_FAILED);
    expect(result.error.message).toBe('Input validation failed');
  });

  it('accepts a valid session:create payload and returns stub null', async () => {
    const fn = handlers.get(IPC.SESSION_CREATE)!;
    const result = (await fn(
      {},
      {
        projectId: 'p-1',
        testId: 't-1',
        testName: 'Login happy path',
        environment: 'QA',
        testerName: 'Deepak',
        applicationUnderTest: 'web-app',
      }
    )) as { ok: true; data: unknown };
    expect(result).toEqual({ ok: true, data: null });
  });

  it('rejects licence:activate with empty key', async () => {
    const fn = handlers.get(IPC.LICENCE_ACTIVATE)!;
    const result = (await fn({}, { licenceKey: '' })) as { ok: false; error: { code: string } };
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe(EvidexErrorCode.VALIDATION_FAILED);
  });

  it('routes licence:validate with {} through the real service', async () => {
    const fn = handlers.get(IPC.LICENCE_VALIDATE)!;
    const result = (await fn({}, {})) as { ok: true; data: unknown };
    // D16 wired licence:validate to services.licence.validate() — mock
    // returns { valid: true, mode: 'none' } (mode added D24).
    expect(result).toEqual({ ok: true, data: { valid: true, mode: 'none' } });
  });

  it('routes licence:activate with a valid key through the real service', async () => {
    const fn = handlers.get(IPC.LICENCE_ACTIVATE)!;
    const result = (await fn({}, { licenceKey: 'abc-123' })) as { ok: true; data: unknown };
    expect(result).toEqual({ ok: true, data: { success: true } });
  });

  it('rejects signoff:submit when decision=reject has no comments', async () => {
    const fn = handlers.get(IPC.SIGNOFF_SUBMIT)!;
    const result = (await fn(
      {},
      {
        projectId: 'p-1',
        reviewerName: 'Alice',
        reviewerRole: 'Lead',
        decision: 'reject',
      }
    )) as { ok: false; error: { code: string; fields?: Record<string, string> } };
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe(EvidexErrorCode.VALIDATION_FAILED);
    expect(result.error.fields?.['comments']).toMatch(/required/i);
  });

  it('rejects capture:screenshot when mode=region without region payload', async () => {
    const fn = handlers.get(IPC.CAPTURE_SCREENSHOT)!;
    const result = (await fn(
      {},
      { sessionId: 's-1', mode: 'region' }
    )) as { ok: false; error: { code: string; fields?: Record<string, string> } };
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe(EvidexErrorCode.VALIDATION_FAILED);
    expect(result.error.fields?.['region']).toBeDefined();
  });
});
