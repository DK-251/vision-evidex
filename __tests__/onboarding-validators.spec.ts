import { describe, it, expect } from 'vitest';
import {
  isValidUserProfile,
  isValidBranding,
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

describe('isStepValid router', () => {
  it('routes profile + branding to their validators', () => {
    expect(isStepValid('profile', { name: 'D', role: 'T' })).toBe(true);
    expect(isStepValid('profile', {})).toBe(false);
    expect(isStepValid('branding', { companyName: 'A', primaryColor: '#1A6FD4' })).toBe(true);
    expect(isStepValid('branding', {})).toBe(false);
  });

  it('passes through for form-less step ids', () => {
    expect(isStepValid('licence', undefined)).toBe(true);
    expect(isStepValid('tour', undefined)).toBe(true);
    expect(isStepValid('naming', undefined)).toBe(true);
    expect(isStepValid('storage', undefined)).toBe(true);
    expect(isStepValid('shortcuts', undefined)).toBe(true);
    expect(isStepValid('done', undefined)).toBe(true);
  });

  it('unknown step ids pass through (safe default)', () => {
    expect(isStepValid('does-not-exist', undefined)).toBe(true);
  });
});
