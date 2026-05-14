import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * D34 — Region capture overlay (rubber-band selector).
 *
 * RG-01 fix: use window.evidexAPI.region.sendSelected / sendCancel
 *            (previously used window.ipcRenderer which doesn't exist in
 *            the sandboxed preload — region capture was 100% broken).
 * RG-02 fix: dimension label flips above the box when near the screen bottom.
 * RG-04 fix: overlay tint increased from 10% to 25% opacity.
 */

interface Rect { x: number; y: number; width: number; height: number }

interface RegionAPI {
  sendSelected: (rect: Rect) => void;
  sendCancel: () => void;
}

function getRegionAPI(): RegionAPI | null {
  // RG-01: use the preload bridge surface exposed via contextBridge.
  const api = (window as Window & {
    evidexAPI?: { region?: RegionAPI };
  }).evidexAPI;
  return api?.region ?? null;
}

export function App(): JSX.Element {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [current, setCurrent] = useState<{ x: number; y: number } | null>(null);
  const [selecting, setSelecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sendResult = useCallback((rect: Rect) => {
    getRegionAPI()?.sendSelected(rect);
  }, []);

  const sendCancel = useCallback(() => {
    getRegionAPI()?.sendCancel();
  }, []);

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
    if (width < 8 || height < 8) {
      setStart(null);
      setCurrent(null);
      return;
    }
    sendResult({ x, y, width, height });
  }

  // Touch support — RG-05
  function onTouchStart(e: React.TouchEvent): void {
    const t = e.touches[0];
    if (!t) return;
    setStart({ x: t.clientX, y: t.clientY });
    setCurrent({ x: t.clientX, y: t.clientY });
    setSelecting(true);
  }
  function onTouchMove(e: React.TouchEvent): void {
    if (!selecting) return;
    const t = e.touches[0];
    if (!t) return;
    setCurrent({ x: t.clientX, y: t.clientY });
  }
  function onTouchEnd(e: React.TouchEvent): void {
    if (!selecting || !start) return;
    const t = e.changedTouches[0];
    if (!t) return;
    setSelecting(false);
    const x = Math.min(start.x, t.clientX);
    const y = Math.min(start.y, t.clientY);
    const width  = Math.abs(t.clientX - start.x);
    const height = Math.abs(t.clientY - start.y);
    if (width < 8 || height < 8) { setStart(null); setCurrent(null); return; }
    sendResult({ x, y, width, height });
  }

  const selectionRect: Rect | null =
    selecting && start && current
      ? {
          x: Math.min(start.x, current.x),
          y: Math.min(start.y, current.y),
          width:  Math.abs(current.x - start.x),
          height: Math.abs(current.y - start.y),
        }
      : null;

  // RG-02: flip dimension label above the box when near screen bottom.
  const labelAbove = selectionRect
    ? (selectionRect.y + selectionRect.height) > window.innerHeight - 40
    : false;

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        width: '100vw',
        height: '100vh',
        cursor: 'crosshair',
        position: 'relative',
        background: 'rgba(0, 0, 0, 0.25)',   // RG-04: was 0.10 — too transparent
        userSelect: 'none',
      }}
    >
      {!selecting && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.70)',
            color: '#fff',
            fontSize: 13,
            fontFamily: 'Segoe UI Variable, Segoe UI, system-ui, sans-serif',
            padding: '6px 16px',
            borderRadius: 6,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Drag to select region — Esc to cancel
        </div>
      )}

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
          {/* RG-02: flip label above box when near bottom of screen */}
          <div
            style={{
              position: 'absolute',
              ...(labelAbove ? { top: -22 } : { bottom: -22 }),
              left: 0,
              background: 'rgba(0,0,0,0.70)',
              color: '#fff',
              fontSize: 11,
              fontFamily: 'Cascadia Code, Consolas, monospace',
              padding: '2px 6px',
              borderRadius: 3,
              whiteSpace: 'nowrap',
            }}
          >
            {selectionRect.width} × {selectionRect.height}
          </div>
        </div>
      )}
    </div>
  );
}
