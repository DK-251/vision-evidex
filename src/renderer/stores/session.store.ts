import { create } from 'zustand';
import type {
  Session,
  SessionIntakeInput,
  SessionSummary,
  CaptureResult,
  StatusTag,
} from '@shared/types/entities';

/**
 * In-memory session + capture state for the renderer. No persistence —
 * if the app restarts mid-session, recovery flows in Phase 4 surface
 * the dangling row. The main process is the source of truth (SQLite +
 * .evidex container); this store mirrors the slice the UI needs.
 */

interface SessionStore {
  activeSession: Session | null;
  captures: CaptureResult[];
  isCapturing: boolean;
  startSession: (intake: SessionIntakeInput) => Promise<Session>;
  endSession: () => Promise<SessionSummary>;
  addCapture: (result: CaptureResult) => void;
  updateCaptureTag: (captureId: string, tag: StatusTag) => Promise<void>;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  activeSession: null,
  captures: [],
  isCapturing: false,

  async startSession(intake) {
    const result = await window.evidexAPI.session.create(intake);
    if (!result.ok) {
      // Surface to the modal — caller catches and showToast()s.
      throw Object.assign(new Error(result.error.message), {
        code: result.error.code,
        fields: result.error.fields,
      });
    }
    set({ activeSession: result.data, captures: [], isCapturing: false });
    return result.data;
  },

  async endSession() {
    const session = get().activeSession;
    if (!session) {
      throw new Error('endSession called with no active session');
    }
    const result = await window.evidexAPI.session.end(session.id);
    if (!result.ok) {
      throw Object.assign(new Error(result.error.message), {
        code: result.error.code,
        fields: result.error.fields,
      });
    }
    get().clearSession();
    return result.data;
  },

  addCapture(result) {
    set((s) => ({ captures: [...s.captures, result] }));
  },

  async updateCaptureTag(captureId, tag) {
    // Optimistic — patch local state first, revert on error.
    const previous = get().captures;
    set({
      captures: previous.map((c) =>
        c.captureId === captureId ? ({ ...c, statusTag: tag } as CaptureResult) : c
      ),
    });
    const result = await window.evidexAPI.capture.updateTag(captureId, tag);
    if (!result.ok) {
      set({ captures: previous });
      throw Object.assign(new Error(result.error.message), {
        code: result.error.code,
        fields: result.error.fields,
      });
    }
  },

  clearSession() {
    set({ activeSession: null, captures: [], isCapturing: false });
  },
}));

/**
 * Wk 8 — subscribe to CAPTURE_ARRIVED at module load so any window that
 * imports the store picks up new captures in real time. The subscription
 * is set up exactly once (module-eval); clearSession() doesn't need to
 * unbind because addCapture only mutates the array.
 *
 * Guarded against test environments that don't shim window.evidexAPI
 * (and against hot-reload re-imports — re-running the IPC subscribe is
 * safe, ipcRenderer dedupes nothing but the cost is a no-op listener).
 */
if (typeof window !== 'undefined' && window.evidexAPI?.events?.onCaptureArrived) {
  window.evidexAPI.events.onCaptureArrived((capture) => {
    useSessionStore.getState().addCapture(capture);
  });
}
