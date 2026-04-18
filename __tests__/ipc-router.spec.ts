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
}));

import { IPC } from '@shared/ipc-channels';
import { EvidexErrorCode } from '@shared/types/ipc';
import { registerAllHandlers, type ServiceRegistry } from '../src/main/ipc-router';

const mockServices: ServiceRegistry = {
  licence: {
    activate: async () => ({ success: true }),
    validate: () => ({ valid: true }),
    getLicenceInfo: () => null,
    deactivate: async () => undefined,
    getMode: () => 'none' as const,
  } as unknown as ServiceRegistry['licence'],
};

describe('ipc-router (Phase 1 Wk3 security gate)', () => {
  beforeEach(() => {
    handlers.clear();
    registerAllHandlers(mockServices);
  });

  it('registers every IPC invoke channel', () => {
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

  it('accepts licence:validate with {} payload', async () => {
    const fn = handlers.get(IPC.LICENCE_VALIDATE)!;
    const result = (await fn({}, {})) as { ok: true; data: unknown };
    expect(result).toEqual({ ok: true, data: null });
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
