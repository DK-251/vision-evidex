import { useState, type ComponentType, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  KeyRegular,
  SparkleRegular,
  PersonRegular,
  BuildingRegular,
  DocumentTextRegular,
  KeyboardRegular,
  PaintBrushRegular,
  CheckmarkCircleRegular,
} from '@fluentui/react-icons';
import type { FluentIconsProps } from '@fluentui/react-icons';
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
import { Button } from '../components/ui';
import { pageBack, pageForward } from '../components/animations';

/**
 * S-02 — Onboarding wizard. Port to doc §15: step-dot indicator at the
 * top, 32px Fluent icon per step inside a card-elevated container, and
 * pageForward/pageBack transitions between steps via Framer Motion.
 */

type FluentIcon = ComponentType<FluentIconsProps>;

const STEP_ICONS: Record<string, FluentIcon> = {
  licence:      KeyRegular,
  tour:         SparkleRegular,
  profile:      PersonRegular,
  branding:     BuildingRegular,
  template:     DocumentTextRegular,
  hotkeys:      KeyboardRegular,
  themeStorage: PaintBrushRegular,
  done:         CheckmarkCircleRegular,
};

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
      <div style={{ width: 600, maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
        <StepIndicator total={visible.length} currentIndex={currentIndex} />

        <div
          className="card-elevated"
          style={{
            width:  '100%',
            padding: 'var(--space-8) var(--space-8) var(--space-6)',
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
              <div
                style={{ color: 'var(--color-accent-default)', marginBottom: 'var(--space-3)' }}
                aria-hidden
              >
                {renderIcon(STEP_ICONS[step.id], 32)}
              </div>
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
                {step.title}
              </h1>
              <p
                style={{
                  fontSize: 'var(--type-body-size)',
                  color:    'var(--color-text-secondary)',
                  margin:   'var(--space-2) 0 var(--space-6)',
                }}
              >
                {step.description}
              </p>
              {renderStepBody(step.id)}
            </motion.div>
          </AnimatePresence>

          {finishState.kind === 'error' && (
            <div
              role="alert"
              style={{
                color:     'var(--color-status-fail)',
                fontSize:  'var(--type-caption-size)',
                marginTop: 'var(--space-3)',
              }}
            >
              Finish failed: {finishState.message}
            </div>
          )}
        </div>

        <Nav
          isFirst={isFirst}
          isLast={isLast}
          optional={!!step.optional}
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

/* ── Step indicator ───────────────────────────────────────────────── */

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

/* ── Nav row ──────────────────────────────────────────────────────── */

function Nav({
  isFirst, isLast, optional, canAdvance, saving,
  onBack, onSkip, onNext, onFinish,
}: {
  isFirst: boolean;
  isLast: boolean;
  optional: boolean;
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
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-2)',
      }}
    >
      <Button variant="subtle" onClick={onBack} disabled={isFirst}>Back</Button>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {optional && !isLast && (
          <Button variant="subtle" onClick={onSkip}>Skip for now</Button>
        )}
        {isLast ? (
          <Button
            variant="accent"
            onClick={onFinish}
            disabled={!canAdvance || saving}
          >
            {saving ? 'Saving…' : 'Get Started'}
          </Button>
        ) : (
          <Button
            variant="accent"
            onClick={onNext}
            disabled={!canAdvance}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Completed card ───────────────────────────────────────────────── */

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
        <div style={{ color: 'var(--color-status-pass)', marginBottom: 'var(--space-3)' }} aria-hidden>
          <CheckmarkCircleRegular fontSize={48} />
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
          <Button
            variant="standard"
            onClick={() => useOnboardingStore.getState().reset()}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

function renderIcon(Icon: FluentIcon | undefined, size: number): ReactNode {
  if (!Icon) return null;
  return <Icon fontSize={size} />;
}

/* ── Step body dispatch ───────────────────────────────────────────── */

function renderStepBody(stepId: string): ReactNode {
  switch (stepId) {
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
