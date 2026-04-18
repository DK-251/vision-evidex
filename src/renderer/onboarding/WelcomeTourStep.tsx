import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Step 2 — Welcome tour: 3 screens with fadeIn animation (Tech Spec
 * Step 2). Internal dots navigate between screens; the wizard's outer
 * Next button advances to the next step whenever the user is ready.
 */

const SCREENS: Array<{ heading: string; body: string }> = [
  {
    heading: 'Capture evidence without switching tools',
    body:
      'Start a session, hit a hotkey, and every screenshot is tagged, hashed, and ' +
      'stored inside a single encrypted project file.',
  },
  {
    heading: 'Annotate, redact, and tag in place',
    body:
      'Draw arrows, blur PII, mark pass / fail. The original bytes and the ' +
      'annotated composite are both preserved for audit.',
  },
  {
    heading: 'Export a branded report in seconds',
    body:
      'Word, PDF, HTML, or a tamper-evident audit bundle — all generated from ' +
      'the same session data and branding profile.',
  },
];

export function WelcomeTourStep(): JSX.Element {
  const [index, setIndex] = useState(0);
  const current = SCREENS[index]!;

  return (
    <div className="space-y-4">
      <div className="relative min-h-[140px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <h2 className="text-lg font-semibold text-text-primary">{current.heading}</h2>
            <p className="mt-2 text-sm text-text-secondary">{current.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-2">
        {SCREENS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to tour screen ${i + 1}`}
            className={`h-2 w-2 rounded-full transition-opacity ${
              i === index ? 'bg-accent-primary' : 'bg-border-subtle opacity-60'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="text-sm text-text-secondary disabled:opacity-40"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(SCREENS.length - 1, i + 1))}
          disabled={index === SCREENS.length - 1}
          className="text-sm text-text-secondary disabled:opacity-40"
        >
          Next screen →
        </button>
      </div>
    </div>
  );
}
