import type { Variants } from 'framer-motion';

/**
 * Fluent animation variants — the complete vocabulary for every
 * conditional render in the renderer. Components must pick from here
 * and never invent ad-hoc transitions.
 *
 * Source: Docs MD/07-VisionEviDex-FluentUI-DesignSystem-v1_0.md §7.3.
 *
 * Rules (enforced by review, not lint):
 *   1. No animation longer than 250ms.
 *   2. No looping animations except the capture toolbar pulse (CSS, not here).
 *   3. Entries use `--easing-decelerate`, exits use `--easing-accelerate`.
 *   4. Wrap conditionally-mounted elements in `<AnimatePresence mode="wait">`.
 *   5. Respect `useReducedMotion()` — swap to `fadeIn` when true.
 */

const EASE_STANDARD  = [0.17, 0.17, 0, 1] as const;
const EASE_DECELERATE = [0.10, 0.90, 0.20, 1] as const;
const EASE_ACCELERATE = [0.90, 0.10, 1.00, 0.20] as const;

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.083, ease: EASE_STANDARD } },
  exit:    { opacity: 0, transition: { duration: 0.083, ease: EASE_ACCELERATE } },
};

export const dialogEnter: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1,    transition: { duration: 0.167, ease: EASE_DECELERATE } },
  exit:    { opacity: 0, scale: 0.96, transition: { duration: 0.083, ease: EASE_ACCELERATE } },
};

export const flyoutEnter: Variants = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0,  transition: { duration: 0.083, ease: EASE_DECELERATE } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.083, ease: EASE_ACCELERATE } },
};

export const toastEnter: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0,  transition: { duration: 0.167, ease: EASE_DECELERATE } },
  exit:    { opacity: 0, x: 20, transition: { duration: 0.083, ease: EASE_ACCELERATE } },
};

export const pageForward: Variants = {
  initial: { opacity: 0, x:  16 },
  animate: { opacity: 1, x:   0, transition: { duration: 0.25,  ease: EASE_DECELERATE } },
  exit:    { opacity: 0, x: -16, transition: { duration: 0.167, ease: EASE_ACCELERATE } },
};

export const pageBack: Variants = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x:   0, transition: { duration: 0.25,  ease: EASE_DECELERATE } },
  exit:    { opacity: 0, x:  16, transition: { duration: 0.167, ease: EASE_ACCELERATE } },
};

export const captureFlash: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: [0, 0.8, 0], transition: { duration: 0.083, times: [0, 0.3, 1], ease: 'linear' } },
};

export const sidebarCollapse: Variants = {
  // LO-06: retained for documentation only — the sidebar currently uses
  // pure CSS transitions. If this is wired to Framer Motion in future,
  // use these variants with <motion.nav>.
  open:   { width: 220, transition: { duration: 0.167, ease: EASE_DECELERATE } },
  closed: { width: 48,  transition: { duration: 0.167, ease: EASE_ACCELERATE } },
};

export const navLabelFade: Variants = {
  // LO-06: retained for future use — sidebar label currently uses
  // display:none via CSS. Wire to <motion.span> on the label when
  // the sidebar is migrated to Framer Motion.
  open:   { opacity: 1, transition: { duration: 0.083, delay: 0.083 } },
  closed: { opacity: 0, transition: { duration: 0.083 } },
};

export const counterBump: Variants = {
  animate: { scale: [1, 1.15, 1], transition: { duration: 0.167, ease: EASE_STANDARD } },
};
