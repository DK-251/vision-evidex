import { useState } from 'react';
import {
  BuildingRegular,
  ImageAddRegular,
  ColorRegular,
  TextTRegular,
  TextAlignLeftRegular,
} from '@fluentui/react-icons';
import { useOnboardingStore } from '../stores/onboarding-store';
import type { BrandingData } from './validators';
import { StepLayout } from './StepLayout';
import { StepBranding } from '../components/brand/BrandIcons';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const DEFAULT_COLOR = '#0078D4';

/**
 * Step 5 — Organisation & branding. Centred layout; Fluent transparent
 * inputs; logo upload zone that renders a live preview card showing how
 * the logo + company name will appear in exported report headers.
 */
export function BrandingStep(): JSX.Element {
  const current = useOnboardingStore(
    (s) => (s.data['branding'] as Partial<BrandingData> | undefined) ?? {}
  );
  const setStepData = useOnboardingStore((s) => s.setStepData);
  const [logoError, setLogoError] = useState<string | null>(null);

  function patch(update: Partial<BrandingData>): void {
    setStepData('branding', { companyName: '', primaryColor: DEFAULT_COLOR, ...current, ...update });
  }

  async function onLogoFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
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
  const primary = current.primaryColor ?? DEFAULT_COLOR;

  return (
    <StepLayout
      icon={StepBranding}
      palette="warm"
      title="Organisation & branding"
      subtext="These details appear on every exported Word, PDF, and HTML report."
      maxWidth={640}
    >
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap:                 'var(--space-4) var(--space-5)',
          textAlign:           'left',
        }}
      >
        <BrandField
          label="Company name"
          required
          icon={<BuildingRegular fontSize={20} />}
          value={current.companyName ?? ''}
          onChange={(v) => patch({ companyName: v })}
          placeholder="Acme Corp"
        />
        <BrandColourField
          value={primary}
          onChange={(v) => patch({ primaryColor: v })}
        />
        <BrandField
          label="Header text"
          icon={<TextTRegular fontSize={20} />}
          value={current.headerText ?? ''}
          onChange={(v) => patch({ headerText: v })}
          placeholder="QA Release Evidence"
        />
        <BrandField
          label="Footer text"
          icon={<TextAlignLeftRegular fontSize={20} />}
          value={current.footerText ?? ''}
          onChange={(v) => patch({ footerText: v })}
          placeholder="Confidential — for internal use"
        />
      </div>

      <div style={{ marginTop: 'var(--space-5)', display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-3)' }}>
        <label className="field-floating-label" style={{ textAlign: 'left' }}>
          Logo (PNG or JPG, ≤ 2 MB)
        </label>
        <div
          style={{
            display:         'flex',
            alignItems:      'center',
            gap:             'var(--space-4)',
            padding:         'var(--space-4)',
            border:          `1px dashed var(--color-stroke-default)`,
            borderRadius:    'var(--radius-card)',
            background:      'var(--color-fill-subtle)',
          }}
        >
          <div
            className="icon-orb icon-orb-accent icon-orb-56"
            aria-hidden="true"
            style={{ animation: 'none' }}
          >
            <ImageAddRegular fontSize={26} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 'var(--type-body-size)', color: 'var(--color-text-primary)' }}>
              {preview ? 'Logo selected' : 'Drop a logo here'}
            </div>
            <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
              {preview ? 'Click Replace to change it.' : 'PNG or JPG, up to 2 MB.'}
            </div>
          </div>
          <label className="btn-base btn-standard btn-compact" style={{ cursor: 'pointer' }}>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={onLogoFile}
              style={{ display: 'none' }}
            />
            {preview ? 'Replace' : 'Choose file'}
          </label>
        </div>
        {logoError && (
          <div className="verify-status error" role="alert">
            <span>{logoError}</span>
          </div>
        )}
      </div>

      <LogoPreview primary={primary} logoSrc={preview} companyName={current.companyName ?? ''} headerText={current.headerText ?? ''} />
    </StepLayout>
  );
}

function BrandField({
  label, icon, value, onChange, placeholder, required = false,
}: {
  label: string;
  icon: JSX.Element;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}): JSX.Element {
  return (
    <label style={{ display: 'block' }}>
      <span className="field-floating-label">
        {label}
        {required && <span className="req">*</span>}
      </span>
      <div className="field-floating">
        <span className="field-icon">{icon}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...(placeholder ? { placeholder } : {})}
        />
      </div>
    </label>
  );
}

function BrandColourField({
  value, onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label style={{ display: 'block' }}>
      <span className="field-floating-label">
        Primary colour<span className="req">*</span>
      </span>
      <div className="field-floating">
        <span className="field-icon" style={{ color: value }}>
          <ColorRegular fontSize={20} />
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mono"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Pick colour"
          style={{
            width: 28,
            height: 28,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
      </div>
    </label>
  );
}

function LogoPreview({
  primary, logoSrc, companyName, headerText,
}: {
  primary: string;
  logoSrc: string | null;
  companyName: string;
  headerText: string;
}): JSX.Element {
  return (
    <div
      style={{
        marginTop:   'var(--space-5)',
        background:  'var(--color-layer-1)',
        border:      '1px solid var(--color-stroke-default)',
        borderRadius:'var(--radius-card)',
        overflow:    'hidden',
      }}
    >
      <div
        style={{
          height:     6,
          background: primary,
        }}
      />
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        'var(--space-3) var(--space-4)',
          gap:            'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {logoSrc ? (
            <img src={logoSrc} alt="Logo preview" style={{ height: 32, width: 'auto' }} />
          ) : (
            <div
              style={{
                width: 32, height: 32,
                borderRadius: 'var(--radius-control)',
                background: 'var(--color-fill-secondary)',
              }}
              aria-hidden
            />
          )}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 'var(--type-body-strong-size)', fontWeight: 'var(--type-body-strong-weight)', color: 'var(--color-text-primary)' }}>
              {companyName || 'Your company'}
            </div>
            <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
              {headerText || 'Report header preview'}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-tertiary)' }} className="mono">
          report.pdf
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}
