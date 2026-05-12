import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ScreenshotRegular,
  WindowRegular,
  CropRegular,
  RecordStopRegular,
  ChevronUpRegular,
  ChevronDownRegular,
} from '@fluentui/react-icons';
import type { SessionStatus } from '@shared/types/entities';

/**
 * Snipping-Tool-style capture toolbar (S-05 / D36).
 *
 * Visual contract:
 *  • The Electron window is pinned at the top-centre of the primary
 *    display (`positionToolbarTopCenter` in window-manager.ts) with a
 *    transparent background. The pill below is what the user actually
 *    sees — it slides in from above on mount and lives at the top of
 *    the window's content area.
 *  • Pill height matches the Fluent default control row (40 px).
 *  • Drag region is intentionally absent — the toolbar is fixed in
 *    place, matching the Windows Snipping Tool toolbar UX. The Electron
 *    window itself is created with `movable: false` for the same reason.
 *  • All visual styling lives in `components.css` under the
 *    `.capture-toolbar` family so dark theme + reduced motion + high
 *    contrast inherit from the design system automatically.
 *
 * The counter subscribes to `SESSION_STATUS_UPDATE` from the main
 * process — the toolbar never polls.
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

/** Slide-down entrance — Snipping Tool style. */
const slideDown = {
  initial: { y: -56, opacity: 0 },
  animate: { y:   0, opacity: 1 },
  exit:    { y: -56, opacity: 0 },
} as const;

export function App(): JSX.Element {
  const [status,    setStatus]    = useState<ToolbarStatus | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [ending,    setEnding]    = useState(false);

  // Counter subscription — works with either the typed `evidexAPI`
  // events surface OR the raw `ipcRenderer` channel (sub-window preloads
  // sometimes expose only the latter).
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

  if (collapsed) {
    return (
      <motion.div
        className="capture-toolbar capture-toolbar--collapsed"
        {...slideDown}
        transition={{ duration: 0.22, ease: [0.10, 0.90, 0.20, 1] }}
      >
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
    );
  }

  return (
    <motion.div
      className="capture-toolbar"
      role="toolbar"
      aria-label="Capture toolbar"
      {...slideDown}
      transition={{ duration: 0.22, ease: [0.10, 0.90, 0.20, 1] }}
    >
      {/* Session identity — left segment */}
      <div className="capture-toolbar__identity" title={status?.testId ?? 'No active session'}>
        <span className="capture-toolbar__dot" aria-hidden="true" />
        <span className="capture-toolbar__test-id">
          {status?.testId ?? '—'}
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
            title={`${label} · ${hint}`}
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
          <span>{ending ? '…' : 'End'}</span>
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
