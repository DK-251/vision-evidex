/**
 * Annotation editor — Fabric.js 5.3.0 canvas with toolbar: arrows, text,
 * highlights, step numbers, freehand blur, rectangular blur. Layer is
 * saved as FabricCanvasJSON in the annotation_layers SQLite table;
 * composite JPEG 90% is written to images/annotated/ inside .evidex.
 * Originals are NEVER overwritten (Architectural Rule 6 adjacent).
 * Phase 2 Week 9 implementation.
 */
export function App(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-primary text-text-primary">
      <p className="text-sm text-text-secondary">Annotation editor — Phase 2 Week 9 stub</p>
    </div>
  );
}
