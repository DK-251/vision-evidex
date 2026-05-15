import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * D34 — Region capture overlay.
 *
 * §14 redesign: Windows Snipping Tool-style overlay.
 * - Full-screen dark semi-transparent canvas.
 * - When user drags, the selected rectangle is CLEARED from the canvas
 *   using globalCompositeOperation = 'destination-out', revealing the
 *   actual screen underneath — identical to Windows Snipping Tool.
 * - Dimension label renders above the selection, flips below near the
 *   top edge.
 *
 * RG-01: uses window.evidexAPI.region.sendSelected / sendCancel.
 * RG-02: dimension label flips.
 * RG-04: overlay opacity 40% (was 10%, then 25% — now 40% for Snipping-Tool feel).
 * RG-05: touch support.
 */

interface Rect { x: number; y: number; width: number; height: number }

interface RegionAPI {
  sendSelected: (rect: Rect) => void;
  sendCancel:   () => void;
}

function getRegionAPI(): RegionAPI | null {
  const api = (window as Window & { evidexAPI?: { region?: RegionAPI } }).evidexAPI;
  return api?.region ?? null;
}

const OVERLAY_ALPHA = 0.55; // same feel as Windows Snipping Tool

export function App(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [start,     setStart]     = useState<{ x: number; y: number } | null>(null);
  const [current,   setCurrent]   = useState<{ x: number; y: number } | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [ready,     setReady]     = useState(false);

  // Size canvas to full window on mount and resize.
  useEffect(() => {
    function resize(): void {
      const c = canvasRef.current;
      if (!c) return;
      c.width  = window.innerWidth;
      c.height = window.innerHeight;
      setReady(true);
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Draw overlay + cut-out on every mouse move.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !ready) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, c.width, c.height);

    // Fill entire canvas with dark overlay.
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0, 0, 0, ${OVERLAY_ALPHA})`;
    ctx.fillRect(0, 0, c.width, c.height);

    if (!selecting || !start || !current) return;

    const x = Math.min(start.x, current.x);
    const y = Math.min(start.y, current.y);
    const w = Math.abs(current.x - start.x);
    const h = Math.abs(current.y - start.y);
    if (w < 2 || h < 2) return;

    // Cut the selection out of the overlay — reveals screen below.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(x, y, w, h);

    // Draw selection border on top.
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#60CDFF';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(x, y, w, h);

    // Corner handles for precision feedback.
    const HANDLE = 8;
    const corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]] as const;
    ctx.fillStyle = '#60CDFF';
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx - HANDLE / 2, cy - HANDLE / 2, HANDLE, HANDLE);
    }

    // Dimension label — flip above selection near screen bottom (RG-02).
    const label = `${w} × ${h}`;
    ctx.font = '12px "Cascadia Code", Consolas, monospace';
    const metrics = ctx.measureText(label);
    const labelW  = metrics.width + 12;
    const labelH  = 22;
    const labelX  = x + (w - labelW) / 2;
    const labelAbove = (y + h) > c.height - 40;
    const labelY  = labelAbove ? y - labelH - 4 : y + h + 4;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect?.(labelX, labelY, labelW, labelH, 4) ??
      ctx.fillRect(labelX, labelY, labelW, labelH);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, labelX + 6, labelY + 15);
  }, [start, current, selecting, ready]);

  const sendResult = useCallback((rect: Rect) => {
    getRegionAPI()?.sendSelected(rect);
  }, []);

  const sendCancel = useCallback(() => {
    getRegionAPI()?.sendCancel();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => { if (e.key === 'Escape') sendCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sendCancel]);

  function getCoords(e: React.MouseEvent | MouseEvent): { x: number; y: number } {
    return { x: e.clientX, y: e.clientY };
  }

  function onMouseDown(e: React.MouseEvent): void {
    const pt = getCoords(e);
    setStart(pt); setCurrent(pt); setSelecting(true);
  }
  function onMouseMove(e: React.MouseEvent): void {
    if (!selecting) return;
    setCurrent(getCoords(e));
  }
  function onMouseUp(e: React.MouseEvent): void {
    if (!selecting || !start) return;
    setSelecting(false);
    const x = Math.min(start.x, e.clientX);
    const y = Math.min(start.y, e.clientY);
    const w = Math.abs(e.clientX - start.x);
    const h = Math.abs(e.clientY - start.y);
    if (w < 8 || h < 8) { setStart(null); setCurrent(null); return; }
    sendResult({ x, y, width: w, height: h });
  }

  // Touch (RG-05)
  function onTouchStart(e: React.TouchEvent): void {
    const t = e.touches[0]; if (!t) return;
    setStart({ x: t.clientX, y: t.clientY });
    setCurrent({ x: t.clientX, y: t.clientY });
    setSelecting(true);
  }
  function onTouchMove(e: React.TouchEvent): void {
    if (!selecting) return;
    const t = e.touches[0]; if (!t) return;
    setCurrent({ x: t.clientX, y: t.clientY });
  }
  function onTouchEnd(e: React.TouchEvent): void {
    if (!selecting || !start) return;
    const t = e.changedTouches[0]; if (!t) return;
    setSelecting(false);
    const x = Math.min(start.x, t.clientX);
    const y = Math.min(start.y, t.clientY);
    const w = Math.abs(t.clientX - start.x);
    const h = Math.abs(t.clientY - start.y);
    if (w < 8 || h < 8) { setStart(null); setCurrent(null); return; }
    sendResult({ x, y, width: w, height: h });
  }

  return (
    <>
      {/* Instruction label — only when not selecting */}
      {!selecting && (
        <div style={{
          position:    'fixed',
          top:         24,
          left:        '50%',
          transform:   'translateX(-50%)',
          background:  'rgba(0,0,0,0.75)',
          color:       '#fff',
          fontSize:    13,
          fontFamily:  'Segoe UI Variable, Segoe UI, system-ui, sans-serif',
          padding:     '6px 18px',
          borderRadius: 6,
          pointerEvents: 'none',
          whiteSpace:  'nowrap',
          zIndex:      10,
        }}>
          Drag to select region — Esc to cancel
        </div>
      )}

      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position:    'fixed',
          inset:       0,
          cursor:      'crosshair',
          userSelect:  'none',
          display:     'block',
        }}
      />
    </>
  );
}
