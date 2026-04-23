import { useEffect, type CSSProperties } from 'react';
import {
  DocumentBulletListRegular,
  ClipboardTaskListLtrRegular,
  BugRegular,
  ShieldCheckmarkRegular,
} from '@fluentui/react-icons';
import type { FluentIconsProps } from '@fluentui/react-icons';
import type { ComponentType } from 'react';
import { useOnboardingStore } from '../stores/onboarding-store';
import type { BrandingData } from './validators';
import { StepLayout } from './StepLayout';
import { StepTemplate } from '../components/brand/BrandIcons';

type FluentIcon = ComponentType<FluentIconsProps>;

export interface TemplateOption {
  id: string;
  name: string;
  description: string;
  icon: FluentIcon;
}

export const BUILTIN_TEMPLATES: readonly TemplateOption[] = Object.freeze([
  {
    id: 'tpl_tsr_standard',
    name: 'Test Summary Report',
    description: 'End-of-cycle report: scope, coverage, pass/fail, defects.',
    icon: DocumentBulletListRegular,
  },
  {
    id: 'tpl_dsr_daily',
    name: 'Daily Status Report',
    description: 'One-page daily execution status with defect deltas.',
    icon: ClipboardTaskListLtrRegular,
  },
  {
    id: 'tpl_uat_signoff',
    name: 'UAT Sign-off',
    description: 'Business acceptance report with a sign-off block.',
    icon: ShieldCheckmarkRegular,
  },
  {
    id: 'tpl_bug_report',
    name: 'Bug Report',
    description: 'Per-defect evidence: steps, screenshots, logs.',
    icon: BugRegular,
  },
  {
    id: 'tpl_audit_pack',
    name: 'Audit Pack',
    description: 'Compliance bundle with hashes and sign-offs.',
    icon: ShieldCheckmarkRegular,
  },
]);

const DEFAULT_TEMPLATE_ID = 'tpl_tsr_standard';
const FALLBACK_ACCENT = '#0078D4';

export function DefaultTemplateStep(): JSX.Element {
  const selectedId =
    useOnboardingStore((s) => (s.data['template'] as { templateId?: string } | undefined)?.templateId) ??
    '';
  const brandingColour = useOnboardingStore(
    (s) => (s.data['branding'] as Partial<BrandingData> | undefined)?.primaryColor
  );
  const setStepData = useOnboardingStore((s) => s.setStepData);

  // Default selection = TSR so the step is valid on first render.
  useEffect(() => {
    if (!selectedId) setStepData('template', { templateId: DEFAULT_TEMPLATE_ID });
  }, [selectedId, setStepData]);

  const activeId = selectedId || DEFAULT_TEMPLATE_ID;
  const active = BUILTIN_TEMPLATES.find((t) => t.id === activeId) ?? BUILTIN_TEMPLATES[0]!;
  const accent = brandingColour && /^#[0-9a-fA-F]{6}$/.test(brandingColour) ? brandingColour : FALLBACK_ACCENT;

  return (
    <StepLayout
      icon={StepTemplate}
      palette="violet"
      title="Default report template"
      subtext="New projects start with this layout. Preview uses your organisation's primary colour."
      maxWidth={760}
    >
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 240px)',
          gap:                 'var(--space-5)',
          alignItems:          'start',
          textAlign:           'left',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {BUILTIN_TEMPLATES.map((t) => {
            const isSelected = activeId === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setStepData('template', { templateId: t.id })}
                className={`template-card${isSelected ? ' selected' : ''}`}
                aria-pressed={isSelected}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span
                    className="template-card-icon"
                    style={isSelected ? { background: hexWithAlpha(accent, 0.14), color: accent } : undefined}
                  >
                    <Icon fontSize={20} />
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="template-card-name">{t.name}</span>
                    <span className="template-card-description">{t.description}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div>
          <div className="field-floating-label" style={{ marginBottom: 'var(--space-2)' }}>
            Preview — {active.name}
          </div>
          <TemplateSkeletonPreview templateId={active.id} accent={accent} />
        </div>
      </div>
    </StepLayout>
  );
}

/**
 * Compact A4-proportioned preview. Accent blocks render as solid fills
 * in the user's organisation primary colour; everything else uses the
 * `.skeleton` shimmer class so the preview visibly breathes.
 */
function TemplateSkeletonPreview({ templateId, accent }: { templateId: string; accent: string }): JSX.Element {
  const solid = (opacity = 1): CSSProperties => ({
    background: opacity === 1 ? accent : hexWithAlpha(accent, opacity),
    borderRadius: 'var(--radius-control)',
  });

  switch (templateId) {
    case 'tpl_tsr_standard':
      return (
        <div className="template-preview">
          <div style={{ height: 12, width: '55%', ...solid() }} />
          <div className="skeleton" style={{ height: 6, width: '35%' }} />
          <div style={{ height: 3, width: '100%', ...solid(0.3) }} />
          <div style={{ display: 'flex', gap: 4 }}>
            <div className="skeleton" style={{ flex: 1, height: 22 }} />
            <div className="skeleton" style={{ flex: 1, height: 22 }} />
          </div>
          <div className="skeleton" style={{ height: 5, width: '80%' }} />
          <div className="skeleton" style={{ height: 5, width: '65%' }} />
          <div className="skeleton" style={{ height: 5, width: '55%' }} />
        </div>
      );
    case 'tpl_dsr_daily':
      return (
        <div className="template-preview">
          <div style={{ height: 10, width: '40%', ...solid() }} />
          <div className="skeleton" style={{ height: 5, width: '55%' }} />
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 18,
                  borderRadius: 'var(--radius-control)',
                  background: i === 0 ? accent : hexWithAlpha(accent, 0.22),
                }}
              />
            ))}
          </div>
          <div className="skeleton" style={{ height: 5, width: '80%' }} />
          <div className="skeleton" style={{ height: 5, width: '60%' }} />
          <div className="skeleton" style={{ height: 5, width: '70%' }} />
        </div>
      );
    case 'tpl_uat_signoff':
      return (
        <div className="template-preview">
          <div style={{ height: 12, width: '50%', ...solid() }} />
          <div className="skeleton" style={{ height: 5, width: '65%' }} />
          <div className="skeleton" style={{ height: 32 }} />
          <div className="skeleton" style={{ height: 5, width: '70%' }} />
          <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
            <div
              style={{
                flex: 1,
                height: 18,
                borderRadius: 'var(--radius-control)',
                border: `1px solid ${hexWithAlpha(accent, 0.4)}`,
              }}
            />
            <div style={{ flex: 1, height: 18, ...solid() }} />
          </div>
        </div>
      );
    case 'tpl_bug_report':
      return (
        <div className="template-preview">
          <div style={{ height: 10, width: '55%', ...solid() }} />
          <div className="skeleton" style={{ height: 5, width: '40%' }} />
          <div style={{ height: 36, ...solid(0.15) }} />
          <div className="skeleton" style={{ height: 5, width: '75%' }} />
          <div className="skeleton" style={{ height: 5, width: '65%' }} />
          <div className="skeleton" style={{ height: 5, width: '50%' }} />
        </div>
      );
    case 'tpl_audit_pack':
    default:
      return (
        <div className="template-preview">
          <div style={{ height: 12, width: '60%', ...solid() }} />
          <div className="skeleton" style={{ height: 5, width: '45%' }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                height: 7,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
              <div className="skeleton" style={{ flex: 1, height: 5 }} />
            </div>
          ))}
        </div>
      );
  }
}

function hexWithAlpha(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return hex;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
