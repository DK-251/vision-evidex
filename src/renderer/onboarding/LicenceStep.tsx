import { useState } from 'react';
import {
  KeyRegular,
  CheckmarkCircleFilled,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import { useOnboardingStore } from '../stores/onboarding-store';
import { Button } from '../components/ui';
import { StepLayout } from './StepLayout';

/**
 * Step 2 — Licence activation (keygen mode only).
 *
 * Verify button triggers `licence.activate`; success unlocks the outer
 * Next button via `setStepData('licence', { verified: true })`. Until
 * the key is verified the outer wizard's Next is disabled — see
 * validators.ts `isValidLicence`.
 */

interface LicenceStepData {
  key?: string;
  masked?: string;
  activatedAt?: string;
  verified?: boolean;
}

export function LicenceStep(): JSX.Element | null {
  const mode = useOnboardingStore((s) => s.mode);
  const saved = useOnboardingStore(
    (s) => (s.data['licence'] as LicenceStepData | undefined) ?? {}
  );
  const setStepData = useOnboardingStore((s) => s.setStepData);

  const [key, setKey] = useState<string>(saved.key ?? '');
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'verifying' }
    | { kind: 'ok'; masked: string }
    | { kind: 'error'; message: string }
  >(saved.verified && saved.masked ? { kind: 'ok', masked: saved.masked } : { kind: 'idle' });

  if (mode === 'none') return null;

  async function verify(): Promise<void> {
    const trimmed = key.trim();
    if (trimmed.length < 10) {
      setStatus({ kind: 'error', message: 'Licence key looks too short.' });
      return;
    }
    setStatus({ kind: 'verifying' });
    const result = await window.evidexAPI.licence.activate({ licenceKey: trimmed });
    if (!result.ok) {
      setStatus({ kind: 'error', message: result.error.message });
      setStepData('licence', { key: trimmed, verified: false });
      return;
    }
    if (!result.data.success) {
      setStatus({ kind: 'error', message: result.data.reason ?? 'Activation rejected.' });
      setStepData('licence', { key: trimmed, verified: false });
      return;
    }
    const last4 = trimmed.slice(-4).toUpperCase();
    const masked = `****-****-****-${last4}`;
    const activatedAt = result.data.licenceInfo?.activatedAt ?? new Date().toISOString();
    setStepData('licence', { key: trimmed, masked, activatedAt, verified: true });
    setStatus({ kind: 'ok', masked });
  }

  const verified = status.kind === 'ok';

  return (
    <StepLayout
      icon={KeyRegular}
      palette="accent"
      title="Activate your licence"
      subtext="Paste the licence key you received with your Vision-EviDex download. Activation binds this copy to your machine."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'left' }}>
          <label className="field-floating-label" htmlFor="licence-key">
            Licence key <span className="req">*</span>
          </label>
          <div className="field-floating" aria-invalid={status.kind === 'error'}>
            <span className="field-icon">
              <KeyRegular fontSize={20} />
            </span>
            <input
              id="licence-key"
              type="text"
              value={verified && status.kind === 'ok' ? status.masked : key}
              onChange={(e) => {
                setKey(e.target.value);
                if (status.kind === 'error' || status.kind === 'ok') {
                  setStatus({ kind: 'idle' });
                  setStepData('licence', { key: e.target.value, verified: false });
                }
              }}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              disabled={verified}
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
            />
          </div>
        </div>

        {status.kind === 'error' && (
          <div className="verify-status error" role="alert">
            <ErrorCircleRegular fontSize={20} />
            <span>{status.message}</span>
          </div>
        )}

        {status.kind === 'ok' && (
          <div className="verify-status success" role="status">
            <CheckmarkCircleFilled fontSize={20} />
            <span>Thanks for choosing Vision-EviDex — click Next to proceed.</span>
          </div>
        )}

        {!verified && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="accent"
              onClick={() => void verify()}
              disabled={status.kind === 'verifying' || key.trim().length === 0}
            >
              {status.kind === 'verifying' ? 'Verifying…' : 'Verify'}
            </Button>
          </div>
        )}
      </div>
    </StepLayout>
  );
}
