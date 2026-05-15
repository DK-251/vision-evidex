import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ScreenshotRegular,
  WindowRegular,
  CropRegular,
  RecordStopRegular,
  ChevronUpRegular,
  ChevronDownRegular,
} from '@fluentui/react-icons';
import type { SessionStatus, StatusTag } from '@shared/types/entities';

/**
 * Capture toolbar (S-05 / D36).
 *
 * §13 fixes applied this pass:
 *   - Session end: calls session.end IPC, waits for result, then window
 *     sends SESSION_ENDED event so gallery updates live status.
 *   - Capture count: SESSION_STATUS_UPDATE now correctly sets state.
 *     Root cause was the Electron accelerator fix (§20a) — captures were
 *     never firing. Counter was working; now tested with real captures.
 *   - Region button: routes through session.startRegionCapture (new IPC).
 *   - Drag removed entirely: toolbar fixed to top-center. movable:false
 *     set in window-manager.ts. No drag handle rendered.
 *   - App blocking: alwaysOnTop level set to 'pop-up-menu' in
 *     window-manager.ts. setIgnoreMouseEvents called outside pill bounds.
 *
 * §15: default next-tag = 'pass'.
 * TB-05: End requires confirmation.
 * TB-06: Capture buttons flash on fire.
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
  return Math.min(Math.max(440, w * 0.4), 680, w - 80);
}

type EvidexWindow = Window & {
  evidexAPI?: {
    events?: {
      onSessionStatusUpdate?: (h: (s: SessionStatus) => void) => () => void;
    };
    capture?: {
      screenshot?: (r: { sessionId: string; mode: string; statusTag: string }) => Promise<unknown>;
    };
    session?: {
      end?: (id: string) => Promise<unknown>;
      startRegionCapture?: (id: string) => Promise<unknown>;
    };
  };
};

export function App(): JSX.Element {
  const [status,     setStatus]     = useState<ToolbarStatus | null>(null);
  const [collapsed,  setCollapsed]  = useState(false);
  const [ending,     setEnding]     = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [nextTag,    setNextTag]    = useState<StatusTag>('pass'); // §15
  const [firedMode,  setFiredMode]  = useState<CaptureMode | null>(null);
  const [pillWidth,  setPillWidth]  = useState(() => computePillWidth());
  const [pillLeft,   setPillLeft]   = useState(-1);
  const pillRef = useRef<HTMLDivElement>(null);

  // Centre pill on mount, TB-NEW-03: re-centre on resize.
  useEffect(() => {
    const compute = (): void => {
      const w = window.innerWidth || 1920;
      const pw = computePillWidth();
      setPillWidth(pw);
      setPillLeft(Math.round((w - pw) / 2));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // §13 fix: session status update → set state so pill counter updates.
  useEffect(() => {
    const api = (window as EvidexWindow).evidexAPI;
    if (!api?.events?.onSessionStatusUpdate) return;
    const off = api.events.onSessionStatusUpdate((s) => {
      setStatus({
        sessionId:    s.sessionId,
        ...(s.testId !== undefined ? { testId: s.testId } : {}),
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
    const api = (window as EvidexWindow).evidexAPI;

    setFiredMode(mode);
    window.setTimeout(() => setFiredMode(null), 150);

    // §13: region via dedicated channel — capture:screenshot rejects it.
    if (mode === 'region') {
      await api?.session?.startRegionCapture?.(status.sessionId);
      return;
    }
    try {
      await api?.capture?.screenshot?.({
        sessionId: status.sessionId,
        mode,
        statusTag: nextTag,
      });
    } catch {
      /* main broadcasts CAPTURE_ARRIVED on success */
    }
  }

  // §13: end session — call IPC, show ending state, clear on resolve.
  async function handleEndSession(): Promise<void> {
    if (ending || !status) return;
    setEnding(true);
    const api = (window as EvidexWindow).evidexAPI;
    try {
      await api?.session?.end?.(status.sessionId);
      // Main process hides the toolbar window after session.end completes.
      // No renderer-side navigation needed — toolbar window is separate.
    } catch {
      // Errors surface in the gallery via the session status event.
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

  const pillStyle: React.CSSProperties = {
    position:     'absolute',
    top:          12,
    left:         pillLeft,
    pointerEvents: 'auto',
    width:        pillWidth,
  };

  // TB-05: confirmation overlay.
  if (confirmEnd) {
    return (
      <div style={outerStyle}>
        <motion.div
          ref={pillRef}
          className="capture-toolbar"
          role="alertdialog"
          aria-label="Confirm end session"
          style={pillStyle}
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
          {/* TB-04: red dot in collapsed state */}
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
        ref={pillRef}
        className="capture-toolbar"
        role="toolbar"
        aria-label="Capture toolbar"
        style={pillStyle}
        {...slideDown}
        transition={{ duration: 0.22, ease: [0.10, 0.90, 0.20, 1] }}
      >
        {/* Session identity */}
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
            onClick={() => setConfirmEnd(true)}
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

function CounterPill({ kind, value }: { kind: 'pass' | 'fail' | 'blocked'; value: number }): JSX.Element | null {
  if (value === 0) return null;
  return (
    <span className={`capture-toolbar__pill capture-toolbar__pill--${kind}`}>
      {value}
    </span>
  );
}
