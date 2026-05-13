import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ScreenshotRegular,
  WindowRegular,
  CropRegular,
  RecordStopRegular,
  ChevronUpRegular,
  ChevronDownRegular,
  ReOrderDotsVerticalRegular,
} from '@fluentui/react-icons';
import type { SessionStatus } from '@shared/types/entities';

/**
 * Snipping-Tool-style capture toolbar (S-05 / D36).
 *
 * Layout change (W10-drag update):
 *  \u2022 The Electron window is NOW full-display-width, transparent.
 *    Only the pill is visible; the surrounding area is see-through.
 *  \u2022 The pill is absolutely positioned via `left` state so the user
 *    can drag it anywhere along the top of the screen. It starts
 *    centred on first mount.
 *  \u2022 A dedicated gripper icon (\u2261 dots) at the left edge of the pill
 *    carries `-webkit-app-region: drag` so only intentional grabs
 *    move the window. All buttons remain `no-drag`.
 *  \u2022 The Electron window has `movable: true` + a `move` event handler
 *    in window-manager.ts that clamps Y to the top edge.
 *  \u2022 backdrop-filter has been removed from the pill so it renders
 *    as a solid opaque surface without the blurry halo artefact.
 */

const IPC_SESSION_STATUS_UPDATE = 'session:statusUpdate';

interface ToolbarStatus {
  sessionId:    string;
  testId?:      string;
  captureCount: number;
  passCount:    number;
  failCount:    number;
  blockedCount: number;
}

type CaptureMode = 'fullscreen' | 'active-window' | 'region';

interface CaptureButton {
  mode:  CaptureMode;
  label: string;
  hint:  string;
  Icon:  typeof ScreenshotRegular;
}

const CAPTURE_BUTTONS: CaptureButton[] = [
  { mode: 'fullscreen',    label: 'Fullscreen',    hint: 'Ctrl+Shift+1', Icon: ScreenshotRegular },
  { mode: 'active-window', label: 'Active window', hint: 'Ctrl+Shift+2', Icon: WindowRegular },
  { mode: 'region',        label: 'Region',        hint: 'Ctrl+Shift+3', Icon: CropRegular },
];

/** Slide-down entrance \u2014 Snipping Tool style. */
const slideDown = {
  initial: { y: -56, opacity: 0 },
  animate: { y:   0, opacity: 1 },
  exit:    { y: -56, opacity: 0 },
} as const;

// ── Pill width (content only, not the Electron window width) ──────────────
const PILL_WIDTH = 560;

export function App(): JSX.Element {
  const [status,    setStatus]    = useState<ToolbarStatus | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [ending,    setEnding]    = useState(false);
  // Pill horizontal offset within the full-width window.
  // Initialised to -1 so we can detect "not yet measured" and snap to centre.
  const [pillLeft,  setPillLeft]  = useState(-1);

  // On mount, centre the pill within whatever the window width is.
  useEffect(() => {
    const w = window.innerWidth || 1920;
    setPillLeft(Math.round((w - PILL_WIDTH) / 2));
  }, []);

  // Counter subscription.
  useEffect(() => {
    const apiEvents =
      (window as Window & { evidexAPI?: { events?: { onSessionStatusUpdate?: unknown } } })
        .evidexAPI?.events?.onSessionStatusUpdate;

    const apply = (s: SessionStatus & { testId?: string }): void => {
      setStatus({
        sessionId:    s.sessionId,
        ...(s.testId !== undefined ? { testId: s.testId } : {}),
        captureCount: s.captureCount,
        passCount:    s.passCount,
        failCount:    s.failCount,
        blockedCount: s.blockedCount,
      });
    };

    if (typeof apiEvents === 'function') {
      const off = (apiEvents as (h: (status: SessionStatus) => void) => () => void)(apply);
      return off;
    }

    const w = window as unknown as {
      electron?: {
        ipcRenderer?: {
          on: (ch: string, fn: (e: unknown, v: unknown) => void) => void;
          removeListener: (ch: string, fn: (e: unknown, v: unknown) => void) => void;
        };
      };
    };
    const ipc = w.electron?.ipcRenderer;
    if (!ipc) return undefined;
    const listener = (_e: unknown, v: unknown): void => apply(v as SessionStatus);
    ipc.on(IPC_SESSION_STATUS_UPDATE, listener);
    return () => ipc.removeListener(IPC_SESSION_STATUS_UPDATE, listener);
  }, []);

  async function handleCapture(mode: CaptureMode): Promise<void> {
    if (!status) return;
    const api =
      (window as Window & {
        evidexAPI?: { capture?: { screenshot?: (r: { sessionId: string; mode: string; statusTag: string }) => Promise<unknown> } };
      }).evidexAPI;
    if (!api?.capture?.screenshot) return;
    try {
      await api.capture.screenshot({ sessionId: status.sessionId, mode, statusTag: 'untagged' });
    } catch {
      /* main broadcasts CAPTURE_ARRIVED on success */
    }
  }

  async function handleEndSession(): Promise<void> {
    if (ending || !status) return;
    setEnding(true);
    const api = (window as Window & {
      evidexAPI?: { session?: { end?: (id: string) => Promise<unknown> } };
    }).evidexAPI;
    try {
      await api?.session?.end?.(status.sessionId);
    } catch {
      /* main-side errors surface as toasts in the renderer */
    }
    setEnding(false);
  }

  // Don\u2019t render until we know the window width (avoids flash at x:0).
  if (pillLeft < 0) return <></>;

  // ── Outer wrapper: full viewport, transparent, pointer-events:none
  // so clicks on the transparent region fall through to windows below.
  // The pill re-enables pointer events for itself.
  const outerStyle: React.CSSProperties = {
    position:      'fixed',
    inset:         0,
    pointerEvents: 'none',
    userSelect:    'none',
    overflow:      'hidden',
  };

  if (collapsed) {
    return (
      <div style={outerStyle}>
        <motion.div
          className="capture-toolbar capture-toolbar--collapsed"
          style={{ position: 'absolute', top: 12, left: pillLeft, pointerEvents: 'auto' }}
          {...slideDown}
          transition={{ duration: 0.22, ease: [0.10, 0.90, 0.20, 1] }}
        >
          {/* Drag handle */}
          <span
            className="capture-toolbar__drag-handle"
            aria-hidden="true"
            title="Drag to reposition"
          >
            <ReOrderDotsVerticalRegular fontSize={14} />
          </span>
          <span className="capture-toolbar__counter-mono">
            {status?.captureCount ?? 0}
          </span>
          <button
            type="button"
            className="capture-toolbar__btn"
            aria-label="Expand toolbar"
            onClick={() => setCollapsed(false)}
          >
            <ChevronDownRegular fontSize={16} />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={outerStyle}>
      <motion.div
        className="capture-toolbar"
        role="toolbar"
        aria-label="Capture toolbar"
        style={{ position: 'absolute', top: 12, left: pillLeft, pointerEvents: 'auto', width: PILL_WIDTH }}
        {...slideDown}
        transition={{ duration: 0.22, ease: [0.10, 0.90, 0.20, 1] }}
      >
        {/* ── Drag handle — ONLY this region triggers window drag ──── */}
        <span
          className="capture-toolbar__drag-handle"
          aria-label="Drag to reposition toolbar"
          title="Drag to reposition"
          role="presentation"
        >
          <ReOrderDotsVerticalRegular fontSize={16} />
        </span>

        <span className="capture-toolbar__divider" aria-hidden="true" />

        {/* Session identity */}
        <div className="capture-toolbar__identity" title={status?.testId ?? 'No active session'}>
          <span className="capture-toolbar__dot" aria-hidden="true" />
          <span className="capture-toolbar__test-id">
            {status?.testId ?? '\u2014'}
          </span>
        </div>

        <span className="capture-toolbar__divider" aria-hidden="true" />

        {/* Live counter */}
        <div className="capture-toolbar__counters" aria-label="Capture counts">
          <CounterPill kind="pass"    value={status?.passCount    ?? 0} />
          <CounterPill kind="fail"    value={status?.failCount    ?? 0} />
          <CounterPill kind="blocked" value={status?.blockedCount ?? 0} />
          <span className="capture-toolbar__counter-total" aria-label="Total captures">
            {status?.captureCount ?? 0}
          </span>
        </div>

        <span className="capture-toolbar__divider" aria-hidden="true" />

        {/* Capture mode buttons */}
        <div className="capture-toolbar__captures" role="group" aria-label="Capture mode">
          {CAPTURE_BUTTONS.map(({ mode, label, hint, Icon }) => (
            <button
              key={mode}
              type="button"
              className="capture-toolbar__btn capture-toolbar__btn--mode"
              aria-label={`${label} (${hint})`}
              title={`${label} \u00b7 ${hint}`}
              onClick={() => void handleCapture(mode)}
            >
              <Icon fontSize={18} />
            </button>
          ))}
        </div>

        <span className="capture-toolbar__divider" aria-hidden="true" />

        {/* End + collapse */}
        <div className="capture-toolbar__trailing">
          <button
            type="button"
            className="capture-toolbar__btn capture-toolbar__btn--end"
            disabled={ending}
            onClick={() => void handleEndSession()}
            title="End session"
          >
            <RecordStopRegular fontSize={14} />
            <span>{ending ? '\u2026' : 'End'}</span>
          </button>
          <button
            type="button"
            className="capture-toolbar__btn"
            aria-label="Collapse toolbar"
            title="Collapse"
            onClick={() => setCollapsed(true)}
          >
            <ChevronUpRegular fontSize={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface CounterPillProps {
  kind:  'pass' | 'fail' | 'blocked';
  value: number;
}

function CounterPill({ kind, value }: CounterPillProps): JSX.Element {
  return (
    <span className={`capture-toolbar__pill capture-toolbar__pill--${kind}`}>
      {value}
    </span>
  );
}
