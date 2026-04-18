/**
 * Per-step validators for the onboarding wizard.
 *
 * Pure functions — no React, no store access — so the renderer and
 * vitest can both call them. Each validator reads the slice of
 * `onboarding-store.data[stepId]` for its step and decides whether
 * the wizard's Next button is enabled.
 *
 * Steps that carry no form state (welcome tour, shortcuts preview,
 * summary) validate to `true` unconditionally; they're gated only by
 * the user clicking Next.
 */

export interface UserProfileData {
  name: string;
  role: string;
  team?: string;
  email?: string;
}

export interface BrandingData {
  companyName: string;
  logoBase64?: string;
  logoMimeType?: 'image/png' | 'image/jpeg';
  primaryColor: string;
  headerText?: string;
  footerText?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isValidUserProfile(data: unknown): boolean {
  if (!isObject(data)) return false;
  if (!isNonEmptyString(data['name'])) return false;
  if (!isNonEmptyString(data['role'])) return false;
  const email = data['email'];
  if (email !== undefined && email !== '') {
    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) return false;
  }
  return true;
}

export function isValidBranding(data: unknown): boolean {
  if (!isObject(data)) return false;
  if (!isNonEmptyString(data['companyName'])) return false;
  const color = data['primaryColor'];
  if (typeof color !== 'string' || !HEX_COLOR_PATTERN.test(color)) return false;
  const mime = data['logoMimeType'];
  if (mime !== undefined && mime !== 'image/png' && mime !== 'image/jpeg') return false;
  return true;
}

/** Route a step to its validator. Unknown / form-less steps pass. */
export function isStepValid(stepId: string, data: unknown): boolean {
  switch (stepId) {
    case 'profile':
      return isValidUserProfile(data);
    case 'branding':
      return isValidBranding(data);
    default:
      return true;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
