/**
 * Capture toolbar — frameless, always-on-top, content-protected floating
 * window. Holds session status, hotkey triggers, capture counter, and
 * tag buttons. Phase 2 Week 7 implementation.
 */
export function App(): JSX.Element {
  return (
    <div
      className="h-full w-full flex items-center px-4 gap-3 text-text-primary"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'var(--glass-blur)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <span className="text-sm font-medium">Vision-EviDex</span>
      <span className="text-xs text-text-secondary">toolbar — Phase 2 stub</span>
    </div>
  );
}
