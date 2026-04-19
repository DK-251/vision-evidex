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
  // First + last name are required, but the persisted shape only has
  // `name` (joined). Accept either the working draft (firstName + lastName)
  // or a composed `name`.
  const firstName = data['firstName'];
  const lastName = data['lastName'];
  if (firstName !== undefined || lastName !== undefined) {
    if (!isNonEmptyString(firstName) || !isNonEmptyString(lastName)) return false;
  } else if (!isNonEmptyString(data['name'])) {
    return false;
  }
  // Role: always required. When the user picks "Other" the UI switches
  // the draft into "customRole mode" (`customRole` defined, possibly
  // empty) and mirrors customRole into `role` — so requiring `role`
  // non-empty covers both branches.
  if (!isNonEmptyString(data['role'])) return false;
  // Email required — must parse as an email.
  const email = data['email'];
  if (!isNonEmptyString(email) || !EMAIL_PATTERN.test(email)) return false;
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

export function isValidTemplateSelection(data: unknown): boolean {
  if (!isObject(data)) return false;
  return isNonEmptyString(data['templateId']);
}

export function isValidHotkeys(data: unknown, conflicts: Set<string>): boolean {
  // The HotkeyConfigStep always emits a full map (defaults + overrides),
  // so the only way to invalidate is a duplicate binding.
  if (data !== undefined && !isObject(data)) return false;
  return conflicts.size === 0;
}

export function isValidThemeStorage(data: unknown): boolean {
  if (!isObject(data)) return false;
  if (data['storagePath'] !== undefined) {
    if (typeof data['storagePath'] !== 'string') return false;
  }
  if (!isNonEmptyString(data['storagePath'])) return false;
  const theme = data['theme'];
  if (theme !== undefined && theme !== 'light' && theme !== 'dark' && theme !== 'system') {
    return false;
  }
  return true;
}

export function isValidLicence(data: unknown): boolean {
  if (!isObject(data)) return false;
  return data['verified'] === true;
}

/** Route a step to its validator. Unknown / form-less steps pass. */
export function isStepValid(stepId: string, data: unknown, extras?: { hotkeyConflicts?: Set<string> }): boolean {
  switch (stepId) {
    case 'licence':
      return isValidLicence(data);
    case 'profile':
      return isValidUserProfile(data);
    case 'branding':
      return isValidBranding(data);
    case 'template':
      return isValidTemplateSelection(data);
    case 'hotkeys':
      return isValidHotkeys(data, extras?.hotkeyConflicts ?? new Set());
    case 'themeStorage':
      return isValidThemeStorage(data);
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
