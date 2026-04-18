import { useOnboardingStore } from '../stores/onboarding-store';
import type { UserProfileData, BrandingData } from './validators';
import type { ThemeChoice } from './ThemeStorageStep';
import { BUILTIN_TEMPLATES } from './DefaultTemplateStep';
import { DEFAULT_HOTKEYS, HOTKEY_ACTIONS } from './hotkey-utils';

/**
 * Step 8 — Summary.
 *
 * Read-only recap of everything the user picked. The wizard's Finish
 * button (rendered by OnboardingPage) runs the persistence flow.
 */

export function SummaryStep(): JSX.Element {
  const data = useOnboardingStore((s) => s.data);
  const goTo = useOnboardingStore((s) => s.goTo);
  const mode = useOnboardingStore((s) => s.mode);

  const profile = data['profile'] as Partial<UserProfileData> | undefined;
  const branding = data['branding'] as Partial<BrandingData> | undefined;
  const template = data['template'] as { templateId?: string } | undefined;
  const themeStorage = data['themeStorage'] as
    | { theme?: ThemeChoice; storagePath?: string }
    | undefined;
  const hotkeys = (data['hotkeys'] as Record<string, string> | undefined) ?? DEFAULT_HOTKEYS;

  const templateName = BUILTIN_TEMPLATES.find((t) => t.id === template?.templateId)?.name ?? '(not selected)';

  // Step indices are mode-dependent: in `none` mode the licence step
  // is hidden, so all indices shift down by 1.
  const stepIndexOf = (name: 'profile' | 'branding' | 'template' | 'hotkeys' | 'themeStorage') => {
    const offset = mode === 'none' ? 0 : 1;
    switch (name) {
      case 'profile': return 1 + offset - 1;     // profile is the 2nd visible step in keygen, 1st in none
      case 'branding': return 2 + offset - 1;
      case 'template': return 3 + offset - 1;
      case 'hotkeys': return 4 + offset - 1;
      case 'themeStorage': return 5 + offset - 1;
    }
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
