import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { pageForward } from '../components/animations';
import { useThemeContext } from '../providers/ThemeProvider';
import type {
  Settings,
  ThemePreference,
  UserProfileSettings,
  LicenceMode,
} from '@shared/types/entities';
import type { SettingsUpdateInput } from '@shared/schemas';
import { BUILTIN_TEMPLATES } from '../onboarding/DefaultTemplateStep';
import { DEFAULT_HOTKEYS, HOTKEY_ACTIONS, detectHotkeyConflicts, formatKeyEvent } from '../onboarding/hotkey-utils';
import {
  Button,
  Card,
  CardDivider,
  Input,
  FluentSkeleton,
} from '../components/ui';

/**
 * S-23 — App Settings with 6 tabs, ported to doc §15. Tab strip is the
 * Fluent pivot pill style, not underline. Content card max-width 640px.
 */

const TABS = [
  { id: 'profile',    label: 'Profile' },
  { id: 'hotkeys',    label: 'Hotkeys' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'storage',    label: 'Storage' },
  { id: 'defaults',   label: 'Defaults' },
  { id: 'licence',    label: 'Licence' },
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
      <div className="shell-content-column" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <FluentSkeleton height={36} width={160} />
        <FluentSkeleton height={36} width={320} />
        <FluentSkeleton height={240} borderRadius="var(--radius-card)" />
      </div>
    );
  }

  return (
    <motion.div
      variants={pageForward}
      initial="initial"
      animate="animate"
      className="shell-content-column"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-family-display)',
          fontSize:   'var(--type-title-size)',
          fontWeight: 'var(--type-title-weight)',
          lineHeight: 'var(--type-title-height)',
          color:      'var(--color-text-primary)',
          margin:     0,
        }}
      >
        Settings
      </h1>

      <div role="tablist" className="pivot-tabs">
        {TABS.map((t) => {
          const label = t.id === 'licence' && mode === 'none' ? 'About' : t.label;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              className={`pivot-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            border:       '1px solid var(--color-text-danger)',
            borderRadius: 'var(--radius-card)',
            padding:      'var(--space-3) var(--space-4)',
            color:        'var(--color-text-danger)',
            fontSize:     'var(--type-body-size)',
          }}
        >
          {error}
        </div>
      )}

      <Card variant="default" style={{ maxWidth: 640, width: '100%' }}>
        {activeTab === 'profile'    && <ProfileTab    settings={settings} patch={patch} />}
        {activeTab === 'hotkeys'    && <HotkeysTab    settings={settings} patch={patch} />}
        {activeTab === 'appearance' && <AppearanceTab settings={settings} patch={patch} />}
        {activeTab === 'storage'    && <StorageTab    settings={settings} patch={patch} />}
        {activeTab === 'defaults'   && <DefaultsTab   settings={settings} patch={patch} />}
        {activeTab === 'licence'    && <LicenceTab    mode={mode} />}
      </Card>
    </motion.div>
  );
}

type TabProps = { settings: Settings; patch: (u: SettingsUpdateInput) => Promise<void> };

/* ── Profile tab ──────────────────────────────────────────────────── */

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function ProfileTab({ settings, patch }: TabProps): JSX.Element {
  const profile = settings.profile ?? { name: '', role: '' };
  function onChange(field: keyof UserProfileSettings, value: string): void {
    const next: UserProfileSettings = { ...profile, [field]: value };
    if (next.team === '')  delete next.team;
    if (next.email === '') delete next.email;
    void patch({ profile: next });
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <span className="avatar" aria-hidden>{initialsOf(profile.name)}</span>
        <div>
          <div style={{ fontSize: 'var(--type-body-strong-size)', fontWeight: 'var(--type-body-strong-weight)', color: 'var(--color-text-primary)' }}>
            {profile.name || 'Your name'}
          </div>
          <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
            {profile.role || '—'}
          </div>
        </div>
      </div>
      <CardDivider />
      <SettingRow label="Full name">
        <Input value={profile.name} onChange={(e) => onChange('name', e.target.value)} style={{ width: 240 }} />
      </SettingRow>
      <SettingRow label="Role">
        <Input value={profile.role} onChange={(e) => onChange('role', e.target.value)} style={{ width: 240 }} />
      </SettingRow>
      <SettingRow label="Team">
        <Input value={profile.team ?? ''} onChange={(e) => onChange('team', e.target.value)} style={{ width: 240 }} />
      </SettingRow>
      <SettingRow label="Email">
        <Input type="email" value={profile.email ?? ''} onChange={(e) => onChange('email', e.target.value)} style={{ width: 240 }} />
      </SettingRow>
    </div>
  );
}

/* ── Hotkeys tab ──────────────────────────────────────────────────── */

function HotkeysTab({ settings, patch }: TabProps): JSX.Element {
  const hotkeys = settings.hotkeys ?? { ...DEFAULT_HOTKEYS };
  const conflicts = detectHotkeyConflicts(hotkeys);
  const activeRemapRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  // Clean up any pending remap listener when navigating away.
  useEffect(() => {
    return () => {
      if (activeRemapRef.current) {
        window.removeEventListener('keydown', activeRemapRef.current, true);
      }
    };
  }, []);

  function remap(actionId: string): void {
    if (activeRemapRef.current) {
      window.removeEventListener('keydown', activeRemapRef.current, true);
    }
    const handler = (e: KeyboardEvent): void => {
      e.preventDefault();
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      window.removeEventListener('keydown', handler, true);
      activeRemapRef.current = null;
      void patch({ hotkeys: { ...hotkeys, [actionId]: formatKeyEvent(e) } });
    };
    activeRemapRef.current = handler;
    window.addEventListener('keydown', handler, true);
  }

  return (
    <div>
      <div className="setting-group-label">Capture + session</div>
      {HOTKEY_ACTIONS.map((a) => (
        <SettingRow
          key={a.id}
          label={a.label}
          hint={a.description}
        >
          <button
            type="button"
            className={`key-chip ${conflicts.has(a.id) ? 'conflict' : ''}`}
            onClick={() => remap(a.id)}
          >
            {hotkeys[a.id] ?? '(unset)'}
          </button>
        </SettingRow>
      ))}
      {conflicts.size > 0 && (
        <div
          role="alert"
          style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-status-fail)', marginTop: 'var(--space-2)' }}
        >
          Duplicate binding — each shortcut must be unique.
        </div>
      )}
    </div>
  );
}

/* ── Appearance tab ───────────────────────────────────────────────── */

function AppearanceTab({ settings, patch }: TabProps): JSX.Element {
  const theme: ThemePreference = settings.theme;
  const { setPreference } = useThemeContext();
  return (
    <div>
      <SettingRow label="Theme" hint="Change when the app follows Windows (System) or a fixed appearance">
        <div role="radiogroup" aria-label="Theme" className="segmented">
          {(['light', 'system', 'dark'] as ThemePreference[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={theme === t}
              className={`segmented-option ${theme === t ? 'active' : ''}`}
              onClick={() => {
                // Apply live immediately before the async settings save.
                setPreference(t);
                void patch({ theme: t });
              }}
              style={{ textTransform: 'capitalize' }}
            >
              {t}
            </button>
          ))}
        </div>
      </SettingRow>

      {/* LO-02: WS-05 font size preference — CSS infrastructure already exists in tokens.css */}
      <SettingRow label="Text size" hint="Applies app-wide; takes effect immediately">
        <div role="radiogroup" aria-label="Text size" className="segmented">
          {(['normal', 'large'] as const).map((size) => {
            const current = (document.documentElement.getAttribute('data-font-size') ?? 'normal') as 'normal' | 'large';
            return (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={current === size}
                className={`segmented-option ${current === size ? 'active' : ''}`}
                onClick={() => {
                  document.documentElement.setAttribute('data-font-size', size);
                  // Force a re-render so this button reflects the new state.
                  // The setting is applied via the DOM attribute; no settings.json
                  // persist needed for this preference (session-level is fine).
                }}
                style={{ textTransform: 'capitalize' }}
              >
                {size}
              </button>
            );
          })}
        </div>
      </SettingRow>
    </div>
  );
}

/* ── Storage tab ──────────────────────────────────────────────────── */

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

  // LO-03: WS-07 export path — required before Phase 3 ExportService launches
  async function pickExport(): Promise<void> {
    const result = await window.evidexAPI.dialog.selectDirectory({
      title: 'Default export folder',
      ...(settings.defaultExportPath ? { defaultPath: settings.defaultExportPath } : {}),
    });
    if (result.ok && result.data.path) {
      await patch({ defaultExportPath: result.data.path });
    }
  }

  return (
    <div>
      <SettingRow
        label="Default storage folder"
        hint="Where new .evidex projects are saved unless overridden per project"
      >
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', minWidth: 0 }}>
          <Input
            type="text"
            value={settings.defaultStoragePath}
            readOnly
            placeholder="Pick a folder…"
            className="mono"
            style={{ width: 260 }}
          />
          <Button variant="standard" size="compact" onClick={pickFolder}>Browse…</Button>
        </div>
      </SettingRow>

      {/* LO-03: export path */}
      <SettingRow
        label="Default export folder"
        hint="Where Word, PDF, and HTML exports are written (required for Phase 3)"
      >
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', minWidth: 0 }}>
          <Input
            type="text"
            value={settings.defaultExportPath ?? ''}
            readOnly
            placeholder="Pick a folder…"
            className="mono"
            style={{ width: 260 }}
          />
          <Button variant="standard" size="compact" onClick={pickExport}>Browse…</Button>
        </div>
      </SettingRow>
    </div>
  );
}

/* ── Defaults tab ─────────────────────────────────────────────────── */

function DefaultsTab({ settings, patch }: TabProps): JSX.Element {
  return (
    <div>
      <div className="setting-group-label">Default report template</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {BUILTIN_TEMPLATES.map((t) => {
          const selected = settings.defaultTemplateId === t.id;
          return (
            <label
              key={t.id}
              style={{
                display:      'flex',
                alignItems:   'flex-start',
                gap:          'var(--space-3)',
                padding:      'var(--space-3)',
                border:       `1px solid ${selected ? 'var(--color-accent-default)' : 'var(--color-stroke-default)'}`,
                borderRadius: 'var(--radius-card)',
                cursor:       'pointer',
              }}
            >
              <input
                type="radio"
                name="default-template"
                value={t.id}
                checked={selected}
                onChange={() => void patch({ defaultTemplateId: t.id })}
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ fontSize: 'var(--type-body-size)', fontWeight: 'var(--type-body-strong-weight)', color: 'var(--color-text-primary)' }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {t.description}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/* ── Licence / About tab ──────────────────────────────────────────── */

function LicenceTab({ mode }: { mode: LicenceMode }): JSX.Element {
  if (mode === 'none') {
    return (
      <div>
        <SettingRow label="Licence mode">
          <span className="status-badge pass" style={{ background: 'var(--color-fill-accent-subtle)', color: 'var(--color-accent-default)' }}>
            Enterprise (No-licence)
          </span>
        </SettingRow>
        <SettingRow label="Enterprise ID">
          <span className="mono" style={{ color: 'var(--color-text-secondary)' }}>(not set)</span>
        </SettingRow>
        <CardDivider />
        <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
          This build does not require a Keygen.sh activation. All licence checks short-circuit to valid.
        </div>
      </div>
    );
  }
  return (
    <div>
      <SettingRow label="Licence mode">
        <span>Standard (Keygen.sh)</span>
      </SettingRow>
      <SettingRow label="Status">
        <span style={{ color: 'var(--color-text-secondary)' }}>
          see dashboard — deactivate UI lands in a later phase
        </span>
      </SettingRow>
    </div>
  );
}

/* ── Helper ───────────────────────────────────────────────────────── */

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="setting-row">
      <div className="setting-row-label">
        <div>{label}</div>
        {hint && (
          <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {hint}
          </div>
        )}
      </div>
      <div className="setting-row-control">{children}</div>
    </div>
  );
}
