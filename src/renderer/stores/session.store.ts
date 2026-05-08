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
  /** Unsubscribe handle for the CAPTURE_ARRIVED IPC event. Null when no session is active. */
  _captureListener: (() => void) | null;
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
  _captureListener: null,

  async startSession(intake) {
    const result = await window.evidexAPI.session.create(intake);
    if (!result.ok) {
      // Surface to the modal — caller catches and showToast()s.
      throw Object.assign(new Error(result.error.message), {
        code: result.error.code,
        fields: result.error.fields,
      });
    }
    if (!result.data) throw new Error('Session created but server returned no data');

    // Subscribe to captures only while a session is active.
    // Any previous listener is torn down by clearSession() before this runs.
    const off = typeof window !== 'undefined' && window.evidexAPI?.events?.onCaptureArrived
      ? window.evidexAPI.events.onCaptureArrived((capture) => {
          useSessionStore.getState().addCapture(capture);
        })
      : null;

    set({ activeSession: result.data, captures: [], isCapturing: false, _captureListener: off });
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
    if (!result.data) throw new Error('Session end returned no summary data');
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
        c.captureId === captureId ? { ...c, statusTag: tag } : c
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
    // Unsubscribe the capture listener before clearing state.
    get()._captureListener?.();
    set({ activeSession: null, captures: [], isCapturing: false, _captureListener: null });
  },
}));
