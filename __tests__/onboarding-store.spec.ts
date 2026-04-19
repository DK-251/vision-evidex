import { describe, it, expect, beforeEach } from 'vitest';
import {
  useOnboardingStore,
  ONBOARDING_STEPS,
  selectVisibleSteps,
  selectCurrentStep,
  selectIsFirst,
  selectIsLast,
} from '../src/renderer/stores/onboarding-store';

/**
 * Pure-state tests for the wizard state machine. The Zustand hook is
 * queried via its attached `.getState()` method so tests run in the
 * node vitest environment without React.
 */

function state() {
  return useOnboardingStore.getState();
}

describe('OnboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  describe('visibleSteps by mode', () => {
    it('none mode hides the licence step', () => {
      state().setMode('none');
      const visible = selectVisibleSteps(state());
      expect(visible).toHaveLength(ONBOARDING_STEPS.length - 1);
      expect(visible.find((s) => s.id === 'licence')).toBeUndefined();
    });

    it('keygen mode includes every step', () => {
      state().setMode('keygen');
      const visible = selectVisibleSteps(state());
      expect(visible).toHaveLength(ONBOARDING_STEPS.length);
      // First visible step is always the brand welcome — it applies to
      // both licence modes.
      expect(visible[0]?.id).toBe('welcome');
    });
  });

  describe('navigation', () => {
    it('starts at index 0', () => {
      expect(state().currentIndex).toBe(0);
      expect(selectIsFirst(state())).toBe(true);
    });

    it('next() advances and clamps at the last step', () => {
      const total = selectVisibleSteps(state()).length;
      for (let i = 0; i < total + 2; i++) state().next();
      expect(state().currentIndex).toBe(total - 1);
      expect(selectIsLast(state())).toBe(true);
    });

    it('back() decrements and clamps at 0', () => {
      state().next();
      state().next();
      expect(state().currentIndex).toBe(2);
      state().back();
      state().back();
      state().back(); // clamp
      expect(state().currentIndex).toBe(0);
      expect(selectIsFirst(state())).toBe(true);
    });

    it('skip() behaves as next() in the skeleton', () => {
      state().next(); // at index 1
      state().skip(); // should move to index 2
      expect(state().currentIndex).toBe(2);
    });

    it('goTo respects bounds and ignores out-of-range values', () => {
      state().goTo(3);
      expect(state().currentIndex).toBe(3);
      state().goTo(-1);
      expect(state().currentIndex).toBe(3);
      state().goTo(99);
      expect(state().currentIndex).toBe(3);
    });
  });

  describe('selectCurrentStep', () => {
    it('in none mode, index 0 is the welcome brand screen', () => {
      state().setMode('none');
      expect(selectCurrentStep(state()).id).toBe('welcome');
    });

    it('in keygen mode, index 0 is also the welcome brand screen', () => {
      state().setMode('keygen');
      expect(selectCurrentStep(state()).id).toBe('welcome');
    });

    it('in keygen mode, index 1 is the licence step', () => {
      state().setMode('keygen');
      state().next();
      expect(selectCurrentStep(state()).id).toBe('licence');
    });

    it('in none mode, index 1 is the tour step', () => {
      state().setMode('none');
      state().next();
      expect(selectCurrentStep(state()).id).toBe('tour');
    });
  });

  describe('setMode clamps index when step count shrinks', () => {
    it('switching keygen → none at last index clamps to new max', () => {
      state().setMode('keygen');
      const keygenMax = ONBOARDING_STEPS.length - 1;
      for (let i = 0; i < keygenMax + 5; i++) state().next();
      expect(state().currentIndex).toBe(keygenMax);
      state().setMode('none');
      const noneMax = ONBOARDING_STEPS.length - 2; // licence dropped
      expect(state().currentIndex).toBe(noneMax);
    });
  });

  describe('setStepData / complete / reset', () => {
    it('setStepData merges payloads per step id', () => {
      state().setStepData('profile', { name: 'Deepak' });
      state().setStepData('branding', { company: 'ACME' });
      expect(state().data['profile']).toEqual({ name: 'Deepak' });
      expect(state().data['branding']).toEqual({ company: 'ACME' });
    });

    it('complete flips the completed flag', () => {
      expect(state().completed).toBe(false);
      state().complete();
      expect(state().completed).toBe(true);
    });

    it('reset returns to default state', () => {
      state().setMode('keygen');
      state().next();
      state().next();
      state().setStepData('profile', { name: 'x' });
      state().complete();
      state().reset();
      expect(state().mode).toBe('none');
      expect(state().currentIndex).toBe(0);
      expect(state().completed).toBe(false);
      expect(state().data).toEqual({});
    });
  });

  describe('tour step is optional', () => {
    it('ONBOARDING_STEPS declares tour as optional and others as required', () => {
      const optional = ONBOARDING_STEPS.filter((s) => s.optional);
      expect(optional.map((s) => s.id)).toEqual(['tour']);
    });
  });
});
