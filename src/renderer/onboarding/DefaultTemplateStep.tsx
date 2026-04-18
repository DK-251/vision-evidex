import { useOnboardingStore } from '../stores/onboarding-store';

/**
 * Step 5 — Default template.
 *
 * Built-in template list is a placeholder for Phase 3 when the
 * Template Engine lands. The skeleton shows 5 representative report
 * types so the choice UI is wired end-to-end and the user's selection
 * persists into `settings.defaultTemplateId` at Finish.
 */

export interface TemplateOption {
  id: string;
  name: string;
  description: string;
}

export const BUILTIN_TEMPLATES: readonly TemplateOption[] = Object.freeze([
  {
    id: 'tpl_tsr_standard',
    name: 'TSR — Test Summary Report',
    description: 'Classic end-of-cycle report: scope, coverage, pass/fail, defects.',
  },
  {
    id: 'tpl_dsr_daily',
    name: 'DSR — Daily Status Report',
    description: 'One-page daily execution status with defect deltas.',
  },
  {
    id: 'tpl_uat_signoff',
    name: 'UAT Sign-off',
    description: 'Business acceptance report with sign-off block.',
  },
  {
    id: 'tpl_bug_report',
    name: 'Bug Report',
    description: 'Per-defect evidence package: steps, screenshots, logs.',
  },
  {
    id: 'tpl_audit_pack',
    name: 'Audit Pack',
    description: 'Compliance-focused bundle with hashes and sign-offs.',
  },
]);

export function DefaultTemplateStep(): JSX.Element {
  const selected =
    (useOnboardingStore((s) => s.data['template'] as { templateId?: string } | undefined)
      ?.templateId) ?? '';
  const setStepData = useOnboardingStore((s) => s.setStepData);

  return (
    <div className="space-y-2">
      {BUILTIN_TEMPLATES.map((t) => (
        <label
          key={t.id}
          className={`block p-3 rounded-md cursor-pointer border ${
            selected === t.id ? 'border-accent-primary' : 'border-border-subtle'
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name="default-template"
              value={t.id}
              checked={selected === t.id}
              onChange={() => setStepData('template', { templateId: t.id })}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-text-primary">{t.name}</div>
              <div className="text-xs text-text-secondary mt-0.5">{t.description}</div>
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}
