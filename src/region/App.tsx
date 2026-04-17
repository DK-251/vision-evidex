/**
 * Region selector overlay — fullscreen transparent window for rubber-band
 * region capture. Returns a ScreenRegion {x,y,width,height} to the main
 * process via IPC. Multimonitor: spans primary display; Phase 2 Week 7
 * handles virtual-screen bounding. Minimum region size: 10x10 px.
 * Phase 2 Week 7 implementation.
 */
export function App(): JSX.Element {
  return (
    <div
      className="w-screen h-screen cursor-crosshair"
      style={{ background: 'rgba(0, 0, 0, 0.08)' }}
    >
      {/* drag-to-select rectangle overlay — Phase 2 Week 7 */}
    </div>
  );
}
