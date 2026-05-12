import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * D34 \u2014 Region capture overlay (rubber-band selector).
 *
 * Fullscreen transparent BrowserWindow (createRegionWindow in window-manager).
 * User click-drags to select a rectangle. On mouseup the selected region
 * coordinates are sent back to the main process via IPC and the window closes.
 *
 * The overlay has a subtle dark tint and crosshair cursor so the user
 * can see it is active without occluding the screen content completely.
 */

const IPC_REGION_SELECTED = 'region:selected';
const IPC_REGION_CANCEL   = 'region:cancel';

interface Rect { x: number; y: number; width: number; height: number }

export function App(): JSX.Element {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [current, setCurrent] = useState<{ x: number; y: number } | null>(null);
  const [selecting, setSelecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sendResult = useCallback((rect: Rect) => {
    const ipc = (window as Window & { ipcRenderer?: { send: (ch: string, v: unknown) => void } }).ipcRenderer;
    ipc?.send(IPC_REGION_SELECTED, rect);
  }, []);

  const sendCancel = useCallback(() => {
    const ipc = (window as Window & { ipcRenderer?: { send: (ch: string) => void } }).ipcRenderer;
    ipc?.send(IPC_REGION_CANCEL);
  }, []);

  // Escape key cancels.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') sendCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sendCancel]);

  function onMouseDown(e: React.MouseEvent): void {
    setStart({ x: e.clientX, y: e.clientY });
    setCurrent({ x: e.clientX, y: e.clientY });
    setSelecting(true);
  }

  function onMouseMove(e: React.MouseEvent): void {
    if (!selecting) return;
    setCurrent({ x: e.clientX, y: e.clientY });
  }

  function onMouseUp(e: React.MouseEvent): void {
    if (!selecting || !start) return;
    setSelecting(false);
    const x = Math.min(start.x, e.clientX);
    const y = Math.min(start.y, e.clientY);
    const width  = Math.abs(e.clientX - start.x);
    const height = Math.abs(e.clientY - start.y);
    // Discard tiny selections (accidental clicks).
    if (width < 8 || height < 8) {
      setStart(null);
      setCurrent(null);
      return;
    }
    sendResult({ x, y, width, height });
  }

  // Compute selection rect for the visual overlay.
  const selectionRect: Rect | null =
    selecting && start && current
      ? {
          x: Math.min(start.x, current.x),
          y: Math.min(start.y, current.y),
          width:  Math.abs(current.x - start.x),
          height: Math.abs(current.y - start.y),
        }
      : null;

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{
        width: '100vw',
        height: '100vh',
        cursor: 'crosshair',
        position: 'relative',
        background: 'rgba(0, 0, 0, 0.10)',
        userSelect: 'none',
      }}
    >
      {/* Instruction hint */}
      {!selecting && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.65)',
            color: '#fff',
            fontSize: 13,
            fontFamily: 'Segoe UI Variable, Segoe UI, system-ui, sans-serif',
            padding: '6px 16px',
            borderRadius: 6,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Drag to select region \u2014 Esc to cancel
        </div>
      )}

      {/* Selection rectangle */}
      {selectionRect && (
        <div
          style={{
            position: 'absolute',
            left: selectionRect.x,
            top:  selectionRect.y,
            width:  selectionRect.width,
            height: selectionRect.height,
            border: '2px solid #60CDFF',
            background: 'rgba(96,205,255,0.08)',
            boxShadow: '0 0 0 1px rgba(96,205,255,0.4)',
            pointerEvents: 'none',
          }}
        >
          {/* Dimension label */}
          <div
            style={{
              position: 'absolute',
              bottom: -22,
              left: 0,
              background: 'rgba(0,0,0,0.65)',
              color: '#fff',
              fontSize: 11,
              fontFamily: 'Cascadia Code, Consolas, monospace',
              padding: '2px 6px',
              borderRadius: 3,
              whiteSpace: 'nowrap',
            }}
          >
            {selectionRect.width} \u00d7 {selectionRect.height}
          </div>
        </div>
      )}
    </div>
  );
}
