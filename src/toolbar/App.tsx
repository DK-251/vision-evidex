import { useEffect, useRef, useState } from 'react';
import type { SessionStatus } from '@shared/types/entities';

/**
 * D36 — Capture toolbar (S-05).
 *
 * Always-on-top frameless transparent window (480×72). Subscribes to
 * SESSION_STATUS_UPDATE push events from the main process so the counter
 * stays live without polling.
 *
 * Uses only CSS custom properties from the shared token system — no
 * Tailwind dark: prefix (banned per CLAUDE.md Rule 10 replacement).
 * setContentProtection(true) is applied by window-manager.ts so this
 * window is excluded from desktopCapturer output.
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

export function App(): JSX.Element {
  const [status, setStatus] = useState<ToolbarStatus | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [ending, setEnding] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  // Subscribe to live counter updates from the main process.
  useEffect(() => {
    const handler = (_e: Electron.IpcRendererEvent, s: SessionStatus & { testId?: string }): void => {
      setStatus({
        sessionId:    s.sessionId,
        testId:       s.testId,
        captureCount: s.captureCount,
        passCount:    s.passCount,
        failCount:    s.failCount,
        blockedCount: s.blockedCount,
      });
    };
    const ipcRenderer = (window as Window & { evidexAPI?: { events?: { onSessionStatusUpdate?: unknown } } }).evidexAPI;
    if (ipcRenderer?.events?.onSessionStatusUpdate) {
      const off = (ipcRenderer.events.onSessionStatusUpdate as (h: (status: SessionStatus) => void) => () => void)(
        (s) => setStatus({
          sessionId:    s.sessionId,
          captureCount: s.captureCount,
          passCount:    s.passCount,
          failCount:    s.failCount,
          blockedCount: s.blockedCount,
        })
      );
      return off;
    }
    // Fallback: direct ipcRenderer for toolbar window (preload may differ).
    if ((window as Window & { electron?: { ipcRenderer?: { on: (ch: string, fn: (e: unknown, v: unknown) => void) => void; removeListener: (ch: string, fn: (e: unknown, v: unknown) => void) => void } } }).electron?.ipcRenderer) {
      const el = (window as Window & { electron: { ipcRenderer: { on: (ch: string, fn: (e: unknown, v: unknown) => void) => void; removeListener: (ch: string, fn: (e: unknown, v: unknown) => void) => void } } }).electron.ipcRenderer;
      const fn = (_e: unknown, v: unknown): void => {
        const s = v as SessionStatus;
        handler({} as Electron.IpcRendererEvent, s);
      };
      el.on(IPC_SESSION_STATUS_UPDATE, fn);
      return () => el.removeListener(IPC_SESSION_STATUS_UPDATE, fn);
    }
    return undefined;
  }, []);

  async function handleCapture(mode: 'fullscreen' | 'active-window' | 'region'): Promise<void> {
    if (!status) return;
    const api = (window as Window & { evidexAPI?: { capture?: { screenshot?: (r: { sessionId: string; mode: string; statusTag: string }) => Promise<unknown> } } }).evidexAPI;
    if (!api?.capture?.screenshot) return;
    try {
      await api.capture.screenshot({ sessionId: status.sessionId, mode, statusTag: 'untagged' });
    } catch { /* swallow — main broadcasts CAPTURE_ARRIVED on success */ }
  }

  async function handleEndSession(): Promise<void> {
    if (ending || !status) return;
    setEnding(true);
    const api = (window as Window & { evidexAPI?: { session?: { end?: (id: string) => Promise<unknown> } } }).evidexAPI;
    try {
      await api?.session?.end?.(status.sessionId);
    } catch { /* main-side errors surface as toasts in the renderer */ }
    setEnding(false);
  }

  if (collapsed) {
    return (
      <div
        ref={dragRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: '100%',
          padding: '0 10px',
          background: 'var(--color-layer-acrylic, rgba(32,32,32,0.85))',
          backdropFilter: 'blur(20px)',
          borderRadius: 8,
          cursor: 'default',
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 13, color: 'var(--color-text-primary, #fff)', fontWeight: 600 }}>
          {status?.captureCount ?? 0}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={btnStyle}
          title="Expand toolbar"
        >
          ↕
        </button>
      </div>
    );
  }

  return (
    <div
      ref={dragRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: '100%',
        padding: '0 10px',
        background: 'var(--color-layer-acrylic, rgba(32,32,32,0.85))',
        backdropFilter: 'blur(20px)',
        borderRadius: 8,
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Drag handle area — app-region drag */}
      <span
        style={{
          fontSize: 11,
          color: 'var(--color-text-secondary, rgba(255,255,255,0.6))',
          fontFamily: 'var(--font-mono, monospace)',
          whiteSpace: 'nowrap',
          maxWidth: 90,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flexShrink: 0,
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
        title={status?.testId ?? 'No active session'}
      >
        {status?.testId ?? '—'}
      </span>

      {/* Counter */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          flexShrink: 0,
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <CountPill color="#6CCB5F" value={status?.passCount ?? 0} />
        <CountPill color="#FF99A4" value={status?.failCount ?? 0} />
        <CountPill color="#FCE100" value={status?.blockedCount ?? 0} />
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary, rgba(255,255,255,0.6))' }}>
          {status?.captureCount ?? 0}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />

      {/* Capture buttons */}
      <div
        style={{
          display: 'flex',
          gap: 3,
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <button type="button" onClick={() => void handleCapture('fullscreen')} style={btnStyle} title="Capture fullscreen (Ctrl+Shift+1)">⬛</button>
        <button type="button" onClick={() => void handleCapture('active-window')} style={btnStyle} title="Capture active window (Ctrl+Shift+2)">⬜</button>
        <button type="button" onClick={() => void handleCapture('region')} style={btnStyle} title="Capture region (Ctrl+Shift+3)">⬡</button>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />

      {/* End session + collapse */}
      <div
        style={{
          display: 'flex',
          gap: 3,
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={() => void handleEndSession()}
          disabled={ending}
          style={{
            ...btnStyle,
            background: ending ? 'rgba(255,255,255,0.05)' : 'rgba(220,38,38,0.25)',
            color: '#FF99A4',
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 600,
          }}
          title="End session"
        >
          {ending ? '…' : 'End'}
        </button>
        <button type="button" onClick={() => setCollapsed(true)} style={btnStyle} title="Collapse toolbar">↕</button>
      </div>
    </div>
  );
}

function CountPill({ color, value }: { color: string; value: number }): JSX.Element {
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      color,
      fontFamily: 'var(--font-mono, monospace)',
      minWidth: 16,
      textAlign: 'center',
    }}>
      {value}
    </span>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 4,
  color: 'var(--color-text-primary, rgba(255,255,255,0.9))',
  cursor: 'pointer',
  fontSize: 14,
  padding: '3px 6px',
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
