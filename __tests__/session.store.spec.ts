// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Session, SessionSummary, CaptureResult } from '@shared/types/entities';

/**
 * The renderer store calls `window.evidexAPI.session.create()` etc.
 * Shape mirrors the preload bridge exactly (nested under domain keys,
 * not flat). We install the shim BEFORE importing the store so the
 * module-load-time read of `window.evidexAPI` (via the closures) sees
 * the mocked object.
 */
const sessionApi = {
  create:    vi.fn(),
  end:       vi.fn(),
  get:       vi.fn(),
};
const captureApi = {
  updateTag: vi.fn(),
};
const eventsApi = {
  onCaptureFlash:        vi.fn(() => () => {}),
  onSessionStatusUpdate: vi.fn(() => () => {}),
  onCaptureArrived:      vi.fn(() => () => {}),
};

if (typeof (globalThis as { window?: unknown }).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { evidexAPI: { session: sessionApi, capture: captureApi, events: eventsApi } },
    writable: true,
    configurable: true,
  });
} else {
  (globalThis as { window: { evidexAPI: unknown } }).window.evidexAPI = {
    session: sessionApi, capture: captureApi, events: eventsApi,
  };
}

// Dynamic import AFTER the window shim — Zustand stores are constructed at
// module-eval time, so the shim must exist first.
const { useSessionStore } = await import('../src/renderer/stores/session.store');

const stubSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'sess_01TEST',
  projectId: 'proj_01TEST',
  testId: 'TC-001',
  testName: 'Login flow',
  scenario: 'Valid login',
  environment: 'QA-ENV-01',
  applicationUnderTest: 'MyApp v1.0',
  testerName: 'Jane Smith',
  testerEmail: 'j@test.com',
  startedAt: '2025-01-15T09:32:00.000Z',
  captureCount: 0, passCount: 0, failCount: 0, blockedCount: 0,
  ...overrides,
});

const stubSummary = (): SessionSummary => ({
  sessionId: 'sess_01TEST',
  captureCount: 3, passCount: 2, failCount: 1, blockedCount: 0,
  durationSec: 120,
});

const stubCapture = (overrides: Partial<CaptureResult> = {}): CaptureResult => ({
  captureId: 'cap_01TEST',
  filename: 'ALPHA_TC-001_2025-01-15_0001.jpg',
  sha256Hash: 'abc123',
  fileSizeBytes: 284320,
  thumbnail: 'data:image/jpeg;base64,/9j/...',
  capturedAt: '2025-01-15T09:32:15.000Z',
  ...overrides,
});

const stubIntake = () => ({
  projectId: 'proj_01TEST', testId: 'TC-001', testName: 'Login flow',
  scenario: 'Valid login', applicationUnderTest: 'MyApp v1.0',
  testerName: 'Jane Smith', testerEmail: 'j@test.com', environment: 'QA',
});

beforeEach(() => {
  useSessionStore.setState({ activeSession: null, captures: [], isCapturing: false });
  vi.clearAllMocks();
});

describe('useSessionStore', () => {

  describe('startSession()', () => {
    it('sets activeSession when session.create returns ok:true', async () => {
      sessionApi.create.mockResolvedValueOnce({ ok: true, data: stubSession() });
      await useSessionStore.getState().startSession(stubIntake());
      expect(useSessionStore.getState().activeSession?.testId).toBe('TC-001');
    });

    it('clears any previous captures on session start', async () => {
      useSessionStore.setState({ captures: [stubCapture()] });
      sessionApi.create.mockResolvedValueOnce({ ok: true, data: stubSession() });
      await useSessionStore.getState().startSession(stubIntake());
      expect(useSessionStore.getState().captures).toHaveLength(0);
    });

    it('throws when session.create returns ok:false (modal can showToast)', async () => {
      sessionApi.create.mockResolvedValueOnce({
        ok: false, error: { code: 'INTERNAL_ERROR', message: 'DB fail' },
      });
      await expect(useSessionStore.getState().startSession(stubIntake())).rejects.toThrow();
    });

    it('forwards intake to window.evidexAPI.session.create', async () => {
      sessionApi.create.mockResolvedValueOnce({ ok: true, data: stubSession() });
      await useSessionStore.getState().startSession(stubIntake());
      expect(sessionApi.create).toHaveBeenCalledWith(stubIntake());
    });
  });

  describe('endSession()', () => {
    it('clears activeSession when session.end returns ok:true', async () => {
      useSessionStore.setState({ activeSession: stubSession() });
      sessionApi.end.mockResolvedValueOnce({ ok: true, data: stubSummary() });
      await useSessionStore.getState().endSession();
      expect(useSessionStore.getState().activeSession).toBeNull();
    });

    it('also clears captures + isCapturing on successful end', async () => {
      useSessionStore.setState({
        activeSession: stubSession(),
        captures: [stubCapture()],
        isCapturing: true,
      });
      sessionApi.end.mockResolvedValueOnce({ ok: true, data: stubSummary() });
      await useSessionStore.getState().endSession();
      const s = useSessionStore.getState();
      expect(s.captures).toHaveLength(0);
      expect(s.isCapturing).toBe(false);
    });

    it('throws when no active session exists', async () => {
      await expect(useSessionStore.getState().endSession()).rejects.toThrow();
    });

    it('throws when session.end IPC returns ok:false', async () => {
      useSessionStore.setState({ activeSession: stubSession() });
      sessionApi.end.mockResolvedValueOnce({
        ok: false, error: { code: 'SESSION_NOT_FOUND', message: 'Gone' },
      });
      await expect(useSessionStore.getState().endSession()).rejects.toThrow();
    });

    it('returns the SessionSummary from a successful end', async () => {
      useSessionStore.setState({ activeSession: stubSession() });
      const summary = stubSummary();
      sessionApi.end.mockResolvedValueOnce({ ok: true, data: summary });
      const result = await useSessionStore.getState().endSession();
      expect(result).toEqual(summary);
    });
  });

  describe('addCapture()', () => {
    it('appends a capture to the captures array', () => {
      useSessionStore.getState().addCapture(stubCapture());
      expect(useSessionStore.getState().captures).toHaveLength(1);
    });

    it('appends multiple captures in insertion order', () => {
      useSessionStore.getState().addCapture(stubCapture({ captureId: 'cap_01' }));
      useSessionStore.getState().addCapture(stubCapture({ captureId: 'cap_02' }));
      const ids = useSessionStore.getState().captures.map((c) => c.captureId);
      expect(ids).toEqual(['cap_01', 'cap_02']);
    });
  });

  describe('updateCaptureTag()', () => {
    it('optimistically updates the tag in the captures array', async () => {
      useSessionStore.setState({ captures: [stubCapture({ captureId: 'cap_01' })] });
      captureApi.updateTag.mockResolvedValueOnce({ ok: true, data: undefined });
      await useSessionStore.getState().updateCaptureTag('cap_01', 'pass');
      const updated = useSessionStore.getState().captures.find((c) => c.captureId === 'cap_01') as
        CaptureResult & { statusTag?: string };
      expect(updated?.statusTag).toBe('pass');
    });

    it('reverts the tag when ok:false comes back from main', async () => {
      const original = stubCapture({ captureId: 'cap_01' });
      useSessionStore.setState({ captures: [original] });
      captureApi.updateTag.mockResolvedValueOnce({
        ok: false, error: { code: 'CAPTURE_FAILED', message: 'Not found' },
      });
      await expect(
        useSessionStore.getState().updateCaptureTag('cap_01', 'pass')
      ).rejects.toThrow();
      const reverted = useSessionStore.getState().captures.find((c) => c.captureId === 'cap_01');
      // Either no statusTag field or back to the previous value (no statusTag on CaptureResult).
      expect(reverted).toEqual(original);
    });

    it('does nothing harmful when captureId is not in the array', async () => {
      useSessionStore.setState({ captures: [] });
      captureApi.updateTag.mockResolvedValueOnce({ ok: true, data: undefined });
      await expect(
        useSessionStore.getState().updateCaptureTag('cap_unknown', 'pass')
      ).resolves.not.toThrow();
    });
  });

  describe('clearSession()', () => {
    it('resets the store to initial empty state', () => {
      useSessionStore.setState({
        activeSession: stubSession(),
        captures: [stubCapture()],
        isCapturing: true,
      });
      useSessionStore.getState().clearSession();
      const s = useSessionStore.getState();
      expect(s.activeSession).toBeNull();
      expect(s.captures).toHaveLength(0);
      expect(s.isCapturing).toBe(false);
    });
  });
});
