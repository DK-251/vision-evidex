import { useState } from 'react';
import { useOnboardingStore } from '../stores/onboarding-store';

/**
 * Step 1 — Licence activation (keygen mode only).
 *
 * Per Tech Spec, this component must never render in no-licence mode.
 * The wizard's store already filters the step out when `mode === 'none'`;
 * the runtime guard below is the belt-and-braces safety for cases where
 * a caller constructs this component directly.
 */
export function LicenceStep(): JSX.Element | null {
  const mode = useOnboardingStore((s) => s.mode);
  const setStepData = useOnboardingStore((s) => s.setStepData);

  const [licenceKey, setLicenceKey] = useState('');
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'submitting' }
    | { kind: 'error'; message: string }
    | { kind: 'activated'; masked: string; activatedAt: string }
  >({ kind: 'idle' });

  if (mode === 'none') return null;

  async function activate() {
    const trimmed = licenceKey.trim();
    if (trimmed.length === 0) {
      setState({ kind: 'error', message: 'Licence key is required.' });
      return;
    }
    setState({ kind: 'submitting' });
    const result = await window.evidexAPI.licence.activate({ licenceKey: trimmed });
    if (!result.ok) {
      setState({ kind: 'error', message: result.error.message });
      return;
    }
    const data = result.data;
    if (!data.success) {
      setState({ kind: 'error', message: data.reason ?? 'Activation rejected.' });
      return;
    }
    const last4 = trimmed.slice(-4).toUpperCase();
    const masked = `****-****-****-${last4}`;
    const activatedAt = data.licenceInfo?.activatedAt ?? new Date().toISOString();
    setStepData('licence', { masked, activatedAt });
    setState({ kind: 'activated', masked, activatedAt });
  }

  if (state.kind === 'activated') {
    return (
      <div className="text-sm text-text-secondary">
        <p>Licence activated.</p>
        <dl className="mt-3 space-y-1 text-text-primary">
          <div className="flex justify-between">
            <dt>Key</dt>
            <dd className="font-mono">{state.masked}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Activated</dt>
            <dd className="font-mono">{state.activatedAt.slice(0, 10)}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="text-text-secondary">Licence key</span>
        <input
          type="text"
          value={licenceKey}
          onChange={(e) => setLicenceKey(e.target.value)}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className="mt-1 w-full rounded-md border border-border-subtle px-3 py-2 font-mono text-text-primary"
          disabled={state.kind === 'submitting'}
        />
      </label>
      {state.kind === 'error' && (
        <p className="text-sm text-accent-error" role="alert">
          {state.message}
        </p>
      )}
      <button
        type="button"
        onClick={activate}
        disabled={state.kind === 'submitting' || licenceKey.trim().length === 0}
        className="px-4 py-2 rounded-md bg-accent-primary text-white disabled:opacity-50"
      >
        {state.kind === 'submitting' ? 'Activating…' : 'Activate'}
      </button>
    </div>
  );
}
