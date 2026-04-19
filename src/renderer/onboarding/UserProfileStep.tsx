import { useMemo } from 'react';
import {
  PersonRegular,
  PersonAccountsRegular,
  MailRegular,
  PeopleRegular,
  BriefcaseRegular,
  EditRegular,
} from '@fluentui/react-icons';
import { useOnboardingStore } from '../stores/onboarding-store';
import type { UserProfileData } from './validators';
import { StepLayout } from './StepLayout';

const ROLES = ['Tester', 'Test Lead', 'Project Manager', 'Auditor', 'Other'] as const;
type Role = typeof ROLES[number];

interface ProfileDraft extends Partial<UserProfileData> {
  firstName?: string;
  lastName?: string;
  customRole?: string;
}

/**
 * Step 4 — User profile. Two-column Fluent form: first/last name row,
 * email/team row, then role dropdown with a third "custom role" input
 * that appears when "Other" is selected. Saves to onboarding-store as
 * a single `name` field (first + last joined) so it persists into
 * settings.profile.name unchanged from D22 contract.
 */
export function UserProfileStep(): JSX.Element {
  const draft = useOnboardingStore(
    (s) => (s.data['profile'] as ProfileDraft | undefined) ?? {}
  );
  const setStepData = useOnboardingStore((s) => s.setStepData);

  const { firstName, lastName } = useMemo(() => splitName(draft), [draft]);

  function patchRaw(update: Partial<ProfileDraft>): void {
    const next: ProfileDraft = { ...draft, ...update };
    const fn = (next.firstName ?? '').trim();
    const ln = (next.lastName  ?? '').trim();
    next.name = [fn, ln].filter(Boolean).join(' ');
    if (next.team === '')  delete next.team;
    if (next.email === '') delete next.email;
    if (next.role === 'Other') {
      // Persist the custom role string as `role` for downstream consumers.
      // When customRole is empty we leave `role` blank so the outer Next
      // stays disabled until the user types something.
      next.role = (next.customRole ?? '').trim();
    }
    setStepData('profile', next);
  }

  const selectedRole: Role | '' =
    draft.role === undefined
      ? ''
      : (ROLES as readonly string[]).includes(draft.role)
        ? (draft.role as Role)
        : 'Other';

  return (
    <StepLayout
      icon={PersonAccountsRegular}
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
          label="First name"
          required
          icon={<PersonRegular fontSize={20} />}
          value={firstName}
          onChange={(v) => patchRaw({ firstName: v })}
          placeholder="Alex"
        />
        <Field
          label="Last name"
          required
          icon={<PersonRegular fontSize={20} />}
          value={lastName}
          onChange={(v) => patchRaw({ lastName: v })}
          placeholder="Morgan"
        />
        <Field
          label="Email"
          icon={<MailRegular fontSize={20} />}
          type="email"
          value={draft.email ?? ''}
          onChange={(v) => patchRaw({ email: v })}
          placeholder="alex.morgan@example.com"
        />
        <Field
          label="Team"
          icon={<PeopleRegular fontSize={20} />}
          value={draft.team ?? ''}
          onChange={(v) => patchRaw({ team: v })}
          placeholder="QA · Payments"
        />
        <SelectField
          label="Role"
          required
          icon={<BriefcaseRegular fontSize={20} />}
          value={selectedRole}
          onChange={(v) => {
            const next: Partial<ProfileDraft> = { role: v };
            if (v === 'Other' && draft.customRole !== undefined) {
              next.customRole = draft.customRole;
            }
            patchRaw(next);
          }}
          options={ROLES as unknown as string[]}
        />
        {selectedRole === 'Other' && (
          <Field
            label="Describe your role"
            required
            icon={<EditRegular fontSize={20} />}
            value={draft.customRole ?? ''}
            onChange={(v) => patchRaw({ customRole: v })}
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

function SelectField({
  label, icon, value, onChange, options, required = false,
}: {
  label: string;
  icon: JSX.Element;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<string>;
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
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>Select a role…</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
    </label>
  );
}
