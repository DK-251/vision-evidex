import { useState } from 'react';
import {
  useOnboardingStore,
  selectVisibleSteps,
  selectCurrentStep,
  selectIsFirst,
  selectIsLast,
} from '../stores/onboarding-store';
import { isStepValid } from '../onboarding/validators';
import { detectHotkeyConflicts, DEFAULT_HOTKEYS } from '../onboarding/hotkey-utils';
import { LicenceStep } from '../onboarding/LicenceStep';
import { WelcomeTourStep } from '../onboarding/WelcomeTourStep';
import { UserProfileStep } from '../onboarding/UserProfileStep';
import { BrandingStep } from '../onboarding/BrandingStep';
import { DefaultTemplateStep } from '../onboarding/DefaultTemplateStep';
import { HotkeyConfigStep } from '../onboarding/HotkeyConfigStep';
import { ThemeStorageStep } from '../onboarding/ThemeStorageStep';
import { SummaryStep } from '../onboarding/SummaryStep';
import { persistOnboarding } from '../onboarding/persist-onboarding';

export function OnboardingPage(): JSX.Element {
  const visible = useOnboardingStore(selectVisibleSteps);
  const step = useOnboardingStore(selectCurrentStep);
  const isFirst = useOnboardingStore(selectIsFirst);
  const isLast = useOnboardingStore(selectIsLast);
  const currentIndex = useOnboardingStore((s) => s.currentIndex);
  const completed = useOnboardingStore((s) => s.completed);
  const stepData = useOnboardingStore((s) => s.data[step.id]);
  const allData = useOnboardingStore((s) => s.data);
  const next = useOnboardingStore((s) => s.next);
  const back = useOnboardingStore((s) => s.back);
  const skip = useOnboardingStore((s) => s.skip);
  const complete = useOnboardingStore((s) => s.complete);
  const [finishState, setFinishState] = useState<
    { kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  async function onFinish() {
    setFinishState({ kind: 'saving' });
    const result = await persistOnboarding(allData);
    if (!result.ok) {
      setFinishState({ kind: 'error', message: result.reason ?? 'Unknown error' });
      return;
    }
    setFinishState({ kind: 'idle' });
    complete();
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-primary">
        <div
          className="max-w-md w-full p-8 rounded-lg text-center"
          style={{ boxShadow: 'var(--shadow-neumorphic-out)' }}
        >
          <h1 className="text-2xl font-semibold text-text-primary mb-2">Onboarding complete</h1>
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

  const hotkeyConflicts =
    step.id === 'hotkeys'
      ? detectHotkeyConflicts((stepData as Record<string, string> | undefined) ?? { ...DEFAULT_HOTKEYS })
      : new Set<string>();
  const canAdvance = isStepValid(step.id, stepData, { hotkeyConflicts });

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

        <div className="px-8 py-6">{renderStepBody(step.id)}</div>

        {finishState.kind === 'error' && (
          <div className="px-8 pb-4 text-sm text-accent-error" role="alert">
            Finish failed: {finishState.message}
          </div>
        )}

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
                onClick={onFinish}
                disabled={!canAdvance || finishState.kind === 'saving'}
                className="px-4 py-2 rounded-md bg-accent-primary text-white disabled:opacity-50"
              >
                {finishState.kind === 'saving' ? 'Saving…' : 'Finish'}
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                disabled={!canAdvance}
                className="px-4 py-2 rounded-md bg-accent-primary text-white disabled:opacity-50"
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

function renderStepBody(stepId: string): JSX.Element {
  switch (stepId) {
    case 'licence':
      return <LicenceStep />;
    case 'profile':
      return <UserProfileStep />;
    case 'branding':
      return <BrandingStep />;
    case 'template':
      return <DefaultTemplateStep />;
    case 'hotkeys':
      return <HotkeyConfigStep />;
    case 'themeStorage':
      return <ThemeStorageStep />;
    case 'tour':
      return <WelcomeTourStep />;
    case 'done':
      return <SummaryStep />;
    default:
      return (
        <p className="text-sm text-text-secondary">
          Placeholder content for <span className="font-mono">{stepId}</span>.
        </p>
      );
  }
}
