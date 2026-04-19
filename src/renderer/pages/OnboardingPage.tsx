import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeftRegular,
  ChevronRightRegular,
  CheckmarkCircleRegular,
} from '@fluentui/react-icons';
import {
  useOnboardingStore,
  selectVisibleSteps,
  selectCurrentStep,
  selectIsFirst,
  selectIsLast,
} from '../stores/onboarding-store';
import { isStepValid } from '../onboarding/validators';
import { detectHotkeyConflicts, DEFAULT_HOTKEYS } from '../onboarding/hotkey-utils';
import { WelcomeBrandingStep } from '../onboarding/WelcomeBrandingStep';
import { LicenceStep } from '../onboarding/LicenceStep';
import { WelcomeTourStep } from '../onboarding/WelcomeTourStep';
import { UserProfileStep } from '../onboarding/UserProfileStep';
import { BrandingStep } from '../onboarding/BrandingStep';
import { DefaultTemplateStep } from '../onboarding/DefaultTemplateStep';
import { HotkeyConfigStep } from '../onboarding/HotkeyConfigStep';
import { ThemeStorageStep } from '../onboarding/ThemeStorageStep';
import { SummaryStep } from '../onboarding/SummaryStep';
import { persistOnboarding } from '../onboarding/persist-onboarding';
import { Button } from '../components/ui';
import { pageBack, pageForward } from '../components/animations';

/**
 * S-02 — Onboarding wizard. Each step component owns its own animated
 * icon, title, and subtext via StepLayout; this file just renders the
 * step-dot indicator, the card wrapper, the step body (with pageForward/
 * pageBack transitions), and the navigation row.
 */

export function OnboardingPage(): JSX.Element {
  const visible = useOnboardingStore(selectVisibleSteps);
  const step = useOnboardingStore(selectCurrentStep);
  const isFirst = useOnboardingStore(selectIsFirst);
  const isLast = useOnboardingStore(selectIsLast);
  const currentIndex = useOnboardingStore((s) => s.currentIndex);
  const completed = useOnboardingStore((s) => s.completed);
  const stepData = useOnboardingStore((s) => s.data[step.id]);
  const allData = useOnboardingStore((s) => s.data);
  const storeNext = useOnboardingStore((s) => s.next);
  const storeBack = useOnboardingStore((s) => s.back);
  const storeSkip = useOnboardingStore((s) => s.skip);
  const complete = useOnboardingStore((s) => s.complete);

  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [finishState, setFinishState] = useState<
    { kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  function next(): void { setDirection('forward'); storeNext(); }
  function back(): void { setDirection('back');    storeBack(); }
  function skip(): void { setDirection('forward'); storeSkip(); }

  async function onFinish(): Promise<void> {
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
    return <CompletedCard />;
  }

  const hotkeyConflicts =
    step.id === 'hotkeys'
      ? detectHotkeyConflicts((stepData as Record<string, string> | undefined) ?? { ...DEFAULT_HOTKEYS })
      : new Set<string>();
  const canAdvance = isStepValid(step.id, stepData, { hotkeyConflicts });
  const variant = direction === 'forward' ? pageForward : pageBack;
  const primaryLabel = step.id === 'welcome' ? 'Begin' : isLast ? 'Get Started' : 'Next';

  return (
    <div
      className="material-mica"
      style={{
        minHeight:      '100vh',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        'var(--space-6)',
      }}
    >
      <div
        style={{
          width:          720,
          maxWidth:       '100%',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            'var(--space-4)',
        }}
      >
        <StepIndicator total={visible.length} currentIndex={currentIndex} />

        <div
          className="card-elevated"
          style={{
            width:        '100%',
            padding:      'var(--space-8) var(--space-8) var(--space-6)',
            borderRadius: 'var(--radius-dialog)',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step.id}
              variants={variant}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {renderStepBody(step.id)}
            </motion.div>
          </AnimatePresence>

          {finishState.kind === 'error' && (
            <div className="verify-status error" role="alert" style={{ marginTop: 'var(--space-4)' }}>
              <span>Finish failed: {finishState.message}</span>
            </div>
          )}
        </div>

        <Nav
          isFirst={isFirst}
          isLast={isLast}
          optional={!!step.optional}
          skipLabel={step.id === 'tour' ? 'Skip tour' : 'Skip for now'}
          primaryLabel={primaryLabel}
          canAdvance={canAdvance}
          saving={finishState.kind === 'saving'}
          onBack={back}
          onSkip={skip}
          onNext={next}
          onFinish={onFinish}
        />
      </div>
    </div>
  );
}

function StepIndicator({ total, currentIndex }: { total: number; currentIndex: number }): JSX.Element {
  return (
    <div className="step-indicator" role="presentation" aria-label={`Step ${currentIndex + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const cls = isCurrent ? 'step-dot current' : isDone ? 'step-dot done' : 'step-dot';
        return (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span className={cls} aria-hidden />
            {i < total - 1 && <span className="step-connector" aria-hidden />}
          </span>
        );
      })}
    </div>
  );
}

function Nav({
  isFirst, isLast, optional, skipLabel, primaryLabel, canAdvance, saving,
  onBack, onSkip, onNext, onFinish,
}: {
  isFirst: boolean;
  isLast: boolean;
  optional: boolean;
  skipLabel: string;
  primaryLabel: string;
  canAdvance: boolean;
  saving: boolean;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  onFinish: () => void;
}): JSX.Element {
  return (
    <div
      style={{
        width:           '100%',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        gap:             'var(--space-2)',
      }}
    >
      <Button
        variant="subtle"
        onClick={onBack}
        disabled={isFirst}
        startIcon={<ChevronLeftRegular fontSize={18} />}
      >
        Previous
      </Button>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {optional && !isLast && (
          <Button variant="subtle" onClick={onSkip}>{skipLabel}</Button>
        )}
        {isLast ? (
          <Button
            variant="accent"
            onClick={onFinish}
            disabled={!canAdvance || saving}
          >
            {saving ? 'Saving…' : primaryLabel}
          </Button>
        ) : (
          <Button
            variant="accent"
            onClick={onNext}
            disabled={!canAdvance}
            endIcon={<ChevronRightRegular fontSize={18} />}
          >
            {primaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function CompletedCard(): JSX.Element {
  return (
    <div
      className="material-mica"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
      }}
    >
      <div
        className="card-elevated"
        style={{
          maxWidth: 480,
          width: '100%',
          padding: 'var(--space-8)',
          textAlign: 'center',
          borderRadius: 'var(--radius-dialog)',
        }}
      >
        <div
          className="icon-orb icon-orb-success icon-orb-72 icon-orb-animated"
          style={{ margin: '0 auto var(--space-3)' }}
          aria-hidden
        >
          <CheckmarkCircleRegular fontSize={34} />
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-family-display)',
            fontSize:   'var(--type-subtitle-size)',
            fontWeight: 'var(--type-subtitle-weight)',
            margin:     0,
            color:      'var(--color-text-primary)',
          }}
        >
          Onboarding complete
        </h1>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="standard" onClick={() => useOnboardingStore.getState().reset()}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

function renderStepBody(stepId: string): JSX.Element {
  switch (stepId) {
    case 'welcome':      return <WelcomeBrandingStep />;
    case 'licence':      return <LicenceStep />;
    case 'profile':      return <UserProfileStep />;
    case 'branding':     return <BrandingStep />;
    case 'template':     return <DefaultTemplateStep />;
    case 'hotkeys':      return <HotkeyConfigStep />;
    case 'themeStorage': return <ThemeStorageStep />;
    case 'tour':         return <WelcomeTourStep />;
    case 'done':         return <SummaryStep />;
    default:
      return (
        <p style={{ fontSize: 'var(--type-body-size)', color: 'var(--color-text-secondary)' }}>
          Placeholder content for <span className="mono">{stepId}</span>.
        </p>
      );
  }
}
