import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparkleRegular,
  CameraRegular,
  EditRegular,
  DocumentTextRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
} from '@fluentui/react-icons';
import { StepLayout } from './StepLayout';

const SCREENS = [
  {
    icon: CameraRegular,
    palette: 'cool' as const,
    heading: 'Capture evidence without switching tools',
    body:
      'Start a session, hit a hotkey, and every screenshot is tagged, hashed, ' +
      'and stored inside a single encrypted project file.',
  },
  {
    icon: EditRegular,
    palette: 'warm' as const,
    heading: 'Annotate, redact, and tag in place',
    body:
      'Draw arrows, blur PII, mark pass / fail. The original bytes and the ' +
      'annotated composite are both preserved for audit.',
  },
  {
    icon: DocumentTextRegular,
    palette: 'violet' as const,
    heading: 'Export a branded report in seconds',
    body:
      'Word, PDF, HTML, or a tamper-evident audit bundle — all generated from ' +
      'the same session data and branding profile.',
  },
];

export function WelcomeTourStep(): JSX.Element {
  const [index, setIndex] = useState(0);
  const current = SCREENS[index]!;
  const isFirst = index === 0;
  const isLast = index === SCREENS.length - 1;

  return (
    <StepLayout
      icon={SparkleRegular}
      palette="violet"
      title="A quick tour"
      subtext="Three screens on what makes Vision-EviDex different. Skip any time."
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
        <div style={{ position: 'relative', minHeight: 180, width: '100%' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-3)',
              }}
            >
              <div
                className={`icon-orb icon-orb-${current.palette} icon-orb-56`}
                aria-hidden="true"
              >
                <current.icon fontSize={26} />
              </div>
              <h2
                style={{
                  fontSize:   'var(--type-subtitle-size)',
                  fontWeight: 'var(--type-subtitle-weight)',
                  lineHeight: 'var(--type-subtitle-height)',
                  color:      'var(--color-text-primary)',
                  margin:     0,
                  textAlign:  'center',
                }}
              >
                {current.heading}
              </h2>
              <p
                style={{
                  fontSize:  'var(--type-body-size)',
                  color:     'var(--color-text-secondary)',
                  margin:    0,
                  maxWidth:  440,
                  textAlign: 'center',
                }}
              >
                {current.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {SCREENS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to tour screen ${i + 1}`}
              style={{
                width: 6,
                height: 6,
                padding: 0,
                borderRadius: 'var(--radius-circle)',
                border: 0,
                background: i === index ? 'var(--color-accent-default)' : 'var(--color-stroke-default)',
                cursor: 'pointer',
                transition: 'background var(--duration-ultra-fast) var(--easing-standard)',
              }}
            />
          ))}
        </div>

        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-2)',
          }}
        >
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={isFirst}
            className="btn-base btn-subtle"
            style={{ minWidth: 112 }}
          >
            <ChevronLeftRegular fontSize={18} />
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(SCREENS.length - 1, i + 1))}
            disabled={isLast}
            className="btn-base btn-subtle"
            style={{ minWidth: 112 }}
          >
            <span>Next</span>
            <ChevronRightRegular fontSize={18} />
          </button>
        </div>
      </div>
    </StepLayout>
  );
}
