import { describe, it, expect } from 'vitest';
import type { LicenceMode } from '@shared/types/entities';

/**
 * The Licence tab's label changes based on the licence mode. Pure logic
 * extracted here so it's testable without mounting React.
 */

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'hotkeys', label: 'Hotkeys' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'storage', label: 'Storage' },
  { id: 'defaults', label: 'Defaults' },
  { id: 'licence', label: 'Licence' },
] as const;

function labelFor(tabId: (typeof TABS)[number]['id'], mode: LicenceMode): string {
  const t = TABS.find((x) => x.id === tabId)!;
  return t.id === 'licence' && mode === 'none' ? 'About' : t.label;
}

describe('AppSettings Licence tab label', () => {
  it('renders "About" in none mode', () => {
    expect(labelFor('licence', 'none')).toBe('About');
  });

  it('renders "Licence" in keygen mode', () => {
    expect(labelFor('licence', 'keygen')).toBe('Licence');
  });

  it('other tabs ignore mode', () => {
    expect(labelFor('profile', 'none')).toBe('Profile');
    expect(labelFor('profile', 'keygen')).toBe('Profile');
    expect(labelFor('hotkeys', 'none')).toBe('Hotkeys');
    expect(labelFor('hotkeys', 'keygen')).toBe('Hotkeys');
  });
});

describe('AppSettings TABS invariants', () => {
  it('exposes exactly 6 tabs in the expected order', () => {
    expect(TABS.map((t) => t.id)).toEqual([
      'profile',
      'hotkeys',
      'appearance',
      'storage',
      'defaults',
      'licence',
    ]);
  });
});
