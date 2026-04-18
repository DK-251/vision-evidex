import { useOnboardingStore } from '../stores/onboarding-store';
import type { UserProfileData } from './validators';

const ROLES = ['Tester', 'Test Lead', 'Project Manager', 'Auditor', 'Other'] as const;

export function UserProfileStep(): JSX.Element {
  const current = useOnboardingStore(
    (s) => (s.data['profile'] as Partial<UserProfileData> | undefined) ?? {}
  );
  const setStepData = useOnboardingStore((s) => s.setStepData);

  function patch(update: Partial<UserProfileData>): void {
    setStepData('profile', { ...current, ...update });
  }

  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="text-text-secondary">
          Full name <span className="text-accent-error">*</span>
        </span>
        <input
          type="text"
          value={current.name ?? ''}
          onChange={(e) => patch({ name: e.target.value })}
          className="mt-1 w-full rounded-md border border-border-subtle px-3 py-2 text-text-primary"
        />
      </label>

      <label className="block">
        <span className="text-text-secondary">
          Role <span className="text-accent-error">*</span>
        </span>
        <select
          value={current.role ?? ''}
          onChange={(e) => patch({ role: e.target.value })}
          className="mt-1 w-full rounded-md border border-border-subtle px-3 py-2 text-text-primary"
        >
          <option value="">Select a role…</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-text-secondary">Team name</span>
        <input
          type="text"
          value={current.team ?? ''}
          onChange={(e) => patch({ team: e.target.value })}
          className="mt-1 w-full rounded-md border border-border-subtle px-3 py-2 text-text-primary"
        />
      </label>

      <label className="block">
        <span className="text-text-secondary">Email</span>
        <input
          type="email"
          value={current.email ?? ''}
          onChange={(e) => patch({ email: e.target.value })}
          placeholder="you@example.com"
          className="mt-1 w-full rounded-md border border-border-subtle px-3 py-2 text-text-primary"
        />
      </label>
    </div>
  );
}
