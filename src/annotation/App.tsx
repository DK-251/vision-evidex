import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * D41\u2013D44 \u2014 Annotation editor (src/annotation/App.tsx).
 *
 * Separate Electron BrowserWindow (1200\u00d7820). Receives a capture image
 * as base64 from the main process via preload, renders it on a Fabric.js
 * canvas, and supports 4 drawing tools plus a PII blur placeholder.
 *
 * On save:
 *  - canvas.toJSON()  \u2192 stored in annotation_layers SQLite (EC-14)
 *  - canvas.toDataURL('image/png') \u2192 composite PNG sent to main via IPC
 *    where sharp composites it over the original JPEG (original NEVER modified)
 *
 * Undo/redo: 20-step history stack (Ctrl+Z / Ctrl+Y).
 * fabric@5.3.0 exact pin \u2014 fabricVersion stored per annotation layer.
 * OWASP PII: blur radius minimum 20 px enforced in BlurRegionSchema.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { fabric: any; }
}

interface AnnotationLoadPayload {
  captureId:   string;
  imageBase64: string;   // data:image/jpeg;base64,...
  width:       number;
  height:      number;
}

interface BlurRegion {
  x: number; y: number; width: number; height: number; blurRadius: number;
}

type Tool = 'select' | 'arrow' | 'text' | 'highlight' | 'blur';

const TOOL_COLOURS  = ['#FF3B30', '#0078D4', '#34C759', '#FFD60A', '#FF9F0A', '#FFFFFF'];
const MIN_BLUR_PX   = 20; // OWASP PII threshold

export function App(): JSX.Element {
  const canvasEl    = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef   = useRef<any>(null);
  const historyRef  = useRef<string[]>([]);
  const historyIdx  = useRef(-1);

  const [payload,     setPayload]     = useState<AnnotationLoadPayload | null>(null);
  const [activeTool,  setActiveTool]  = useState<Tool>('select');
  const [colour,      setColour]      = useState(TOOL_COLOURS[0]!);
  const [saving,      setSaving]      = useState(false);
  const [statusMsg,   setStatusMsg]   = useState('');
  const [fabricReady, setFabricReady] = useState(typeof window !== 'undefined' && !!window.fabric);

  // ── Load Fabric.js if not already present ───────────────────────────
  useEffect(() => {
    if (window.fabric) { setFabricReady(true); return; }
    // Fabric is bundled as a prod dep and available at runtime in the
    // packaged app. In dev mode Vite exposes it through the window global
    // via the preload or the src/annotation/main.tsx entry point which
    // imports 'fabric/dist/fabric.min.js'.
    import('fabric').then((mod) => {
      window.fabric = (mod as { fabric?: unknown }).fabric ?? mod;
      setFabricReady(true);
    }).catch(() => {
      // Fallback: dynamically inject the bundled script.
      const s = document.createElement('script');
      s.src = './fabric.min.js';
      s.onload = () => setFabricReady(true);
      document.head.appendChild(s);
    });
  }, []);

  // ── Subscribe to annotation:load from the main process ──────────────
  useEffect(() => {
    const api = window.evidexAPI as {
      events?: { onAnnotationLoad?: (h: (d: AnnotationLoadPayload) => void) => () => void };
    } | undefined;
    const off = api?.events?.onAnnotationLoad?.((data) => setPayload(data));
    return off;
  }, []);

  // ── Initialise Fabric canvas once ready ─────────────────────────────
  useEffect(() => {
    if (!fabricReady || !payload || !canvasEl.current) return;
    const { fabric } = window;

    const canvas = new fabric.Canvas(canvasEl.current, {
      width:     payload.width,
      height:    payload.height,
      selection: activeTool === 'select',
    });
    fabricRef.current = canvas;

    // Background image — non-interactive (EC-14: original preserved).
    fabric.Image.fromURL(payload.imageBase64, (img: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (img as any).set({ selectable: false, evented: false, left: 0, top: 0 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.setBackgroundImage(img, (canvas as any).renderAll.bind(canvas));
    });

    // Undo history snapshots.
    const snap = (): void => {
      const json  = JSON.stringify(canvas.toJSON(['data']));
      const stack = historyRef.current.slice(0, historyIdx.current + 1);
      if (stack.length >= 20) stack.shift();
      stack.push(json);
      historyRef.current = stack;
      historyIdx.current = stack.length - 1;
    };
    canvas.on('object:added',    snap);
    canvas.on('object:modified', snap);
    canvas.on('object:removed',  snap);
    snap();

    return () => { canvas.dispose(); fabricRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricReady, payload]);

  // ── Tool mode changes ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.isDrawingMode = false;
    canvas.selection     = activeTool === 'select';
    if (activeTool === 'blur') {
      canvas.isDrawingMode            = true;
      canvas.freeDrawingBrush.color   = 'rgba(0,0,0,0.01)';
      canvas.freeDrawingBrush.width   = 1;
    }
  }, [activeTool]);

  // ── Add object helpers ───────────────────────────────────────────────
  const addArrow = useCallback((c: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { fabric } = window;
    const line = new fabric.Line([80, 180, 200, 80], { stroke: c, strokeWidth: 3, selectable: true });
    const tip  = new fabric.Triangle({ width: 14, height: 14, fill: c, left: 194, top: 68, angle: 45 });
    const grp  = new fabric.Group([line, tip], { selectable: true });
    canvas.add(grp);
    canvas.setActiveObject(grp);
    canvas.renderAll();
  }, []);

  const addText = useCallback((c: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { fabric } = window;
    const t = new fabric.IText('Type annotation', {
      left: 80, top: 80, fontSize: 16, fill: c,
      backgroundColor: 'rgba(0,0,0,0.55)', padding: 4,
    });
    canvas.add(t);
    canvas.setActiveObject(t);
    t.enterEditing();
    canvas.renderAll();
  }, []);

  const addHighlight = useCallback((c: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { fabric } = window;
    const rgba = c.startsWith('#')
      ? hexToRgba(c, 0.35)
      : c.replace('rgb(', 'rgba(').replace(')', ', 0.35)');
    const r = new fabric.Rect({ left: 80, top: 80, width: 200, height: 80, fill: rgba, stroke: c, strokeWidth: 1 });
    canvas.add(r);
    canvas.setActiveObject(r);
    canvas.renderAll();
  }, []);

  const addBlur = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { fabric } = window;
    // Visual placeholder \u2014 actual blur applied by sharp in main process.
    const r = new fabric.Rect({
      left: 80, top: 80, width: 160, height: 80,
      fill: 'rgba(0,0,0,0.38)', stroke: '#FCE100', strokeWidth: 2,
      strokeDashArray: [6, 3], selectable: true,
      data: { type: 'blurRegion' },
    });
    canvas.add(r);
    canvas.setActiveObject(r);
    canvas.renderAll();
  }, []);

  // ── Tool click dispatcher ────────────────────────────────────────────
  function handleToolClick(tool: Tool): void {
    setActiveTool(tool);
    if (tool === 'arrow')     addArrow(colour);
    if (tool === 'text')      addText(colour);
    if (tool === 'highlight') addHighlight(colour);
    if (tool === 'blur')      addBlur();
  }

  // ── Undo / Redo ──────────────────────────────────────────────────────
  function undo(): void {
    const canvas = fabricRef.current;
    if (!canvas || historyIdx.current <= 0) return;
    historyIdx.current -= 1;
    const state = historyRef.current[historyIdx.current];
    if (state) canvas.loadFromJSON(JSON.parse(state), () => canvas.renderAll());
  }
  function redo(): void {
    const canvas = fabricRef.current;
    if (!canvas || historyIdx.current >= historyRef.current.length - 1) return;
    historyIdx.current += 1;
    const state = historyRef.current[historyIdx.current];
    if (state) canvas.loadFromJSON(JSON.parse(state), () => canvas.renderAll());
  }

  // Keyboard shortcuts.
  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  // ── Save ─────────────────────────────────────────────────────────────
  async function handleSave(): Promise<void> {
    const canvas = fabricRef.current;
    if (!canvas || !payload) return;
    setSaving(true);
    setStatusMsg('Saving\u2026');
    try {
      // Collect blur region boxes.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blurRegions: BlurRegion[] = canvas.getObjects().reduce((acc: BlurRegion[], obj: any) => {
        if (obj?.data?.type === 'blurRegion') {
          const b = obj.getBoundingRect();
          acc.push({ x: Math.round(b.left), y: Math.round(b.top), width: Math.round(b.width), height: Math.round(b.height), blurRadius: MIN_BLUR_PX });
        }
        return acc;
      }, []);

      const fabricJson = canvas.toJSON(['data']);
      // Composite: canvas rendered to PNG (background image + annotations).
      const composite  = canvas.toDataURL({ format: 'png', multiplier: 1 });
      // Buffer is transferred as a base64 string; main process decodes it.
      const base64Buf  = composite.replace(/^data:image\/\w+;base64,/, '');

      const api = window.evidexAPI as unknown as {
        capture?: { saveAnnotation?: (r: {
          captureId: string;
          fabricCanvasJson: object;
          compositeBuffer: string;
          blurRegions: BlurRegion[];
        }) => Promise<{ ok: boolean; error?: { message: string } }> };
      } | undefined;

      const res = await api?.capture?.saveAnnotation?.({
        captureId:       payload.captureId,
        fabricCanvasJson: fabricJson,
        compositeBuffer: base64Buf,
        blurRegions,
      });

      setStatusMsg(res?.ok ? 'Saved \u2713' : `Error: ${res?.error?.message ?? 'unknown'}`);
    } catch (err) {
      setStatusMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────
  if (!fabricReady || !payload) {
    return (
      <div style={centreStyle}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'Segoe UI Variable, Segoe UI, system-ui, sans-serif' }}>
          {!fabricReady ? 'Loading canvas\u2026' : 'Waiting for capture image\u2026'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a1a' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
        background: '#2C2C2C', borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* Tool buttons */}
        {([
          { tool: 'select' as Tool,    label: '\u2196 Select' },
          { tool: 'arrow'  as Tool,    label: '\u2197 Arrow' },
          { tool: 'text'   as Tool,    label: 'T  Text' },
          { tool: 'highlight' as Tool, label: '\u25ad Highlight' },
          { tool: 'blur'   as Tool,    label: '\u2295 Blur PII' },
        ]).map(({ tool, label }) => (
          <button key={tool} type="button" onClick={() => handleToolClick(tool)} style={{
            ...toolBtn,
            background: activeTool === tool ? 'var(--color-accent-default, #60CDFF)' : 'rgba(255,255,255,0.08)',
            color:      activeTool === tool ? '#000' : 'rgba(255,255,255,0.9)',
          }}>
            {label}
          </button>
        ))}

        <div style={divider} />

        {/* Colour swatches */}
        {TOOL_COLOURS.map((c) => (
          <button key={c} type="button" onClick={() => setColour(c)} style={{
            width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer',
            border: colour === c ? '2px solid #fff' : '2px solid transparent', flexShrink: 0,
          }} />
        ))}

        <div style={divider} />

        {/* Undo / Redo */}
        <button type="button" onClick={undo} style={toolBtn} title="Undo (Ctrl+Z)">\u21a9</button>
        <button type="button" onClick={redo} style={toolBtn} title="Redo (Ctrl+Y)">\u21aa</button>

        <div style={{ flex: 1 }} />

        {statusMsg && (
          <span style={{ fontSize: 12, color: statusMsg.startsWith('Error') ? '#FF99A4' : '#6CCB5F' }}>
            {statusMsg}
          </span>
        )}

        <button type="button" onClick={() => void handleSave()} disabled={saving} style={{
          ...toolBtn,
          background: saving ? 'rgba(255,255,255,0.05)' : 'rgba(0,120,212,0.6)',
          padding: '4px 14px', fontWeight: 600,
        }}>
          {saving ? 'Saving\u2026' : 'Save annotation'}
        </button>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', alignItems: 'flex-start' }}>
        <canvas ref={canvasEl} />
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

function hexToRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const centreStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  height: '100vh', background: '#1a1a1a',
};

const toolBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 4, color: 'rgba(255,255,255,0.9)',
  cursor: 'pointer', fontSize: 12, padding: '4px 8px',
  whiteSpace: 'nowrap', flexShrink: 0,
};

const divider: React.CSSProperties = {
  width: 1, height: 22, background: 'rgba(255,255,255,0.15)', flexShrink: 0,
};
