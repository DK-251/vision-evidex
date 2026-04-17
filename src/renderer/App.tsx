import { useEffect, useState } from 'react';

/**
 * Main window root. Phase 0 stub — renders a placeholder card confirming
 * the shell boots, IPC bridge is wired, and design tokens resolve.
 * Real routing + page shell lands in Phase 1 Week 5 (Onboarding) and
 * Week 5 end (Dashboard).
 */
export function App(): JSX.Element {
  const [licenceStatus, setLicenceStatus] = useState<string>('checking…');

  useEffect(() => {
    let cancelled = false;
    window.evidexAPI.licence
      .validate()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setLicenceStatus(result.data.valid ? 'valid' : `invalid: ${result.data.reason ?? 'unknown'}`);
        } else {
          setLicenceStatus(`error: ${result.error.code}`);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLicenceStatus(`exception: ${err instanceof Error ? err.message : String(err)}`);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-primary">
      <div
        className="max-w-md w-full p-8 rounded-lg"
        style={{ boxShadow: 'var(--shadow-neumorphic-out)' }}
      >
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Vision-EviDex</h1>
        <p className="text-sm text-text-secondary mb-6">
          Phase 0 scaffold. The shell boots, IPC bridge is wired, design tokens resolve.
        </p>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-secondary">Licence</dt>
            <dd className="text-text-primary font-mono">{licenceStatus}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Phase</dt>
            <dd className="text-text-primary">0 — scaffold</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
