import { useOnboardingStore, selectVisibleSteps } from '../stores/onboarding-store';
import type { UserProfileData, BrandingData } from './validators';
import type { ThemeChoice } from './ThemeStorageStep';
import { BUILTIN_TEMPLATES } from './DefaultTemplateStep';
import { HOTKEY_ACTIONS } from './hotkey-utils';

/**
 * Step 8 — Summary.
 *
 * Read-only recap of everything the user picked. The wizard's Finish
 * button (rendered by OnboardingPage) runs the persistence flow.
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

  const stepIndexOf = (id: string): number => {
    const idx = visible.findIndex((s) => s.id === id);
    return idx < 0 ? 0 : idx;
  };

  return (
    <div className="space-y-3 text-sm">
      <SummaryRow label="Profile" value={profile?.name && profile.role ? `${profile.name} · ${profile.role}` : '(missing)'} onEdit={() => goTo(stepIndexOf('profile'))} />
      <SummaryRow
        label="Branding"
        value={branding?.companyName ?? '(missing)'}
        onEdit={() => goTo(stepIndexOf('branding'))}
      />
      <SummaryRow
        label="Default template"
        value={templateName}
        onEdit={() => goTo(stepIndexOf('template'))}
      />
      <SummaryRow
        label="Hotkeys"
        value={`${HOTKEY_ACTIONS.length} actions configured`}
        onEdit={() => goTo(stepIndexOf('hotkeys'))}
      />
      <SummaryRow
        label="Theme"
        value={themeStorage?.theme ?? 'system'}
        onEdit={() => goTo(stepIndexOf('themeStorage'))}
      />
      <SummaryRow
        label="Storage folder"
        value={themeStorage?.storagePath || '(not selected)'}
        onEdit={() => goTo(stepIndexOf('themeStorage'))}
      />
    </div>
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
    <div className="flex items-center justify-between p-2 rounded-md border border-border-subtle">
      <div>
        <div className="text-text-secondary text-xs uppercase">{label}</div>
        <div className="text-text-primary">{value}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs text-accent-primary"
      >
        Edit
      </button>
    </div>
  );
}
