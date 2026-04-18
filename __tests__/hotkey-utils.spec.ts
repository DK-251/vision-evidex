import { describe, it, expect } from 'vitest';
import {
  formatKeyEvent,
  detectHotkeyConflicts,
  DEFAULT_HOTKEYS,
  HOTKEY_ACTIONS,
} from '../src/renderer/onboarding/hotkey-utils';

describe('formatKeyEvent', () => {
  it('orders modifiers Ctrl+Alt+Shift+Meta', () => {
    expect(
      formatKeyEvent({ ctrlKey: true, altKey: true, shiftKey: true, metaKey: true, key: 'f' })
    ).toBe('Ctrl+Alt+Shift+Meta+F');
  });
  it('upper-cases single-char keys, leaves others intact', () => {
    expect(formatKeyEvent({ ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, key: 'a' })).toBe(
      'Ctrl+A'
    );
    expect(
      formatKeyEvent({ ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, key: 'F1' })
    ).toBe('F1');
  });
  it('omits absent modifiers', () => {
    expect(
      formatKeyEvent({ ctrlKey: true, altKey: false, shiftKey: true, metaKey: false, key: 'r' })
    ).toBe('Ctrl+Shift+R');
  });
});

describe('detectHotkeyConflicts', () => {
  it('defaults are conflict-free', () => {
    expect(detectHotkeyConflicts({ ...DEFAULT_HOTKEYS }).size).toBe(0);
  });
  it('flags every action id sharing a binding', () => {
    const map = { a: 'Ctrl+F', b: 'Ctrl+F', c: 'Ctrl+G' };
    const conflicts = detectHotkeyConflicts(map);
    expect(conflicts).toEqual(new Set(['a', 'b']));
    expect(conflicts.has('c')).toBe(false);
  });
  it('ignores "(unset)" and empty strings', () => {
    const map = { a: '(unset)', b: '', c: 'Ctrl+X' };
    expect(detectHotkeyConflicts(map).size).toBe(0);
  });
  it('three-way conflict flags all three', () => {
    const map = { a: 'Ctrl+F', b: 'Ctrl+F', c: 'Ctrl+F' };
    expect(detectHotkeyConflicts(map)).toEqual(new Set(['a', 'b', 'c']));
  });
});

describe('HOTKEY_ACTIONS', () => {
  it('exposes exactly 6 configurable actions', () => {
    expect(HOTKEY_ACTIONS).toHaveLength(6);
  });
  it('every action has a non-empty defaultBinding', () => {
    for (const a of HOTKEY_ACTIONS) {
      expect(typeof a.defaultBinding).toBe('string');
      expect(a.defaultBinding.length).toBeGreaterThan(0);
    }
  });
});
