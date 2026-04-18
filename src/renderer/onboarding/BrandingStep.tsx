import { useState } from 'react';
import { useOnboardingStore } from '../stores/onboarding-store';
import type { BrandingData } from './validators';

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB per spec

export function BrandingStep(): JSX.Element {
  const current = useOnboardingStore(
    (s) => (s.data['branding'] as Partial<BrandingData> | undefined) ?? {}
  );
  const setStepData = useOnboardingStore((s) => s.setStepData);
  const [logoError, setLogoError] = useState<string | null>(null);

  function patch(update: Partial<BrandingData>): void {
    setStepData('branding', { companyName: '', primaryColor: '#1A6FD4', ...current, ...update });
  }

  async function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
      setLogoError('Logo must be PNG or JPG.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Logo must be 2 MB or less.');
      return;
    }
    const base64 = await fileToBase64(file);
    patch({ logoBase64: base64, logoMimeType: file.type });
  }

  const preview =
    current.logoBase64 && current.logoMimeType
      ? `data:${current.logoMimeType};base64,${current.logoBase64}`
      : null;

  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="text-text-secondary">
          Company name <span className="text-accent-error">*</span>
        </span>
        <input
          type="text"
          value={current.companyName ?? ''}
          onChange={(e) => patch({ companyName: e.target.value })}
          className="mt-1 w-full rounded-md border border-border-subtle px-3 py-2 text-text-primary"
        />
      </label>

      <div>
        <span className="text-text-secondary">Logo (PNG or JPG, ≤ 2 MB)</span>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={onLogoFile}
            className="text-sm text-text-primary"
          />
          {preview && <img src={preview} alt="Logo preview" className="h-12 w-auto rounded-sm" />}
        </div>
        {logoError && (
          <p className="mt-1 text-sm text-accent-error" role="alert">
            {logoError}
          </p>
        )}
      </div>

      <label className="block">
        <span className="text-text-secondary">
          Primary colour <span className="text-accent-error">*</span>
        </span>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="color"
            value={current.primaryColor ?? '#1A6FD4'}
            onChange={(e) => patch({ primaryColor: e.target.value })}
            className="h-9 w-12 rounded border border-border-subtle bg-transparent"
          />
          <span className="font-mono text-text-primary">{current.primaryColor ?? '#1A6FD4'}</span>
        </div>
      </label>

      <label className="block">
        <span className="text-text-secondary">Header text (optional)</span>
        <input
          type="text"
          value={current.headerText ?? ''}
          onChange={(e) => patch({ headerText: e.target.value })}
          className="mt-1 w-full rounded-md border border-border-subtle px-3 py-2 text-text-primary"
        />
      </label>

      <label className="block">
        <span className="text-text-secondary">Footer text (optional)</span>
        <input
          type="text"
          value={current.footerText ?? ''}
          onChange={(e) => patch({ footerText: e.target.value })}
          className="mt-1 w-full rounded-md border border-border-subtle px-3 py-2 text-text-primary"
        />
      </label>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      // readAsDataURL returns "data:MIME;base64,XXXX" — strip the prefix.
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}
