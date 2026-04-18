import { useOnboardingStore, selectVisibleSteps, selectCurrentStep, selectIsFirst, selectIsLast } from '../stores/onboarding-store';

/**
 * S-02 — onboarding wizard skeleton.
 *
 * Phase 1 Wk4 D20: navigation state machine wired; step bodies are
 * placeholder descriptions. Real step forms land in Wk5 D21–D22 (OB-01
 * through OB-13); the `settings:*` IPC channels that gate entry into
 * this page land there too.
 */
export function OnboardingPage(): JSX.Element {
  const visible = useOnboardingStore(selectVisibleSteps);
  const step = useOnboardingStore(selectCurrentStep);
  const isFirst = useOnboardingStore(selectIsFirst);
  const isLast = useOnboardingStore(selectIsLast);
  const currentIndex = useOnboardingStore((s) => s.currentIndex);
  const completed = useOnboardingStore((s) => s.completed);
  const next = useOnboardingStore((s) => s.next);
  const back = useOnboardingStore((s) => s.back);
  const skip = useOnboardingStore((s) => s.skip);
  const complete = useOnboardingStore((s) => s.complete);

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-primary">
        <div
          className="max-w-md w-full p-8 rounded-lg text-center"
          style={{ boxShadow: 'var(--shadow-neumorphic-out)' }}
        >
          <h1 className="text-2xl font-semibold text-text-primary mb-2">Onboarding complete</h1>
          <p className="text-sm text-text-secondary">
            Dashboard entry wires up in Wk5 D23. For now, re-run the wizard with Reset.
          </p>
          <button
            type="button"
            onClick={() => useOnboardingStore.getState().reset()}
            className="mt-6 px-4 py-2 rounded-md border border-border-subtle text-text-primary"
          >
            Reset
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-primary p-6">
      <div
        className="max-w-lg w-full rounded-lg"
        style={{ boxShadow: 'var(--shadow-neumorphic-out)' }}
      >
        <div className="px-8 pt-6">
          <p className="text-xs uppercase tracking-wide text-text-secondary">
            Step {currentIndex + 1} of {visible.length}
          </p>
          <h1 className="text-2xl font-semibold text-text-primary mt-1">{step.title}</h1>
          <p className="text-sm text-text-secondary mt-2">{step.description}</p>
        </div>

        <div className="px-8 py-6 text-sm text-text-secondary">
          <p>
            Placeholder content for <span className="font-mono">{step.id}</span>. Real form lands
            in Phase 1 Week 5.
          </p>
        </div>

        <div
          className="px-8 py-4 flex items-center justify-between border-t border-border-subtle"
          style={{ borderTopColor: 'var(--color-border-subtle)' }}
        >
          <button
            type="button"
            onClick={back}
            disabled={isFirst}
            className="px-4 py-2 rounded-md text-text-primary disabled:opacity-40"
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            {step.optional && !isLast ? (
              <button
                type="button"
                onClick={skip}
                className="px-4 py-2 rounded-md text-text-secondary"
              >
                Skip
              </button>
            ) : null}
            {isLast ? (
              <button
                type="button"
                onClick={complete}
                className="px-4 py-2 rounded-md bg-accent-primary text-white"
              >
                Finish
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="px-4 py-2 rounded-md bg-accent-primary text-white"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
