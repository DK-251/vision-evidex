import { create } from 'zustand';

/**
 * OnboardingStore — Phase 1 Wk4 D20 skeleton.
 *
 * Owns the state machine for the 8-step wizard (7 in no-licence mode).
 * Pure state: does not touch IPC, filesystem, or renderer-only APIs, so
 * the store is testable in Node without React. The UI layer subscribes
 * via `useOnboardingStore(...)` and dispatches `next` / `back` / `skip`
 * / `complete`.
 *
 * Step payloads (user profile, branding, etc.) live in a separate
 * `data` record keyed by step id — D21+ fills it in as each real form
 * lands. `complete()` is the point where the rest of the app should
 * persist onboardingComplete=true; that IPC is Wk5 work.
 */

export type LicenceMode = 'keygen' | 'none';

export interface OnboardingStepDef {
  id: string;
  title: string;
  description: string;
  /** If set, the step is only shown in this mode. */
  requiresMode?: LicenceMode;
  /** Optional steps show a "Skip" affordance. */
  optional?: boolean;
}

/** All 8 step definitions. Order is authoritative. */
export const ONBOARDING_STEPS: readonly OnboardingStepDef[] = Object.freeze([
  {
    id: 'licence',
    title: 'Activate licence',
    description: 'Enter your licence key and bind this machine.',
    requiresMode: 'keygen',
  },
  {
    id: 'profile',
    title: 'Your profile',
    description: 'Name, role, and team so reports attribute correctly.',
  },
  {
    id: 'branding',
    title: 'Organisation & branding',
    description: 'Company name, logo, and primary colour for exports.',
  },
  {
    id: 'naming',
    title: 'Default naming pattern',
    description: 'How capture filenames are generated across projects.',
  },
  {
    id: 'storage',
    title: 'Default storage path',
    description: 'Where new .evidex projects are saved.',
  },
  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    description: 'Preview the hotkeys — you can rebind later.',
  },
  {
    id: 'tour',
    title: 'Welcome tour',
    description: 'A 3-screen introduction to the core flows.',
    optional: true,
  },
  {
    id: 'done',
    title: "You're all set",
    description: 'Confirmation screen — click Finish to enter the app.',
  },
]);

interface OnboardingState {
  mode: LicenceMode;
  /** Index into `visibleSteps` — not into `ONBOARDING_STEPS`. */
  currentIndex: number;
  completed: boolean;
  data: Record<string, unknown>;
  setMode: (mode: LicenceMode) => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  goTo: (index: number) => void;
  setStepData: (stepId: string, payload: unknown) => void;
  complete: () => void;
  reset: () => void;
}

function filterSteps(mode: LicenceMode): OnboardingStepDef[] {
  return ONBOARDING_STEPS.filter((s) => !s.requiresMode || s.requiresMode === mode);
}

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  mode: 'none',
  currentIndex: 0,
  completed: false,
  data: {},

  setMode(mode) {
    // Changing mode may change the visible-step count; clamp index.
    const nextSteps = filterSteps(mode);
    set((s) => ({ mode, currentIndex: Math.min(s.currentIndex, nextSteps.length - 1) }));
  },

  next() {
    const max = filterSteps(get().mode).length - 1;
    set((s) => ({ currentIndex: Math.min(s.currentIndex + 1, max) }));
  },

  back() {
    set((s) => ({ currentIndex: Math.max(s.currentIndex - 1, 0) }));
  },

  skip() {
    // Alias for `next` in the skeleton — D21+ may branch differently
    // for optional steps (e.g. mark as explicitly skipped in `data`).
    get().next();
  },

  goTo(index) {
    const visible = filterSteps(get().mode);
    if (index < 0 || index >= visible.length) return;
    set({ currentIndex: index });
  },

  setStepData(stepId, payload) {
    set((s) => ({ data: { ...s.data, [stepId]: payload } }));
  },

  complete() {
    set({ completed: true });
  },

  reset() {
    set({ mode: 'none', currentIndex: 0, completed: false, data: {} });
  },
}));

/** Selector helpers — kept outside the store so subscribers only
 *  re-render on fields they actually read. */

export function selectVisibleSteps(s: OnboardingState): OnboardingStepDef[] {
  return filterSteps(s.mode);
}

export function selectCurrentStep(s: OnboardingState): OnboardingStepDef {
  const visible = filterSteps(s.mode);
  return visible[s.currentIndex] ?? visible[visible.length - 1]!;
}

export function selectIsFirst(s: OnboardingState): boolean {
  return s.currentIndex === 0;
}

export function selectIsLast(s: OnboardingState): boolean {
  return s.currentIndex === filterSteps(s.mode).length - 1;
}
