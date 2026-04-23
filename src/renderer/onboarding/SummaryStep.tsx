import { useOnboardingStore, selectVisibleSteps } from '../stores/onboarding-store';
import type { UserProfileData, BrandingData } from './validators';
import type { ThemeChoice } from './ThemeStorageStep';
import { BUILTIN_TEMPLATES } from './DefaultTemplateStep';
import { HOTKEY_ACTIONS } from './hotkey-utils';
import { StepLayout } from './StepLayout';
import { StepComplete } from '../components/brand/BrandIcons';

/**
 * Step 8 — Summary. Read-only recap of every choice the user made in
 * the wizard, wrapped in the shared StepLayout so the hero icon,
 * heading, and subtext match the other steps. The wizard's Finish
 * button (owned by OnboardingPage) runs the persistence flow.
 */

export function SummaryStep(): JSX.Element {
  const data = useOnboardingStore((s) => s.data);
  const goTo = useOnboardingStore((s) => s.goTo);
  const visible = useOnboardingStore(selectVisibleSteps);

  const profile = data['profile'] as Partial<UserProfileData> | undefined;
  const branding = data['branding'] as Partial<BrandingData> | undefined;
  const template = data['template'] as { templateId?: string } | undefined;
  const themeStorage = data['themeStorage'] as
    | { theme?: ThemeChoice; storagePath?: string }
    | undefined;

  const templateName = BUILTIN_TEMPLATES.find((t) => t.id === template?.templateId)?.name ?? '(not selected)';
  const profileValue =
    profile?.name && profile.role ? `${profile.name} · ${profile.role}` : '(missing)';

  const stepIndexOf = (id: string): number => {
    const idx = visible.findIndex((s) => s.id === id);
    return idx < 0 ? 0 : idx;
  };

  return (
    <StepLayout
      icon={StepComplete}
      palette="success"
      title="You're all set"
      subtext="Review the details below before we create your first project. Every row is editable — jump back with a single click."
      maxWidth={560}
    >
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           'var(--space-2)',
          textAlign:     'left',
        }}
      >
        <SummaryRow label="Profile"          value={profileValue}                               onEdit={() => goTo(stepIndexOf('profile'))} />
        <SummaryRow label="Organisation"     value={branding?.companyName ?? '(missing)'}        onEdit={() => goTo(stepIndexOf('branding'))} />
        <SummaryRow label="Default template" value={templateName}                                onEdit={() => goTo(stepIndexOf('template'))} />
        <SummaryRow label="Hotkeys"          value={`${HOTKEY_ACTIONS.length} actions configured`} onEdit={() => goTo(stepIndexOf('hotkeys'))} />
        <SummaryRow label="Theme"            value={themeStorage?.theme ?? 'system'}             onEdit={() => goTo(stepIndexOf('themeStorage'))} />
        <SummaryRow label="Storage folder"   value={themeStorage?.storagePath || '(not selected)'} onEdit={() => goTo(stepIndexOf('themeStorage'))} />
      </div>
    </StepLayout>
  );
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}): JSX.Element {
  return (
    <div className="summary-row">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span className="summary-row-label">{label}</span>
        <span className="summary-row-value">{value}</span>
      </div>
      <button type="button" onClick={onEdit} className="summary-row-edit">
        Edit
      </button>
    </div>
  );
}
