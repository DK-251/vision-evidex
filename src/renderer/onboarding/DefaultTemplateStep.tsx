import { useEffect } from 'react';
import {
  DocumentTextRegular,
  DocumentBulletListRegular,
  ClipboardTaskListLtrRegular,
  BugRegular,
  ShieldCheckmarkRegular,
  TextAlignLeftRegular,
} from '@fluentui/react-icons';
import type { FluentIconsProps } from '@fluentui/react-icons';
import type { ComponentType } from 'react';
import { useOnboardingStore } from '../stores/onboarding-store';
import { StepLayout } from './StepLayout';

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

export function DefaultTemplateStep(): JSX.Element {
  const selectedId =
    useOnboardingStore((s) => (s.data['template'] as { templateId?: string } | undefined)?.templateId) ??
    '';
  const setStepData = useOnboardingStore((s) => s.setStepData);

  // Default selection = TSR so the step is valid on first render.
  useEffect(() => {
    if (!selectedId) setStepData('template', { templateId: DEFAULT_TEMPLATE_ID });
  }, [selectedId, setStepData]);

  const activeId = selectedId || DEFAULT_TEMPLATE_ID;
  const active = BUILTIN_TEMPLATES.find((t) => t.id === activeId) ?? BUILTIN_TEMPLATES[0]!;

  return (
    <StepLayout
      icon={TextAlignLeftRegular}
      palette="violet"
      title="Default report template"
      subtext="New projects start with this layout. You can change it per project later."
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
                  <span className="template-card-icon">
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
          <TemplateSkeletonPreview templateId={active.id} />
        </div>
      </div>
    </StepLayout>
  );
}

function TemplateSkeletonPreview({ templateId }: { templateId: string }): JSX.Element {
  const accent = 'var(--color-accent-default)';
  const block = 'template-preview-block';
  switch (templateId) {
    case 'tpl_tsr_standard':
      return (
        <div className="template-preview">
          <div className={block} style={{ height: 18, width: '60%', background: accent, opacity: 0.75 }} />
          <div className={block} style={{ height: 10, width: '35%' }} />
          <div className={block} style={{ height: 32, marginTop: 6 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <div className={block} style={{ flex: 1, height: 40 }} />
            <div className={block} style={{ flex: 1, height: 40 }} />
          </div>
          <div className={block} style={{ height: 8, width: '80%' }} />
          <div className={block} style={{ height: 8, width: '70%' }} />
          <div className={block} style={{ height: 8, width: '50%' }} />
        </div>
      );
    case 'tpl_dsr_daily':
      return (
        <div className="template-preview">
          <div className={block} style={{ height: 14, width: '40%', background: accent, opacity: 0.75 }} />
          <div className={block} style={{ height: 8, width: '60%' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={block} style={{ flex: 1, height: 30 }} />
            ))}
          </div>
          <div className={block} style={{ height: 8, width: '80%' }} />
          <div className={block} style={{ height: 8, width: '65%' }} />
        </div>
      );
    case 'tpl_uat_signoff':
      return (
        <div className="template-preview">
          <div className={block} style={{ height: 18, width: '50%', background: accent, opacity: 0.75 }} />
          <div className={block} style={{ height: 8, width: '70%' }} />
          <div className={block} style={{ height: 48, marginTop: 8 }} />
          <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
            <div className={block} style={{ flex: 1, height: 24 }} />
            <div className={block} style={{ flex: 1, height: 24 }} />
          </div>
        </div>
      );
    case 'tpl_bug_report':
      return (
        <div className="template-preview">
          <div className={block} style={{ height: 14, width: '55%', background: accent, opacity: 0.75 }} />
          <div className={block} style={{ height: 8, width: '40%' }} />
          <div className={block} style={{ height: 60 }} />
          <div className={block} style={{ height: 8, width: '80%' }} />
          <div className={block} style={{ height: 8, width: '70%' }} />
        </div>
      );
    case 'tpl_audit_pack':
    default:
      return (
        <div className="template-preview">
          <div className={block} style={{ height: 18, width: '60%', background: accent, opacity: 0.75 }} />
          <div className={block} style={{ height: 8, width: '45%' }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={block} style={{ height: 10, width: `${85 - i * 5}%` }} />
          ))}
        </div>
      );
  }
}
