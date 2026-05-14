import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * D41\u2013D44 \u2014 Annotation editor  (src/annotation/App.tsx)
 *
 * Design goals:
 *   \u2022 Paint / Snipping-Tool quality \u2014 sub-frame pointer latency via
 *     requestAnimationFrame flushing, GPU compositing hints, CSS
 *     will-change:transform on the canvas wrapper.
 *   \u2022 EC-14: original JPEG is NEVER written. Canvas toJSON() goes to
 *     annotation_layers; composite PNG to images/annotated/.
 *   \u2022 Undo / redo: 20-step ring buffer (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z).
 *   \u2022 Stroke-quality: freehand uses fabric PencilBrush with width
 *     linearity off and smoothing on; arrows and shapes are vector
 *     Fabric objects so they scale cleanly.
 *   \u2022 Round-trip: on re-open, canvas.loadFromJSON restores all strokes.
 *   \u2022 OWASP PII: blur minimum 20 px enforced server-side in
 *     BlurRegionSchema; client shows a semi-transparent hatch preview.
 *
 * Keyboard shortcuts:
 *   V / Esc   \u2014 Select / cancel draw
 *   A         \u2014 Arrow
 *   T         \u2014 Text (IText, double-click to edit)
 *   H         \u2014 Highlight rectangle
 *   B         \u2014 Blur / PII region
 *   P         \u2014 Pen (freehand)
 *   Ctrl+Z    \u2014 Undo
 *   Ctrl+Y / Ctrl+Shift+Z  \u2014 Redo
 *   Delete / Backspace     \u2014 Delete selected
 *   Ctrl+S    \u2014 Save
 *   [  ]      \u2014 Decrease / increase stroke width
 *   1\u20136        \u2014 Colour presets
 */

declare global {
  // fabric 5.x ships its own UMD build that lands on window.fabric
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { fabric: any; }
}

// ─── Types ──────────────────────────────────────────────────────────────

interface AnnotationLoadPayload {
  captureId:   string;
  imageBase64: string;   // data:image/jpeg;base64,...
  width:       number;
  height:      number;
  /** Pre-existing annotation to restore (round-trip). */
  existingLayerJson?: object;
}

interface BlurRegion {
  x: number; y: number; width: number; height: number; blurRadius: number;
}

type Tool = 'select' | 'arrow' | 'text' | 'highlight' | 'blur' | 'pen';

// ─── Constants ──────────────────────────────────────────────────────────

const HISTORY_LIMIT  = 20;
const MIN_BLUR_PX    = 20;       // OWASP PII threshold
const CURSOR_MAP: Record<Tool, string> = {
  select:    'default',
  arrow:     'crosshair',
  text:      'text',
  highlight: 'crosshair',
  blur:      'crosshair',
  pen:       'crosshair',
};

// Fluent accent palette \u2014 order matches keyboard shortcut 1\u20136
const PALETTE = [
  { hex: '#FF3B30', name: 'Red' },
  { hex: '#0078D4', name: 'Blue' },
  { hex: '#34C759', name: 'Green' },
  { hex: '#FCE100', name: 'Yellow' },
  { hex: '#FF9F0A', name: 'Orange' },
  { hex: '#FFFFFF', name: 'White' },
] as const;

const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8, 12] as const;

// ─── Main component ─────────────────────────────────────────────────────

export function App(): JSX.Element {
  const canvasEl   = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabric     = useRef<any>(null);                // window.fabric once loaded
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canvas     = useRef<any>(null);               // fabric.Canvas instance
  const history    = useRef<string[]>([]);
  const historyIdx = useRef(-1);
  const isDrawingRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startPt    = useRef<{ x: number; y: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawShape  = useRef<any>(null);                // in-progress shape

  const [payload,      setPayload]      = useState<AnnotationLoadPayload | null>(null);
  const [activeTool,   setActiveTool]   = useState<Tool>('select');
  const [colour,       setColour]       = useState<string>(PALETTE[0]!.hex);
  const [strokeWidth,  setStrokeWidth]  = useState(3);
  const [fabricReady,  setFabricReady]  = useState(false);
  const [canvasReady,  setCanvasReady]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [statusMsg,    setStatusMsg]    = useState<{ text: string; ok: boolean } | null>(null);
  const [canUndo,      setCanUndo]      = useState(false);
  const [canRedo,      setCanRedo]      = useState(false);
  const [zoom,         setZoom]         = useState(1);

  // ── 1. Load Fabric.js (import or UMD fallback) ──────────────────────
  useEffect(() => {
    if (window.fabric) { fabric.current = window.fabric; setFabricReady(true); return; }
    import('fabric')
      .then((mod) => {
        // fabric 5 ships as { fabric: {...} } via ESM
        const f = (mod as unknown as { fabric?: unknown }).fabric ?? mod;
        window.fabric = f;
        fabric.current = f;
        setFabricReady(true);
      })
      .catch(() => {
        const s = document.createElement('script');
        s.src = './fabric.min.js';
        s.onload = () => { fabric.current = window.fabric; setFabricReady(true); };
        document.head.appendChild(s);
      });
  }, []);

  // ── 2. Subscribe to annotation:load (initial + re-open) ─────────────
  useEffect(() => {
    const api = window.evidexAPI as {
      events?: {
        onAnnotationLoad?: (h: (d: AnnotationLoadPayload) => void) => () => void;
      };
    } | undefined;
    const off = api?.events?.onAnnotationLoad?.((data) => {
      setPayload(data);
      setCanvasReady(false); // triggers canvas re-init
    });
    return off;
  }, []);

  // ── 3. Initialise / reinitialise canvas when payload changes ─────────
  useEffect(() => {
    if (!fabricReady || !payload || !canvasEl.current || !fabric.current) return;
    const F = fabric.current;

    // Dispose previous instance cleanly.
    if (canvas.current) {
      try { canvas.current.dispose(); } catch { /* ignore */ }
      canvas.current = null;
    }
    history.current    = [];
    historyIdx.current = -1;

    const c = new F.Canvas(canvasEl.current, {
      width:              payload.width,
      height:             payload.height,
      selection:          activeTool === 'select',
      preserveObjectStacking: true,
      enableRetinaScaling: true,
    });
    canvas.current = c;

    // GPU compositing hint \u2014 dramatically reduces paint jank on Retina.
    const upperCanvas = c.upperCanvasEl as HTMLCanvasElement | null;
    const lowerCanvas = c.lowerCanvasEl as HTMLCanvasElement | null;
    if (upperCanvas) upperCanvas.style.willChange = 'transform';
    if (lowerCanvas) lowerCanvas.style.willChange = 'transform';

    // Background image (non-interactive, EC-14 original-immutable).
    F.Image.fromURL(
      payload.imageBase64,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (img: any) => {
        img.set({ selectable: false, evented: false, left: 0, top: 0 });
        c.setBackgroundImage(img, c.renderAll.bind(c));

        // Restore existing annotation layer if present (round-trip).
        if (payload.existingLayerJson) {
          isRestoring = true;   // AN-01: suppress history entries during restore
          c.loadFromJSON(payload.existingLayerJson, () => {
            isRestoring = false;
            c.renderAll();
            snap(c);            // one clean baseline entry after restore
          });
        } else {
          snap(c);
        }
        setCanvasReady(true);
      },
      { crossOrigin: 'anonymous' }
    );

    // Undo history snapshotting.
    // AN-01: isRestoring flag prevents loadFromJSON's object:added events
    // from creating spurious history entries on round-trip re-open.
    let isRestoring = false;
    const snap = (cv: typeof c): void => {
      if (isRestoring) return;   // AN-01: skip during JSON restore
      const json  = JSON.stringify(cv.toJSON(['data']));
      const stack = history.current.slice(0, historyIdx.current + 1);
      if (stack.length >= HISTORY_LIMIT) stack.shift();
      stack.push(json);
      history.current    = stack;
      historyIdx.current = stack.length - 1;
      setCanUndo(historyIdx.current > 0);
      setCanRedo(false);
    };
    const onModified = (): void => snap(c);
    c.on('object:added',    onModified);
    c.on('object:modified', onModified);
    c.on('object:removed',  onModified);

    return () => {
      c.off('object:added',    onModified);
      c.off('object:modified', onModified);
      c.off('object:removed',  onModified);
      try { c.dispose(); } catch { /* ignore */ }
      canvas.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricReady, payload]);

  // ── 4. Tool / colour / strokeWidth sync ─────────────────────────────
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const F = fabric.current;
    c.isDrawingMode = activeTool === 'pen';
    c.selection     = activeTool === 'select';
    c.defaultCursor = CURSOR_MAP[activeTool];

    if (activeTool === 'pen' && F) {
      c.freeDrawingBrush         = new F.PencilBrush(c);
      c.freeDrawingBrush.color   = colour;
      c.freeDrawingBrush.width   = strokeWidth;
      // Quality tweaks for smoother strokes:
      c.freeDrawingBrush.decimate = 4;        // reduce node density
    }
  }, [activeTool, colour, strokeWidth]);

  // ── 5. Mouse-driven shape creation (arrow / highlight / blur) ────────
  useEffect(() => {
    const c = canvas.current;
    if (!c || !fabric.current) return;
    const F = fabric.current;

    if (!['arrow', 'highlight', 'blur'].includes(activeTool)) return;

    const onDown = (opt: { pointer: { x: number; y: number } }): void => {
      isDrawingRef.current = true;
      startPt.current      = { ...opt.pointer };
      c.selection          = false;

      if (activeTool === 'arrow') {
        const [line, tip] = makeArrow(F, opt.pointer, opt.pointer, colour, strokeWidth);
        drawShape.current = new F.Group([line, tip], {
          selectable: false, evented: false,
          data: { type: 'arrow' },
        });
        c.add(drawShape.current);
      } else if (activeTool === 'highlight') {
        drawShape.current = new F.Rect({
          left: opt.pointer.x, top: opt.pointer.y,
          width: 0, height: 0,
          fill: hexToRgba(colour, 0.28),
          stroke: colour, strokeWidth: 1.5,
          selectable: false, evented: false,
          data: { type: 'highlight' },
        });
        c.add(drawShape.current);
      } else { // blur
        drawShape.current = new F.Rect({
          left: opt.pointer.x, top: opt.pointer.y,
          width: 0, height: 0,
          fill: 'rgba(0,0,0,0)',
          stroke: '#FCE100', strokeWidth: 2,
          strokeDashArray: [8, 4],
          selectable: false, evented: false,
          data: { type: 'blurRegion' },
        });
        // Hatch fill via pattern for blur regions
        if (F.Pattern) {
          const patternCanvas = document.createElement('canvas');
          patternCanvas.width  = 10;
          patternCanvas.height = 10;
          const ctx = patternCanvas.getContext('2d')!;
          ctx.fillStyle = 'rgba(0,0,0,0.22)';
          ctx.fillRect(0, 0, 10, 10);
          ctx.strokeStyle = 'rgba(252,225,0,0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, 10); ctx.lineTo(10, 0);
          ctx.stroke();
          drawShape.current.set({
            fill: new F.Pattern({ source: patternCanvas }),
          });
        }
        c.add(drawShape.current);
      }
      c.renderAll();
    };

    const onMove = (opt: { pointer: { x: number; y: number } }): void => {
      if (!isDrawingRef.current || !startPt.current || !drawShape.current) return;
      const p  = opt.pointer;
      const sp = startPt.current;

      if (activeTool === 'arrow') {
        // Replace the group with a fresh one reflecting new endpoint.
        c.remove(drawShape.current);
        const [line, tip] = makeArrow(F, sp, p, colour, strokeWidth);
        drawShape.current = new F.Group([line, tip], {
          selectable: false, evented: false,
          data: { type: 'arrow' },
        });
        c.add(drawShape.current);
      } else {
        drawShape.current.set({
          left:   Math.min(sp.x, p.x),
          top:    Math.min(sp.y, p.y),
          width:  Math.abs(p.x - sp.x),
          height: Math.abs(p.y - sp.y),
        });
        drawShape.current.setCoords();
      }
      // Use requestAnimationFrame to throttle to display refresh rate.
      requestAnimationFrame(() => c.renderAll());
    };

    const onUp = (): void => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      if (!drawShape.current) return;
      const shape = drawShape.current;
      drawShape.current = null;

      const minSize = activeTool === 'arrow' ? 8 : 4;
      const bb = shape.getBoundingRect ? shape.getBoundingRect() : null;
      if (bb && bb.width < minSize && bb.height < minSize) {
        c.remove(shape);
      } else {
        // Make the shape selectable now that drawing is done.
        shape.set({ selectable: true, evented: true });
        c.setActiveObject(shape);
      }
      c.selection = activeTool === 'select';
      c.renderAll();
      // History snapshot via the existing object:added listener.
    };

    c.on('mouse:down', onDown);
    c.on('mouse:move', onMove);
    c.on('mouse:up',   onUp);

    return () => {
      c.off('mouse:down', onDown);
      c.off('mouse:move', onMove);
      c.off('mouse:up',   onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, colour, strokeWidth]);

  // ── 6. Text tool \u2014 click-to-place IText ──────────────────────────────
  useEffect(() => {
    const c = canvas.current;
    if (!c || !fabric.current || activeTool !== 'text') return;
    const F = fabric.current;

    const onClick = (opt: { pointer: { x: number; y: number } }): void => {
      // Don\u2019t create a new text if the user clicked an existing object.
      if (c.getActiveObject()) return;
      const t = new F.IText('', {
        left:            opt.pointer.x,
        top:             opt.pointer.y,
        fontSize:        18,
        fontFamily:      'Segoe UI Variable, Segoe UI, system-ui, sans-serif',
        fill:            colour,
        backgroundColor: 'rgba(0,0,0,0.50)',
        padding:         6,
        editable:        true,
        data:            { type: 'text' },
      });
      c.add(t);
      c.setActiveObject(t);
      t.enterEditing();
      c.renderAll();
    };

    c.on('mouse:down', onClick);
    return () => c.off('mouse:down', onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, colour]);

  // ── 7. Undo / redo helpers ───────────────────────────────────────────
  const undo = useCallback((): void => {
    const c = canvas.current;
    if (!c || historyIdx.current <= 0) return;
    historyIdx.current -= 1;
    const state = history.current[historyIdx.current];
    if (state) {
      c.loadFromJSON(JSON.parse(state), () => c.renderAll());
    }
    setCanUndo(historyIdx.current > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback((): void => {
    const c = canvas.current;
    if (!c || historyIdx.current >= history.current.length - 1) return;
    historyIdx.current += 1;
    const state = history.current[historyIdx.current];
    if (state) {
      c.loadFromJSON(JSON.parse(state), () => c.renderAll());
    }
    setCanUndo(true);
    setCanRedo(historyIdx.current < history.current.length - 1);
  }, []);

  const deleteSelected = useCallback((): void => {
    const c = canvas.current;
    if (!c) return;
    const active = c.getActiveObjects();
    if (!active.length) return;
    active.forEach((o: unknown) => c.remove(o));
    c.discardActiveObject();
    c.renderAll();
  }, []);

  // ── 8. Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      // Don\u2019t intercept while typing in an IText
      const target = e.target as HTMLElement;
      if (target.tagName === 'CANVAS' && (target as HTMLCanvasElement).dataset.fabricType === 'upper') {
        /* fabric upper canvas \u2014 let it through for IText */
      }

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if (ctrl && e.key === 's') { e.preventDefault(); void handleSave(); return; }

      // AN-03: guard Delete/Backspace against firing inside IText editor.
      if (['Delete', 'Backspace'].includes(e.key) && !ctrl) {
        const c = canvas.current;
        const activeObj = c?.getActiveObject();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (activeObj && (activeObj as any).isEditing) return;
        if (c && activeObj) { deleteSelected(); }
        return;
      }

      // Only intercept single-char shortcuts when NOT editing text.
      const activeObj = canvas.current?.getActiveObject();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (activeObj && (activeObj as any).isEditing) return;

      switch (e.key.toLowerCase()) {
        case 'v': case 'escape': setActiveTool('select'); break;
        case 'a': setActiveTool('arrow'); break;
        case 't': setActiveTool('text'); break;
        case 'h': setActiveTool('highlight'); break;
        case 'b': setActiveTool('blur'); break;
        case 'p': setActiveTool('pen'); break;
        case '[': setStrokeWidth((w) => Math.max(1, w - 1)); break;
        case ']': setStrokeWidth((w) => Math.min(12, w + 1)); break;
        case '1': setColour(PALETTE[0]!.hex); break;
        case '2': setColour(PALETTE[1]!.hex); break;
        case '3': setColour(PALETTE[2]!.hex); break;
        case '4': setColour(PALETTE[3]!.hex); break;
        case '5': setColour(PALETTE[4]!.hex); break;
        case '6': setColour(PALETTE[5]!.hex); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, deleteSelected]);

  // ── 9. Zoom ──────────────────────────────────────────────────────────
  const applyZoom = useCallback((z: number): void => {
    const c = canvas.current;
    if (!c) return;
    const clamped = Math.max(0.25, Math.min(4, z));
    const vp = c.viewportTransform;
    if (vp) {
      // Zoom from canvas centre.
      const cx = (c.getWidth()  / 2);
      const cy = (c.getHeight() / 2);
      c.zoomToPoint({ x: cx, y: cy }, clamped);
    }
    setZoom(clamped);
    c.renderAll();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const onWheel = (opt: { e: WheelEvent }): void => {
      const e = opt.e;
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      applyZoom(zoom * delta);
    };
    c.on('mouse:wheel', onWheel);
    return () => c.off('mouse:wheel', onWheel);
  }, [zoom, applyZoom]);

  // ── 10. Save handler ─────────────────────────────────────────────────
  async function handleSave(): Promise<void> {
    const c = canvas.current;
    if (!c || !payload) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      // Reset zoom before exporting so composite matches pixel coordinates.
      const savedZoom = zoom;
      applyZoom(1);
      c.setViewportTransform([1, 0, 0, 1, 0, 0]);

      // Collect blur regions from annotation objects.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blurRegions: BlurRegion[] = c.getObjects().reduce((acc: BlurRegion[], obj: any) => {
        if (obj?.data?.type === 'blurRegion') {
          const b = obj.getBoundingRect();
          acc.push({
            x: Math.round(b.left),
            y: Math.round(b.top),
            width:  Math.max(1, Math.round(b.width)),
            height: Math.max(1, Math.round(b.height)),
            blurRadius: MIN_BLUR_PX,
          });
        }
        return acc;
      }, []);

      const fabricJson   = c.toJSON(['data']);
      const compositeUrl = c.toDataURL({ format: 'png', multiplier: 1 });
      const compositeB64 = compositeUrl.replace(/^data:image\/\w+;base64,/, '');

      const api = window.evidexAPI as unknown as {
        capture?: {
          saveAnnotation?: (r: {
            captureId: string;
            fabricCanvasJson: object;
            compositeBuffer: string;
            blurRegions: BlurRegion[];
          }) => Promise<{ ok: boolean; error?: { message: string } }>;
        };
      } | undefined;

      const res = await api?.capture?.saveAnnotation?.({
        captureId:         payload.captureId,
        fabricCanvasJson:  fabricJson,
        compositeBuffer:   compositeB64,
        blurRegions,
      });

      if (res?.ok) {
        setStatusMsg({ text: 'Saved \u2713', ok: true });
        // Auto-dismiss after 3 s.
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        setStatusMsg({ text: `Error: ${res?.error?.message ?? 'unknown'}`, ok: false });
      }

      // Restore zoom.
      applyZoom(savedZoom);
    } catch (err) {
      setStatusMsg({
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        ok: false,
      });
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────

  if (!fabricReady || !payload) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>
          {!fabricReady ? 'Loading canvas engine\u2026' : 'Loading capture\u2026'}
        </p>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div style={styles.toolbar} role="toolbar" aria-label="Annotation tools">

        {/* Tool group */}
        <ToolGroup>
          {TOOLS.map(({ id, icon, label, key }) => (
            <ToolButton
              key={id}
              label={`${label} (${key})`}
              active={activeTool === id}
              onClick={() => setActiveTool(id as Tool)}
            >
              {icon}
            </ToolButton>
          ))}
        </ToolGroup>

        <ToolbarDivider />

        {/* Colour palette */}
        <ToolGroup aria-label="Colour">
          {PALETTE.map((p, i) => (
            <button
              key={p.hex}
              type="button"
              title={`${p.name} (${i + 1})`}
              aria-label={p.name}
              aria-pressed={colour === p.hex}
              onClick={() => setColour(p.hex)}
              style={{
                ...styles.swatch,
                background: p.hex,
                outline: colour === p.hex
                  ? `2px solid var(--color-text-primary, #fff)`
                  : '2px solid transparent',
                outlineOffset: 2,
              }}
            />
          ))}
        </ToolGroup>

        <ToolbarDivider />

        {/* Stroke width */}
        <ToolGroup aria-label="Stroke width">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              title={`${w}px`}
              aria-label={`Stroke ${w}px`}
              aria-pressed={strokeWidth === w}
              onClick={() => setStrokeWidth(w)}
              style={{
                ...styles.strokeBtn,
                background: strokeWidth === w ? 'var(--color-fill-secondary, rgba(255,255,255,0.15))' : 'transparent',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: 20,
                  height: w,
                  borderRadius: w / 2,
                  background: colour,
                  flexShrink: 0,
                }}
              />
            </button>
          ))}
        </ToolGroup>

        <ToolbarDivider />

        {/* Undo / Redo / Delete */}
        <ToolGroup>
          <ToolButton label="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
            \u21a9
          </ToolButton>
          <ToolButton label="Redo (Ctrl+Y)" disabled={!canRedo} onClick={redo}>
            \u21aa
          </ToolButton>
          <ToolButton label="Delete selected (Del)" onClick={deleteSelected}>
            {'\u{1F5D1}'}
          </ToolButton>
        </ToolGroup>

        <ToolbarDivider />

        {/* Zoom */}
        <ToolGroup aria-label="Zoom">
          <ToolButton label="Zoom out (Ctrl+scroll)" onClick={() => applyZoom(zoom / 1.25)}>\u2212</ToolButton>
          <span style={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
          <ToolButton label="Zoom in (Ctrl+scroll)"  onClick={() => applyZoom(zoom * 1.25)}>+</ToolButton>
          <ToolButton label="Reset zoom" onClick={() => applyZoom(1)}>1:1</ToolButton>
        </ToolGroup>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Status + Save */}
        {statusMsg && (
          <span
            style={{
              fontSize: 12,
              fontFamily: 'Segoe UI Variable, Segoe UI, sans-serif',
              color: statusMsg.ok ? '#6CCB5F' : '#FF99A4',
              padding: '0 8px',
              flexShrink: 0,
            }}
          >
            {statusMsg.text}
          </span>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !canvasReady}
          style={{
            ...styles.saveBtn,
            opacity: saving || !canvasReady ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving\u2026' : 'Save annotation'}
        </button>
      </div>

      {/* ── Canvas area ─────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          background: 'var(--color-layer-0, #111)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: 24,
          cursor: CURSOR_MAP[activeTool],
          // Smooth scroll on touchpad
          scrollBehavior: 'smooth',
        }}
      >
        <div
          style={{
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            borderRadius: 4,
            overflow: 'hidden',
            flexShrink: 0,
            willChange: 'transform',
          }}
        >
          <canvas ref={canvasEl} style={{ display: 'block' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Tool definitions ────────────────────────────────────────────────────

const TOOLS: { id: Tool; icon: string; label: string; key: string }[] = [
  { id: 'select',    icon: '\u2b0f', label: 'Select',    key: 'V' },
  { id: 'arrow',     icon: '\u2197', label: 'Arrow',     key: 'A' },
  { id: 'text',      icon: 'T',      label: 'Text',      key: 'T' },
  { id: 'highlight', icon: '\u25ad', label: 'Highlight', key: 'H' },
  { id: 'blur',      icon: '\u{1F512}', label: 'Blur PII',  key: 'B' },
  { id: 'pen',       icon: '\u270f', label: 'Pen',       key: 'P' },
];

// ─── Arrow factory (two-object: Line + Triangle) ─────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeArrow(
  F: any,
  from: { x: number; y: number },
  to: { x: number; y: number },
  stroke: string,
  width: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): [any, any] {
  const dx     = to.x - from.x;
  const dy     = to.y - from.y;
  const angle  = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  const tipLen = width * 4 + 8;

  const line = new F.Line(
    [from.x, from.y, to.x, to.y],
    { stroke, strokeWidth: width, selectable: false, evented: false }
  );
  const tip = new F.Triangle({
    width:  tipLen,
    height: tipLen,
    fill:   stroke,
    left:   to.x,
    top:    to.y,
    angle,
    selectable: false,
    evented: false,
    originX: 'center',
    originY: 'center',
  });
  return [line, tip];
}

// ─── Colour helpers ──────────────────────────────────────────────────────

function hexToRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ─── Sub-components ──────────────────────────────────────────────────────

function ToolGroup({
  children,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  'aria-label'?: string;
}): JSX.Element {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{ display: 'flex', alignItems: 'center', gap: 2 }}
    >
      {children}
    </div>
  );
}

function ToolbarDivider(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }}
    />
  );
}

function ToolButton({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?:   boolean;
  disabled?: boolean;
  onClick?:  () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        width:  32,
        height: 32,
        border:         '1px solid transparent',
        borderRadius:   4,
        background:     active
          ? 'var(--color-accent-default, #60CDFF)'
          : 'rgba(255,255,255,0.06)',
        color:          active ? '#000' : 'rgba(255,255,255,0.88)',
        cursor:         disabled ? 'not-allowed' : 'pointer',
        fontSize:       15,
        opacity:        disabled ? 0.4 : 1,
        transition:     'background 100ms, border-color 100ms',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
        }
      }}
    >
      {children}
    </button>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    display:        'flex',
    flexDirection:  'column',
    height:         '100vh',
    background:     '#111',
    overflow:       'hidden',
    fontFamily:     'Segoe UI Variable, Segoe UI, system-ui, sans-serif',
  },

  loading: {
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  'center',
    height:          '100vh',
    gap:             16,
    background:      '#111',
  },

  spinner: {
    width:        32,
    height:       32,
    border:       '3px solid rgba(255,255,255,0.12)',
    borderTop:    '3px solid rgba(96,205,255,0.8)',
    borderRadius: '50%',
    animation:    'annotation-spin 0.8s linear infinite',
  },

  loadingText: {
    color:      'rgba(255,255,255,0.45)',
    fontSize:   13,
    fontFamily: 'Segoe UI Variable, Segoe UI, system-ui, sans-serif',
  },

  toolbar: {
    display:        'flex',
    alignItems:     'center',
    gap:            4,
    flexShrink:     0,
    padding:        '0 10px',
    height:         48,
    background:     'var(--color-layer-1, #2a2a2a)',
    borderBottom:   '1px solid rgba(255,255,255,0.07)',
    overflow:       'hidden',
    userSelect:     'none',
    // Subtle acrylic
    backdropFilter: 'blur(12px)',
  },

  swatch: {
    width:        18,
    height:       18,
    borderRadius: '50%',
    cursor:       'pointer',
    border:       'none',
    flexShrink:   0,
    transition:   'outline 80ms',
  },

  strokeBtn: {
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    width:  28,
    height: 28,
    border:         '1px solid transparent',
    borderRadius:   4,
    cursor:         'pointer',
    padding:        0,
    transition:     'background 80ms',
  },

  zoomLabel: {
    fontSize:    11,
    fontFamily:  'Cascadia Code, Consolas, monospace',
    color:       'rgba(255,255,255,0.5)',
    padding:     '0 4px',
    minWidth:    36,
    textAlign:   'center',
  },

  saveBtn: {
    height:       32,
    padding:      '0 16px',
    background:   'var(--color-accent-default, #0078D4)',
    color:        '#fff',
    border:       'none',
    borderRadius: 6,
    cursor:       'pointer',
    fontSize:     13,
    fontWeight:   600,
    fontFamily:   'Segoe UI Variable, Segoe UI, system-ui, sans-serif',
    whiteSpace:   'nowrap',
    transition:   'opacity 100ms',
    flexShrink:   0,
  },
};

// Inject spinner keyframes once.
if (typeof document !== 'undefined') {
  const styleId = 'annotation-spin-kf';
  if (!document.getElementById(styleId)) {
    const tag = document.createElement('style');
    tag.id = styleId;
    tag.textContent = `@keyframes annotation-spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(tag);
  }
}
