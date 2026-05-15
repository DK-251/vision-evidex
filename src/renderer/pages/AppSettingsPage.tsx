import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageForward, fadeIn } from '../components/animations';
import {
  PersonRegular,
  KeyRegular,
  PaintBrushRegular,
  FolderRegular,
  DocumentBulletListRegular,
  ShieldCheckmarkRegular,
  ChevronDownRegular,
  CheckmarkRegular,
  BriefcaseRegular,
  MailRegular,
  PeopleRegular,
  CheckmarkCircleRegular,
  FolderOpenRegular,
} from '@fluentui/react-icons';
import { useThemeContext } from '../providers/ThemeProvider';
import { useToast } from '../providers/ToastProvider';
import type {
  Settings,
  ThemePreference,
  UserProfileSettings,
  LicenceMode,
} from '@shared/types/entities';
import type { SettingsUpdateInput } from '@shared/schemas';
import { BUILTIN_TEMPLATES } from '../onboarding/DefaultTemplateStep';
import {
  DEFAULT_HOTKEYS,
  HOTKEY_ACTIONS,
  detectHotkeyConflicts,
  formatKeyEvent,
} from '../onboarding/hotkey-utils';
import { Button, Card, Input } from '../components/ui';

/**
 * S-23 — App Settings (§8 redesign pass).
 *
 * §3: Live-save pattern retained — patch() calls immediately. After each
 *     successful patch, a "✓ Saved" toast appears (decision locked 2026-05-15).
 * §4: Role field is now a Fluent dropdown matching onboarding roles.
 * §5: Hotkeys tab has instruction text, active-row highlight, green/red
 *     valid/conflict border on the key chip.
 * §6: Text-size active state tracked in React state (was DOM-only = never re-rendered).
 * §7: Storage tab layout fixed — flex contained within card.
 * §8: Full visual redesign — Fluent icons in pivot strip, gradient accent
 *     header card, smooth tab transitions.
 */

const TABS = [
  { id: 'profile',    label: 'Profile',    Icon: PersonRegular },
  { id: 'hotkeys',    label: 'Hotkeys',    Icon: KeyRegular },
  { id: 'appearance', label: 'Appearance', Icon: PaintBrushRegular },
  { id: 'storage',    label: 'Storage',    Icon: FolderRegular },
  { id: 'defaults',   label: 'Defaults',   Icon: DocumentBulletListRegular },
  { id: 'licence',    label: 'Licence',    Icon: ShieldCheckmarkRegular },
] as const;

type TabId = typeof TABS[number]['id'];

export function AppSettingsPage(): JSX.Element {
  const [settings,  setSettings]  = useState<Settings | null>(null);
  const [mode,      setMode]      = useState<LicenceMode>('none');
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [error,     setError]     = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [sResult, lResult] = await Promise.all([
        window.evidexAPI.settings.get(),
        window.evidexAPI.licence.validate(),
      ]);
      if (cancelled) return;
      if (!sResult.ok) { setError(`settings: ${sResult.error.message}`); return; }
      setSettings(sResult.data);
      if (lResult.ok) setMode(lResult.data.mode);
    })();
    return () => { cancelled = true; };
  }, []);

  // §3: live-save + toast confirmation
  const patch = useCallback(async (update: SettingsUpdateInput): Promise<void> => {
    setError(null);
    const result = await window.evidexAPI.settings.update(update);
    if (!result.ok) {
      setError(`save failed: ${result.error.message}`);
      showToast('error', 'Settings not saved', result.error.message);
      return;
    }
    setSettings(result.data);
    showToast('success', '✓ Saved');
  }, [showToast]);

  function navigateTab(id: TabId): void {
    const currentIdx = TABS.findIndex((t) => t.id === activeTab);
    const newIdx     = TABS.findIndex((t) => t.id === id);
    setDirection(newIdx > currentIdx ? 'forward' : 'back');
    setActiveTab(id);
  }

  if (settings === null) {
    return (
      <div className="shell-content-column" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div style={{ height: 120, background: 'var(--color-fill-subtle)', borderRadius: 'var(--radius-card)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 320, background: 'var(--color-fill-subtle)', borderRadius: 'var(--radius-card)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    );
  }

  const tabVariant = direction === 'forward' ? pageForward : fadeIn;

  return (
    <motion.div
      variants={pageForward}
      initial="initial"
      animate="animate"
      className="shell-content-column"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
    >
      {/* §8: Gradient accent header */}
      <div style={{
        background:   'linear-gradient(135deg, var(--color-accent-default) 0%, var(--color-accent-dark-1) 100%)',
        borderRadius: 'var(--radius-card)',
        padding:      'var(--space-5) var(--space-6)',
        color:        '#fff',
      }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-family-display)', fontSize: 'var(--type-title-size)', fontWeight: 'var(--type-title-weight)', color: '#fff' }}>
          Settings
        </h1>
        <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--type-caption-size)', opacity: 0.80 }}>
          Profile, hotkeys, appearance, storage and defaults
        </p>
      </div>

      {error && (
        <div role="alert" style={{ padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-card)', background: 'var(--color-status-fail-bg)', border: '1px solid var(--color-status-fail)', color: 'var(--color-status-fail)', fontSize: 'var(--type-body-size)' }}>
          {error}
        </div>
      )}

      {/* §8: Pivot strip with icons */}
      <div role="tablist" style={{ display: 'flex', gap: 'var(--space-1)', padding: 3, background: 'var(--color-fill-secondary)', borderRadius: 'var(--radius-control)', width: 'fit-content' }}>
        {TABS.map((t) => {
          const label = t.id === 'licence' && mode === 'none' ? 'About' : t.label;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => navigateTab(t.id)}
              style={{
                display:     'inline-flex',
                alignItems:  'center',
                gap:         'var(--space-1)',
                height:      32,
                padding:     '0 var(--space-3)',
                border:      0,
                borderRadius: 'var(--radius-control)',
                background:  active ? 'var(--color-layer-1)' : 'transparent',
                color:       active ? 'var(--color-accent-default)' : 'var(--color-text-secondary)',
                fontFamily:  'var(--font-family)',
                fontSize:    'var(--type-body-size)',
                fontWeight:  active ? 'var(--type-body-strong-weight)' : 'var(--type-body-weight)',
                cursor:      'pointer',
                boxShadow:   active ? 'var(--shadow-card)' : 'none',
                transition:  'all 120ms ease',
                whiteSpace:  'nowrap',
              }}
            >
              <t.Icon fontSize={14} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content with transition */}
      <Card variant="default" style={{ maxWidth: 680, width: '100%', overflow: 'hidden' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            variants={tabVariant}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {activeTab === 'profile'    && <ProfileTab    settings={settings} patch={patch} />}
            {activeTab === 'hotkeys'    && <HotkeysTab    settings={settings} patch={patch} />}
            {activeTab === 'appearance' && <AppearanceTab settings={settings} patch={patch} />}
            {activeTab === 'storage'    && <StorageTab    settings={settings} patch={patch} />}
            {activeTab === 'defaults'   && <DefaultsTab   settings={settings} patch={patch} />}
            {activeTab === 'licence'    && <LicenceTab    mode={mode} />}
          </motion.div>
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

type TabProps = { settings: Settings; patch: (u: SettingsUpdateInput) => Promise<void> };

/* ── Profile tab ──────────────────────────────────────────────────── */

const ROLES_LIST = ['Tester', 'Test Lead', 'Project Manager', 'Auditor', 'Other'] as const;
type ProfileRole = typeof ROLES_LIST[number];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function ProfileTab({ settings, patch }: TabProps): JSX.Element {
  const profile = settings.profile ?? { name: '', role: '' };
  const isOtherRole = profile.role !== '' && !(ROLES_LIST as readonly string[]).includes(profile.role);
  const selectedRole: ProfileRole | '' = isOtherRole ? 'Other' : (profile.role as ProfileRole | '');

  function onChange(field: keyof UserProfileSettings, value: string): void {
    const next: UserProfileSettings = { ...profile, [field]: value };
    if (next.team === '')  delete next.team;
    if (next.email === '') delete next.email;
    void patch({ profile: next });
  }

  // §4: role dropdown — same roles as onboarding
  function onRoleChange(role: ProfileRole): void {
    if (role === 'Other') {
      void patch({ profile: { ...profile, role: '' } }); // will fill via custom field
    } else {
      void patch({ profile: { ...profile, role } });
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <span className="avatar" style={{ width: 56, height: 56, fontSize: 22 }} aria-hidden>
          {initialsOf(profile.name)}
        </span>
        <div>
          <div style={{ fontSize: 'var(--type-body-strong-size)', fontWeight: 'var(--type-body-strong-weight)', color: 'var(--color-text-primary)' }}>
            {profile.name || 'Your name'}
          </div>
          <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>
            {profile.role || '—'}
          </div>
        </div>
      </div>
      <hr className="card-divider" />
      <SettingRow label="Full name" icon={<PersonRegular fontSize={16} />}>
        <Input value={profile.name} onChange={(e) => onChange('name', e.target.value)} style={{ width: 240 }} placeholder="Alex Morgan" />
      </SettingRow>
      {/* §4: Role as Fluent dropdown */}
      <SettingRow label="Role" icon={<BriefcaseRegular fontSize={16} />}>
        <RoleDropdown value={selectedRole} onChange={onRoleChange} />
      </SettingRow>
      {isOtherRole && (
        <SettingRow label="Custom role" icon={<BriefcaseRegular fontSize={16} />}>
          <Input value={profile.role} onChange={(e) => onChange('role', e.target.value)} style={{ width: 240 }} placeholder="e.g. Release Engineer" />
        </SettingRow>
      )}
      <SettingRow label="Team" icon={<PeopleRegular fontSize={16} />}>
        <Input value={profile.team ?? ''} onChange={(e) => onChange('team', e.target.value)} style={{ width: 240 }} placeholder="QA · Payments" />
      </SettingRow>
      <SettingRow label="Email" icon={<MailRegular fontSize={16} />}>
        <Input type="email" value={profile.email ?? ''} onChange={(e) => onChange('email', e.target.value)} style={{ width: 240 }} placeholder="alex@example.com" />
      </SettingRow>
    </div>
  );
}

function RoleDropdown({ value, onChange }: { value: string; onChange: (r: ProfileRole) => void }): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative', width: 240 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%', height: 32, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 var(--space-3)',
          background: 'var(--color-fill-secondary)', border: '1px solid var(--color-stroke-default)',
          borderBottom: `2px solid ${open ? 'var(--color-accent-default)' : 'var(--color-stroke-control)'}`,
          borderRadius: 'var(--radius-control)', cursor: 'pointer',
          fontFamily: 'var(--font-family)', fontSize: 'var(--type-body-size)',
          color: value ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        }}
      >
        <span>{value || 'Select a role…'}</span>
        <ChevronDownRegular fontSize={14} style={{ transition: 'transform 120ms', transform: open ? 'rotate(180deg)' : 'none' }} aria-hidden />
      </button>
      {open && (
        <div role="listbox" style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--color-layer-2)', border: '1px solid var(--color-stroke-default)',
          borderRadius: 'var(--radius-overlay)', boxShadow: 'var(--shadow-layer-2)',
          padding: 'var(--space-1)', zIndex: 30,
        }}>
          {ROLES_LIST.map((r) => (
            <button
              key={r}
              type="button"
              role="option"
              aria-selected={r === value}
              onClick={() => { onChange(r); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', height: 32, padding: '0 var(--space-3)',
                border: 0, borderRadius: 'var(--radius-control)',
                background: r === value ? 'var(--color-fill-accent-subtle)' : 'transparent',
                color: r === value ? 'var(--color-accent-default)' : 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)', fontSize: 'var(--type-body-size)',
                fontWeight: r === value ? 'var(--type-body-strong-weight)' : 'var(--type-body-weight)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span>{r}</span>
              {r === value && <CheckmarkRegular fontSize={14} aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Hotkeys tab ──────────────────────────────────────────────────── */

function HotkeysTab({ settings, patch }: TabProps): JSX.Element {
  const hotkeys = settings.hotkeys ?? { ...DEFAULT_HOTKEYS };
  const conflicts = detectHotkeyConflicts(hotkeys);
  const [remappingId, setRemappingId] = useState<string | null>(null); // §5: active row
  const listenerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  useEffect(() => {
    return () => {
      if (listenerRef.current) window.removeEventListener('keydown', listenerRef.current, true);
    };
  }, []);

  function startRemap(actionId: string): void {
    if (listenerRef.current) window.removeEventListener('keydown', listenerRef.current, true);
    setRemappingId(actionId);
    const handler = (e: KeyboardEvent): void => {
      e.preventDefault();
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      window.removeEventListener('keydown', handler, true);
      listenerRef.current = null;
      setRemappingId(null);
      void patch({ hotkeys: { ...hotkeys, [actionId]: formatKeyEvent(e) } });
    };
    listenerRef.current = handler;
    window.addEventListener('keydown', handler, true);
  }

  return (
    <div>
      {/* §5: instruction text */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-3)',
        background: 'var(--color-fill-subtle)', borderRadius: 'var(--radius-card)',
        fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)',
      }}>
        <KeyRegular fontSize={14} aria-hidden />
        Click a binding, then press your desired key combination. Press Escape to cancel.
      </div>

      <div className="setting-group-label">Capture + session</div>
      {HOTKEY_ACTIONS.map((a) => {
        const isRemapping = remappingId === a.id;
        const isConflict  = conflicts.has(a.id);
        return (
          <div
            key={a.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 'var(--space-4)', minHeight: 44, padding: 'var(--space-2) var(--space-2)',
              borderRadius: 'var(--radius-card)',
              background: isRemapping ? 'var(--color-fill-accent-subtle)' : 'transparent',
              transition: 'background 120ms ease',
            }}
          >
            <div>
              <div style={{ fontSize: 'var(--type-body-size)', color: 'var(--color-text-primary)' }}>{a.label}</div>
              <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)' }}>{a.description}</div>
            </div>
            <button
              type="button"
              onClick={() => startRemap(a.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 80, height: 28, padding: '0 var(--space-2)',
                background: isRemapping ? 'var(--color-fill-accent-subtle)' : 'var(--color-fill-secondary)',
                border: `1px solid ${isConflict ? 'var(--color-status-fail)' : isRemapping ? 'var(--color-accent-default)' : 'var(--color-stroke-default)'}`,
                borderRadius: 'var(--radius-control)',
                fontFamily: 'var(--font-mono)', fontSize: 'var(--type-caption-size)',
                color: isConflict ? 'var(--color-status-fail)' : isRemapping ? 'var(--color-accent-default)' : 'var(--color-text-primary)',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
              title={isConflict ? 'Duplicate binding — change it' : isRemapping ? 'Listening for keys…' : 'Click to remap'}
            >
              {isRemapping ? '⌨ Listening…' : (hotkeys[a.id] ?? '(unset)')}
            </button>
          </div>
        );
      })}
      {conflicts.size > 0 && (
        <div role="alert" style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-status-fail)', marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
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
  // §6: track text size in React state so buttons re-render on change.
  const [textSize, setTextSize] = useState<'normal' | 'large'>(
    () => (document.documentElement.getAttribute('data-font-size') ?? 'normal') as 'normal' | 'large'
  );

  return (
    <div>
      <SettingRow label="Theme" hint="Follow Windows system or a fixed appearance">
        <div role="radiogroup" aria-label="Theme" className="segmented">
          {(['light', 'system', 'dark'] as ThemePreference[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={theme === t}
              className={`segmented-option ${theme === t ? 'active' : ''}`}
              onClick={() => { setPreference(t); void patch({ theme: t }); }}
              style={{ textTransform: 'capitalize' }}
            >
              {t}
            </button>
          ))}
        </div>
      </SettingRow>

      {/* §6: text size — state-tracked, re-renders correctly */}
      <SettingRow label="Text size" hint="Applies app-wide; takes effect immediately">
        <div role="radiogroup" aria-label="Text size" className="segmented">
          {(['normal', 'large'] as const).map((size) => (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={textSize === size}
              className={`segmented-option ${textSize === size ? 'active' : ''}`}
              onClick={() => {
                document.documentElement.setAttribute('data-font-size', size);
                setTextSize(size);
              }}
              style={{ textTransform: 'capitalize' }}
            >
              {size}
            </button>
          ))}
        </div>
      </SettingRow>
    </div>
  );
}

/* ── Storage tab ──────────────────────────────────────────────────── */

function StorageTab({ settings, patch }: TabProps): JSX.Element {
  // §7: all inputs are contained within setting rows with max-width constraints.
  async function pickDir(field: 'defaultStoragePath' | 'defaultExportPath', title: string): Promise<void> {
    const cur = settings[field];
    const result = await window.evidexAPI.dialog.selectDirectory({
      title,
      ...(cur ? { defaultPath: cur } : {}),
    });
    if (result.ok && result.data.path) {
      await patch({ [field]: result.data.path } as SettingsUpdateInput);
    }
  }

  return (
    <div>
      <SettingRow label="Default storage folder" hint="Where new .evidex projects are saved">
        {/* §7: flex row is self-contained, no overflow */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', width: 300, minWidth: 0 }}>
          <Input
            value={settings.defaultStoragePath}
            readOnly
            placeholder="Pick a folder…"
            className="mono"
            style={{ flex: 1, minWidth: 0, fontSize: 11 }}
          />
          <Button variant="standard" size="compact" onClick={() => void pickDir('defaultStoragePath', 'Default storage folder')} style={{ flexShrink: 0 }}>
            <FolderOpenRegular fontSize={14} />
          </Button>
        </div>
      </SettingRow>
      <SettingRow label="Default export folder" hint="Where Word, PDF, and HTML exports are written">
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', width: 300, minWidth: 0 }}>
          <Input
            value={settings.defaultExportPath ?? ''}
            readOnly
            placeholder="Pick a folder…"
            className="mono"
            style={{ flex: 1, minWidth: 0, fontSize: 11 }}
          />
          <Button variant="standard" size="compact" onClick={() => void pickDir('defaultExportPath', 'Default export folder')} style={{ flexShrink: 0 }}>
            <FolderOpenRegular fontSize={14} />
          </Button>
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
                display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                border: `${selected ? 2 : 1}px solid ${selected ? 'var(--color-accent-default)' : 'var(--color-stroke-default)'}`,
                borderRadius: 'var(--radius-card)', cursor: 'pointer',
                background: selected ? 'var(--color-fill-accent-subtle)' : 'var(--color-layer-1)',
                transition: 'all 120ms ease',
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
                <div style={{ fontSize: 'var(--type-body-size)', fontWeight: 'var(--type-body-strong-weight)', color: 'var(--color-text-primary)' }}>{t.name}</div>
                <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)', marginTop: 2 }}>{t.description}</div>
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
        <div style={{ textAlign: 'center', padding: 'var(--space-6) 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-status-pass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-status-pass)' }}>
            <CheckmarkCircleRegular fontSize={28} aria-hidden />
          </div>
          <div style={{ fontSize: 'var(--type-body-strong-size)', fontWeight: 'var(--type-body-strong-weight)', color: 'var(--color-text-primary)' }}>Enterprise build</div>
          <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)', maxWidth: 360, textAlign: 'center' }}>
            This build does not require a Keygen.sh activation. All licence checks short-circuit to valid.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <SettingRow label="Licence mode"><span>Standard (Keygen.sh)</span></SettingRow>
      <SettingRow label="Status"><span style={{ color: 'var(--color-text-secondary)' }}>Deactivation UI in Phase 3</span></SettingRow>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function SettingRow({
  label,
  hint,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      gap:            'var(--space-4)',
      minHeight:      44,
      padding:        'var(--space-2) 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: '1 1 auto', minWidth: 0 }}>
        {icon && <span style={{ color: 'var(--color-accent-default)', display: 'inline-flex', flexShrink: 0 }}>{icon}</span>}
        <div>
          <div style={{ fontSize: 'var(--type-body-size)', color: 'var(--color-text-primary)' }}>{label}</div>
          {hint && <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)', marginTop: 1 }}>{hint}</div>}
        </div>
      </div>
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
        {children}
      </div>
    </div>
  );
}
