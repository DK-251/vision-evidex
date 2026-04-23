import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PersonRegular,
  MailRegular,
  PeopleRegular,
  BriefcaseRegular,
  EditRegular,
  ChevronDownRegular,
  CheckmarkRegular,
} from '@fluentui/react-icons';
import { useOnboardingStore } from '../stores/onboarding-store';
import type { UserProfileData } from './validators';
import { StepLayout } from './StepLayout';
import { StepProfile } from '../components/brand/BrandIcons';

const ROLES = ['Tester', 'Test Lead', 'Project Manager', 'Auditor', 'Other'] as const;
type Role = typeof ROLES[number];

interface ProfileDraft extends Partial<UserProfileData> {
  firstName?: string;
  lastName?: string;
  /** Always set when selected role is 'Other' (may be empty string). */
  customRole?: string;
}

/**
 * Step 4 — User profile. Two-column Fluent form with a custom dropdown
 * (theme-aware; native <select> opens a Windows-styled popup that
 * ignores our CSS). All four visible fields + role are required; when
 * role = 'Other' the sixth "Describe your role" field appears and is
 * also required.
 */
export function UserProfileStep(): JSX.Element {
  const draft = useOnboardingStore(
    (s) => (s.data['profile'] as ProfileDraft | undefined) ?? {}
  );
  const setStepData = useOnboardingStore((s) => s.setStepData);

  const { firstName, lastName } = useMemo(() => splitName(draft), [draft]);
  const isOtherMode = draft.customRole !== undefined;

  function setProfile(next: ProfileDraft): void {
    const fn = (next.firstName ?? '').trim();
    const ln = (next.lastName  ?? '').trim();
    next.name = [fn, ln].filter(Boolean).join(' ');
    if (next.team === '')  delete next.team;
    // Derive the final `role` from `customRole` whenever the user is
    // in "Other" mode so typing the custom role unlocks Next.
    if (next.customRole !== undefined) {
      next.role = next.customRole.trim();
    }
    setStepData('profile', next);
  }

  function pickRole(role: Role): void {
    if (role === 'Other') {
      setProfile({ ...draft, customRole: draft.customRole ?? '' });
    } else {
      // Leaving Other — drop customRole so the branch collapses.
      const next: ProfileDraft = { ...draft, role };
      delete next.customRole;
      setProfile(next);
    }
  }

  const selectedRole: Role | '' =
    isOtherMode
      ? 'Other'
      : draft.role === undefined
        ? ''
        : (ROLES as readonly string[]).includes(draft.role)
          ? (draft.role as Role)
          : '';

  return (
    <StepLayout
      icon={StepProfile}
      palette="cool"
      title="Your profile"
      subtext="We use this to attribute captures, sign-offs, and exported reports."
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
        <Field
          label="First name" required
          icon={<PersonRegular fontSize={20} />}
          value={firstName}
          onChange={(v) => setProfile({ ...draft, firstName: v })}
          placeholder="Alex"
        />
        <Field
          label="Last name" required
          icon={<PersonRegular fontSize={20} />}
          value={lastName}
          onChange={(v) => setProfile({ ...draft, lastName: v })}
          placeholder="Morgan"
        />
        <Field
          label="Email" required type="email"
          icon={<MailRegular fontSize={20} />}
          value={draft.email ?? ''}
          onChange={(v) => setProfile({ ...draft, email: v })}
          placeholder="alex.morgan@example.com"
        />
        <Field
          label="Team"
          icon={<PeopleRegular fontSize={20} />}
          value={draft.team ?? ''}
          onChange={(v) => setProfile({ ...draft, team: v })}
          placeholder="QA · Payments"
        />
        <FluentSelect
          label="Role" required
          icon={<BriefcaseRegular fontSize={20} />}
          value={selectedRole}
          options={ROLES as unknown as string[]}
          placeholder="Select a role…"
          onChange={(v) => pickRole(v as Role)}
        />
        {isOtherMode && (
          <Field
            label="Describe your role" required
            icon={<EditRegular fontSize={20} />}
            value={draft.customRole ?? ''}
            onChange={(v) => setProfile({ ...draft, customRole: v })}
            placeholder="e.g. Release Engineer"
          />
        )}
      </div>
    </StepLayout>
  );
}

function splitName(draft: ProfileDraft): { firstName: string; lastName: string } {
  if (draft.firstName !== undefined || draft.lastName !== undefined) {
    return { firstName: draft.firstName ?? '', lastName: draft.lastName ?? '' };
  }
  const name = (draft.name ?? '').trim();
  if (!name) return { firstName: '', lastName: '' };
  const [first, ...rest] = name.split(/\s+/);
  return { firstName: first!, lastName: rest.join(' ') };
}

function Field({
  label, icon, value, onChange, placeholder, type = 'text', required = false,
}: {
  label: string;
  icon: JSX.Element;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email';
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
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...(placeholder ? { placeholder } : {})}
        />
      </div>
    </label>
  );
}

function FluentSelect({
  label, icon, value, onChange, options, placeholder, required = false,
}: {
  label: string;
  icon: JSX.Element;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<string>;
  placeholder?: string;
  required?: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: PointerEvent): void => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const display = value || placeholder || 'Select…';
  const isPlaceholder = !value;

  return (
    <div style={{ display: 'block' }}>
      <span className="field-floating-label">
        {label}
        {required && <span className="req">*</span>}
      </span>
      <div ref={rootRef} className="fluent-select">
        <button
          type="button"
          className="fluent-select-button"
          aria-haspopup="listbox"
          aria-expanded={open}
          data-placeholder={isPlaceholder}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="field-icon">{icon}</span>
          <span className="fluent-select-value">{display}</span>
          <span className="fluent-select-chevron" aria-hidden>
            <ChevronDownRegular fontSize={16} />
          </span>
        </button>
        {open && (
          <div role="listbox" className="fluent-select-popover">
            {options.map((o) => {
              const selected = o === value;
              return (
                <button
                  key={o}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`fluent-select-option${selected ? ' selected' : ''}`}
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                >
                  <span style={{ flex: 1 }}>{o}</span>
                  {selected && (
                    <span aria-hidden style={{ color: 'var(--color-accent-default)' }}>
                      <CheckmarkRegular fontSize={16} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
