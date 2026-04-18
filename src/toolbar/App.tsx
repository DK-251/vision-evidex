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
    </div>
  );
}
