import { useEffect, useState } from 'react';
import type {
  Settings,
  ThemePreference,
  UserProfileSettings,
  LicenceMode,
} from '@shared/types/entities';
import type { SettingsUpdateInput } from '@shared/schemas';
import { BUILTIN_TEMPLATES } from '../onboarding/DefaultTemplateStep';
import { DEFAULT_HOTKEYS, HOTKEY_ACTIONS, detectHotkeyConflicts, formatKeyEvent } from '../onboarding/hotkey-utils';
import { useNavStore } from '../stores/nav-store';
import { Skeleton } from '../components/Skeleton';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'hotkeys', label: 'Hotkeys' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'storage', label: 'Storage' },
  { id: 'defaults', label: 'Defaults' },
  { id: 'licence', label: 'Licence' },
] as const;

type TabId = typeof TABS[number]['id'];

export function AppSettingsPage(): JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [mode, setMode] = useState<LicenceMode>('none');
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const [sResult, lResult] = await Promise.all([
        window.evidexAPI.settings.get(),
        window.evidexAPI.licence.validate(),
      ]);
      if (cancelled) return;
      if (!sResult.ok) {
        setError(`settings: ${sResult.error.message}`);
        return;
      }
      setSettings(sResult.data);
      if (lResult.ok) setMode(lResult.data.mode);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function patch(update: SettingsUpdateInput): Promise<void> {
    setError(null);
    const result = await window.evidexAPI.settings.update(update);
    if (!result.ok) {
      setError(`save failed: ${result.error.message}`);
      return;
    }
    setSettings(result.data);
  }

  if (settings === null) {
    return (
      <div className="min-h-screen bg-surface-primary p-6 md:p-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="flex gap-2 border-b border-border-subtle pb-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-20" />
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-primary p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">App settings</h1>
          <button
            type="button"
            onClick={() => useNavStore.getState().goTo('dashboard')}
            className="text-sm px-3 py-1.5 rounded-md border border-border-subtle"
          >
            ← Dashboard
          </button>
        </div>

        <div className="flex gap-1 border-b border-border-subtle">
          {TABS.map((t) => {
            const label = t.id === 'licence' && mode === 'none' ? 'About' : t.label;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm ${
                  activeTab === t.id
                    ? 'text-text-primary border-b-2 border-accent-primary -mb-px'
                    : 'text-text-secondary'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-accent-error p-3 text-sm text-accent-error"
          >
            {error}
          </div>
        )}

        <div className="mt-6">
          {activeTab === 'profile' && <ProfileTab settings={settings} patch={patch} />}
          {activeTab === 'hotkeys' && <HotkeysTab settings={settings} patch={patch} />}
          {activeTab === 'appearance' && <AppearanceTab settings={settings} patch={patch} />}
          {activeTab === 'storage' && <StorageTab settings={settings} patch={patch} />}
          {activeTab === 'defaults' && <DefaultsTab settings={settings} patch={patch} />}
          {activeTab === 'licence' && <LicenceTab mode={mode} />}
        </div>
      </div>
    </div>
  );
}

type TabProps = { settings: Settings; patch: (u: SettingsUpdateInput) => Promise<void> };

function ProfileTab({ settings, patch }: TabProps): JSX.Element {
  const profile = settings.profile ?? { name: '', role: '' };
  function onChange(field: keyof UserProfileSettings, value: string): void {
    const next: UserProfileSettings = { ...profile, [field]: value };
    // Strip empty optional fields so SettingsSchema stays clean.
    if (next.team === '') delete next.team;
    if (next.email === '') delete next.email;
    void patch({ profile: next });
  }
  return (
    <div className="space-y-3 text-sm max-w-md">
      <Field label="Full name">
        <input
          type="text"
          value={profile.name}
          onChange={(e) => onChange('name', e.target.value)}
          className="w-full rounded-md border border-border-subtle px-3 py-2 text-text-primary"
        />
      </Field>
      <Field label="Role">
        <input
          type="text"
          value={profile.role}
          onChange={(e) => onChange('role', e.target.value)}
          className="w-full rounded-md border border-border-subtle px-3 py-2 text-text-primary"
        />
      </Field>
      <Field label="Team">
        <input
          type="text"
          value={profile.team ?? ''}
          onChange={(e) => onChange('team', e.target.value)}
          className="w-full rounded-md border border-border-subtle px-3 py-2 text-text-primary"
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          value={profile.email ?? ''}
          onChange={(e) => onChange('email', e.target.value)}
          className="w-full rounded-md border border-border-subtle px-3 py-2 text-text-primary"
        />
      </Field>
    </div>
  );
}

function HotkeysTab({ settings, patch }: TabProps): JSX.Element {
  const hotkeys = settings.hotkeys ?? { ...DEFAULT_HOTKEYS };
  const conflicts = detectHotkeyConflicts(hotkeys);

  function remap(actionId: string): void {
    const handler = (e: KeyboardEvent): void => {
      e.preventDefault();
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      window.removeEventListener('keydown', handler, true);
      void patch({ hotkeys: { ...hotkeys, [actionId]: formatKeyEvent(e) } });
    };
    window.addEventListener('keydown', handler, true);
  }

  return (
    <div className="space-y-2 text-sm">
      {HOTKEY_ACTIONS.map((a) => (
        <div
          key={a.id}
          className={`flex items-center justify-between p-2 rounded-md border ${
            conflicts.has(a.id) ? 'border-accent-error' : 'border-border-subtle'
          }`}
        >
          <div>
            <div className="text-text-primary">{a.label}</div>
            <div className="text-xs text-text-secondary">{a.description}</div>
          </div>
          <button
            type="button"
            onClick={() => remap(a.id)}
            className="font-mono text-text-primary px-3 py-1 rounded-md border border-border-subtle"
          >
            {hotkeys[a.id] ?? '(unset)'}
          </button>
        </div>
      ))}
      {conflicts.size > 0 && (
        <p className="text-xs text-accent-error" role="alert">
          Duplicate binding — each shortcut must be unique.
        </p>
      )}
    </div>
  );
}

function AppearanceTab({ settings, patch }: TabProps): JSX.Element {
  return (
    <div className="space-y-3 text-sm">
      <Field label="Theme">
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as ThemePreference[]).map((t) => (
            <label
              key={t}
              className={`px-3 py-1.5 rounded-md border capitalize cursor-pointer ${
                settings.theme === t
                  ? 'border-accent-primary text-text-primary'
                  : 'border-border-subtle text-text-secondary'
              }`}
            >
              <input
                type="radio"
                name="app-theme"
                value={t}
                checked={settings.theme === t}
                onChange={() => void patch({ theme: t })}
                className="sr-only"
              />
              {t}
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}

function StorageTab({ settings, patch }: TabProps): JSX.Element {
  async function pickFolder(): Promise<void> {
    const result = await window.evidexAPI.dialog.selectDirectory({
      title: 'Default storage folder',
      ...(settings.defaultStoragePath ? { defaultPath: settings.defaultStoragePath } : {}),
    });
    if (result.ok && result.data.path) {
      await patch({ defaultStoragePath: result.data.path });
    }
  }
  return (
    <Field label="Default storage folder">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={settings.defaultStoragePath}
          readOnly
          placeholder="Pick a folder…"
          className="flex-1 rounded-md border border-border-subtle px-3 py-2 font-mono text-text-primary"
        />
        <button
          type="button"
          onClick={pickFolder}
          className="px-3 py-2 rounded-md border border-border-subtle"
        >
          Browse…
        </button>
      </div>
    </Field>
  );
}

function DefaultsTab({ settings, patch }: TabProps): JSX.Element {
  return (
    <div className="space-y-2">
      <p className="text-sm text-text-secondary">Default report template for new projects</p>
      {BUILTIN_TEMPLATES.map((t) => (
        <label
          key={t.id}
          className={`block p-3 rounded-md cursor-pointer border ${
            settings.defaultTemplateId === t.id ? 'border-accent-primary' : 'border-border-subtle'
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name="default-template"
              value={t.id}
              checked={settings.defaultTemplateId === t.id}
              onChange={() => void patch({ defaultTemplateId: t.id })}
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

function LicenceTab({ mode }: { mode: LicenceMode }): JSX.Element {
  if (mode === 'none') {
    return (
      <div className="space-y-2 text-sm">
        <dl className="space-y-1">
          <Row label="Licence Mode" value="Enterprise (No-licence)" />
          <Row label="Enterprise ID" value="(not set)" />
        </dl>
        <p className="text-xs text-text-secondary">
          This build does not require a Keygen.sh activation. All licence checks short-circuit to valid.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2 text-sm">
      <dl className="space-y-1">
        <Row label="Licence Mode" value="Standard (Keygen.sh)" />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between border-b border-border-subtle py-1">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-text-primary font-mono">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="block">
      <span className="text-text-secondary">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
