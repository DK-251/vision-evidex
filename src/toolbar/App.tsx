import { useEffect, useRef, useState } from 'react';
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
import type { SessionStatus, StatusTag } from '@shared/types/entities';

/**
 * Capture toolbar (S-05 / D36) — all audit fixes applied:
 *
 * TB-01: testId now arrives via SessionStatus (type updated in entities.ts)
 * TB-02: P/F/B tag-selector buttons so next capture gets the right tag
 * TB-03: pill width is responsive (min 440, max 720, never overflows viewport)
 * TB-04: collapsed state shows the red recording dot
 * TB-05: "End" requires confirmation before calling session.end()
 * TB-06: capture buttons flash briefly to acknowledge the shot
 * TB-07: dead window.electron.ipcRenderer fallback removed
 * TB-09: zero-value counter pills hidden (not shown as "0")
 * TB-NEW-03: window resize listener recalculates pill centring
 */

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

const TAG_OPTIONS: { tag: StatusTag; label: string; color: string }[] = [
  { tag: 'pass',    label: 'P', color: 'rgba(108,203,95,0.25)'  },
  { tag: 'fail',    label: 'F', color: 'rgba(255,153,164,0.25)' },
  { tag: 'blocked', label: 'B', color: 'rgba(252,225,0,0.20)'   },
];

const slideDown = {
  initial: { y: -56, opacity: 0 },
  animate: { y:   0, opacity: 1 },
  exit:    { y: -56, opacity: 0 },
} as const;

// TB-03: compute responsive pill width clamped to the viewport.
function computePillWidth(): number {
  const w = window.innerWidth || 1920;
  return Math.min(Math.max(440, w * 0.4), 720, w - 80);
}

export function App(): JSX.Element {
  const [status,       setStatus]       = useState<ToolbarStatus | null>(null);
  const [collapsed,    setCollapsed]     = useState(false);
  const [ending,       setEnding]        = useState(false);
  const [confirmEnd,   setConfirmEnd]    = useState(false);    // TB-05
  const [nextTag,      setNextTag]       = useState<StatusTag>('untagged'); // TB-02
  const [firedMode,    setFiredMode]     = useState<CaptureMode | null>(null); // TB-06
  const [pillWidth,    setPillWidth]     = useState(() => computePillWidth());
  const [pillLeft,     setPillLeft]      = useState(-1);

  // Centre pill on first mount.
  useEffect(() => {
    const w = window.innerWidth || 1920;
    const pw = computePillWidth();
    setPillWidth(pw);
    setPillLeft(Math.round((w - pw) / 2));
  }, []);

  // TB-NEW-03: recompute pill position on window resize (monitor switch).
  useEffect(() => {
    const onResize = (): void => {
      const w = window.innerWidth || 1920;
      const pw = computePillWidth();
      setPillWidth(pw);
      setPillLeft((prev) => {
        // If pill was centred (within 10px of centre), re-centre it.
        const wasCentred = Math.abs(prev - Math.round((w - pw) / 2)) < 50;
        return wasCentred ? Math.round((w - pw) / 2) : prev;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // TB-07: remove dead fallback. Only use evidexAPI.
  useEffect(() => {
    const api = (window as Window & {
      evidexAPI?: { events?: { onSessionStatusUpdate?: (h: (s: SessionStatus) => void) => () => void } };
    }).evidexAPI;

    if (!api?.events?.onSessionStatusUpdate) {
      // No preload bridge — toolbar is disconnected.
      return;
    }

    const off = api.events.onSessionStatusUpdate((s) => {
      setStatus({
        sessionId:    s.sessionId,
        testId:       (s as SessionStatus & { testId?: string }).testId,
        captureCount: s.captureCount,
        passCount:    s.passCount,
        failCount:    s.failCount,
        blockedCount: s.blockedCount,
      });
    });
    return off;
  }, []);

  async function handleCapture(mode: CaptureMode): Promise<void> {
    if (!status) return;
    const api = (window as Window & {
      evidexAPI?: { capture?: { screenshot?: (r: { sessionId: string; mode: string; statusTag: string }) => Promise<unknown> } };
    }).evidexAPI;
    if (!api?.capture?.screenshot) return;

    // TB-06: briefly highlight the button that was clicked.
    setFiredMode(mode);
    window.setTimeout(() => setFiredMode(null), 150);

    try {
      await api.capture.screenshot({ sessionId: status.sessionId, mode, statusTag: nextTag });
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
    setConfirmEnd(false);
  }

  if (pillLeft < 0) return <></>;

  const outerStyle: React.CSSProperties = {
    position:      'fixed',
    inset:         0,
    pointerEvents: 'none',
    userSelect:    'none',
    overflow:      'hidden',
  };

  // TB-05: confirmation overlay inside the collapsed pill.
  if (confirmEnd) {
    return (
      <div style={outerStyle}>
        <motion.div
          className="capture-toolbar"
          role="alertdialog"
          aria-label="Confirm end session"
          style={{ position: 'absolute', top: 12, left: pillLeft, pointerEvents: 'auto', width: pillWidth }}
          {...slideDown}
          transition={{ duration: 0.18, ease: [0.10, 0.90, 0.20, 1] }}
        >
          <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.88)', padding: '0 8px' }}>
            End this session?
          </span>
          <button
            type="button"
            className="capture-toolbar__btn capture-toolbar__btn--end"
            disabled={ending}
            onClick={() => void handleEndSession()}
            style={{ minWidth: 56 }}
          >
            {ending ? '…' : 'End'}
          </button>
          <button
            type="button"
            className="capture-toolbar__btn"
            onClick={() => setConfirmEnd(false)}
          >
            Cancel
          </button>
        </motion.div>
      </div>
    );
  }

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
          <span className="capture-toolbar__drag-handle" aria-hidden="true" title="Drag to reposition">
            <ReOrderDotsVerticalRegular fontSize={14} />
          </span>
          {/* TB-04: show red dot in collapsed state to signal active recording */}
          <span className="capture-toolbar__dot" aria-hidden="true" />
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
        style={{ position: 'absolute', top: 12, left: pillLeft, pointerEvents: 'auto', width: pillWidth }}
        {...slideDown}
        transition={{ duration: 0.22, ease: [0.10, 0.90, 0.20, 1] }}
      >
        {/* Drag handle */}
        <span
          className="capture-toolbar__drag-handle"
          aria-label="Drag to reposition toolbar"
          title="Drag to reposition"
          role="presentation"
        >
          <ReOrderDotsVerticalRegular fontSize={16} />
        </span>

        <span className="capture-toolbar__divider" aria-hidden="true" />

        {/* Session identity — TB-01: shows real testId */}
        <div className="capture-toolbar__identity" title={status?.testId ?? 'No active session'}>
          <span className="capture-toolbar__dot" aria-hidden="true" />
          <span className="capture-toolbar__test-id">
            {status?.testId ?? '—'}
          </span>
        </div>

        <span className="capture-toolbar__divider" aria-hidden="true" />

        {/* TB-09: hide zero-value pills */}
        <div className="capture-toolbar__counters" aria-label="Capture counts">
          <CounterPill kind="pass"    value={status?.passCount    ?? 0} />
          <CounterPill kind="fail"    value={status?.failCount    ?? 0} />
          <CounterPill kind="blocked" value={status?.blockedCount ?? 0} />
          <span className="capture-toolbar__counter-total" aria-label="Total captures">
            {status?.captureCount ?? 0}
          </span>
        </div>

        <span className="capture-toolbar__divider" aria-hidden="true" />

        {/* TB-02: tag selector */}
        <div className="capture-toolbar__captures" role="group" aria-label="Next capture tag">
          {TAG_OPTIONS.map(({ tag, label, color }) => (
            <button
              key={tag}
              type="button"
              className="capture-toolbar__btn"
              aria-label={`Tag next capture as ${tag}`}
              aria-pressed={nextTag === tag}
              title={`Next tag: ${tag}`}
              onClick={() => setNextTag((t) => t === tag ? 'untagged' : tag)}
              style={{
                background: nextTag === tag ? color : 'transparent',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 11,
                fontWeight: 700,
                minWidth: 24,
                height: 24,
                padding: '0 4px',
              }}
            >
              {label}
            </button>
          ))}
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
              style={{
                // TB-06: brief accent flash when this mode was just fired
                background: firedMode === mode ? 'rgba(96,205,255,0.30)' : undefined,
                transition: 'background 150ms ease',
              }}
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
            onClick={() => setConfirmEnd(true)}  // TB-05: confirmation first
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
    </div>
  );
}

// TB-09: only render when value > 0
function CounterPill({ kind, value }: { kind: 'pass' | 'fail' | 'blocked'; value: number }): JSX.Element | null {
  if (value === 0) return null;
  return (
    <span className={`capture-toolbar__pill capture-toolbar__pill--${kind}`}>
      {value}
    </span>
  );
}
