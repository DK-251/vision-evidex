import { describe, it, expect } from 'vitest';
import {
  isValidUserProfile,
  isValidBranding,
  isValidTemplateSelection,
  isValidHotkeys,
  isValidThemeStorage,
  isStepValid,
} from '../src/renderer/onboarding/validators';

describe('isValidUserProfile', () => {
  it('requires name and role', () => {
    expect(isValidUserProfile({ name: 'Deepak', role: 'Tester' })).toBe(true);
  });

  it('rejects when name is empty or whitespace', () => {
    expect(isValidUserProfile({ name: '', role: 'Tester' })).toBe(false);
    expect(isValidUserProfile({ name: '   ', role: 'Tester' })).toBe(false);
  });

  it('rejects when role is empty', () => {
    expect(isValidUserProfile({ name: 'D', role: '' })).toBe(false);
  });

  it('accepts missing / empty email (optional)', () => {
    expect(isValidUserProfile({ name: 'D', role: 'T' })).toBe(true);
    expect(isValidUserProfile({ name: 'D', role: 'T', email: '' })).toBe(true);
  });

  it('rejects malformed email', () => {
    expect(isValidUserProfile({ name: 'D', role: 'T', email: 'not-an-email' })).toBe(false);
    expect(isValidUserProfile({ name: 'D', role: 'T', email: 'no@domain' })).toBe(false);
  });

  it('accepts well-formed email', () => {
    expect(isValidUserProfile({ name: 'D', role: 'T', email: 'a@b.co' })).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(isValidUserProfile(null)).toBe(false);
    expect(isValidUserProfile('profile')).toBe(false);
    expect(isValidUserProfile([])).toBe(false);
    expect(isValidUserProfile(undefined)).toBe(false);
  });
});

describe('isValidBranding', () => {
  it('accepts minimal valid shape', () => {
    expect(isValidBranding({ companyName: 'ACME', primaryColor: '#1A6FD4' })).toBe(true);
  });

  it('requires non-empty companyName', () => {
    expect(isValidBranding({ companyName: '', primaryColor: '#1A6FD4' })).toBe(false);
    expect(isValidBranding({ companyName: '   ', primaryColor: '#1A6FD4' })).toBe(false);
  });

  it('rejects malformed hex colour', () => {
    expect(isValidBranding({ companyName: 'ACME', primaryColor: 'blue' })).toBe(false);
    expect(isValidBranding({ companyName: 'ACME', primaryColor: '#1A6FD' })).toBe(false);
    expect(isValidBranding({ companyName: 'ACME', primaryColor: '#GGGGGG' })).toBe(false);
    expect(isValidBranding({ companyName: 'ACME', primaryColor: '#1A6FD44' })).toBe(false);
  });

  it('accepts any 6-digit hex (case-insensitive)', () => {
    expect(isValidBranding({ companyName: 'A', primaryColor: '#abcdef' })).toBe(true);
    expect(isValidBranding({ companyName: 'A', primaryColor: '#ABCDEF' })).toBe(true);
  });

  it('rejects invalid logoMimeType', () => {
    expect(
      isValidBranding({
        companyName: 'A',
        primaryColor: '#1A6FD4',
        logoMimeType: 'image/gif',
      } as unknown)
    ).toBe(false);
  });

  it('accepts png or jpeg logoMimeType', () => {
    expect(
      isValidBranding({ companyName: 'A', primaryColor: '#1A6FD4', logoMimeType: 'image/png' })
    ).toBe(true);
    expect(
      isValidBranding({ companyName: 'A', primaryColor: '#1A6FD4', logoMimeType: 'image/jpeg' })
    ).toBe(true);
  });
});

describe('isValidTemplateSelection', () => {
  it('accepts a non-empty templateId', () => {
    expect(isValidTemplateSelection({ templateId: 'tpl_tsr_standard' })).toBe(true);
  });
  it('rejects empty / missing templateId', () => {
    expect(isValidTemplateSelection({})).toBe(false);
    expect(isValidTemplateSelection({ templateId: '' })).toBe(false);
    expect(isValidTemplateSelection({ templateId: '   ' })).toBe(false);
  });
  it('rejects non-object input', () => {
    expect(isValidTemplateSelection(null)).toBe(false);
    expect(isValidTemplateSelection('tpl_x')).toBe(false);
  });
});

describe('isValidHotkeys', () => {
  it('valid when no conflicts', () => {
    expect(isValidHotkeys({}, new Set())).toBe(true);
    expect(isValidHotkeys({ a: 'Ctrl+F' }, new Set())).toBe(true);
  });
  it('invalid when any conflict exists', () => {
    expect(isValidHotkeys({ a: 'Ctrl+F' }, new Set(['a', 'b']))).toBe(false);
  });
  it('accepts undefined (uses defaults)', () => {
    expect(isValidHotkeys(undefined, new Set())).toBe(true);
  });
});

describe('isValidThemeStorage', () => {
  it('requires a non-empty storagePath', () => {
    expect(isValidThemeStorage({ storagePath: 'C:/Projects' })).toBe(true);
    expect(isValidThemeStorage({ storagePath: '' })).toBe(false);
    expect(isValidThemeStorage({})).toBe(false);
  });
  it('accepts any of the three theme values or undefined', () => {
    expect(isValidThemeStorage({ storagePath: '/x', theme: 'light' })).toBe(true);
    expect(isValidThemeStorage({ storagePath: '/x', theme: 'dark' })).toBe(true);
    expect(isValidThemeStorage({ storagePath: '/x', theme: 'system' })).toBe(true);
    expect(isValidThemeStorage({ storagePath: '/x' })).toBe(true);
  });
  it('rejects unknown theme values', () => {
    expect(isValidThemeStorage({ storagePath: '/x', theme: 'midnight' } as unknown)).toBe(false);
  });
});

describe('isStepValid router', () => {
  it('routes profile + branding to their validators', () => {
    expect(isStepValid('profile', { name: 'D', role: 'T' })).toBe(true);
    expect(isStepValid('profile', {})).toBe(false);
    expect(isStepValid('branding', { companyName: 'A', primaryColor: '#1A6FD4' })).toBe(true);
    expect(isStepValid('branding', {})).toBe(false);
  });

  it('routes template / hotkeys / themeStorage to their validators', () => {
    expect(isStepValid('template', { templateId: 'tpl_x' })).toBe(true);
    expect(isStepValid('template', {})).toBe(false);
    expect(
      isStepValid('hotkeys', { a: 'Ctrl+F' }, { hotkeyConflicts: new Set(['a']) })
    ).toBe(false);
    expect(isStepValid('hotkeys', { a: 'Ctrl+F' })).toBe(true);
    expect(isStepValid('themeStorage', { storagePath: '/x', theme: 'dark' })).toBe(true);
    expect(isStepValid('themeStorage', {})).toBe(false);
  });

  it('passes through for form-less step ids', () => {
    expect(isStepValid('welcome', undefined)).toBe(true);
    expect(isStepValid('tour', undefined)).toBe(true);
    expect(isStepValid('done', undefined)).toBe(true);
  });

  it('licence step requires verified=true', () => {
    expect(isStepValid('licence', undefined)).toBe(false);
    expect(isStepValid('licence', {})).toBe(false);
    expect(isStepValid('licence', { verified: false })).toBe(false);
    expect(isStepValid('licence', { verified: true })).toBe(true);
  });

  it('unknown step ids pass through (safe default)', () => {
    expect(isStepValid('does-not-exist', undefined)).toBe(true);
  });
});
