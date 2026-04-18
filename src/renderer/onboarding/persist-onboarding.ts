import type { UserProfileData, BrandingData } from './validators';
import type { ThemeChoice } from './ThemeStorageStep';
import { DEFAULT_HOTKEYS } from './hotkey-utils';

/**
 * At "Finish", collect everything from the onboarding store and push
 * it through the IPC boundary:
 *   1. Save the branding profile (app.db `branding_profiles` row).
 *   2. Update settings.json with profile, template, theme, storage,
 *      hotkeys, brandingProfileId, onboardingComplete.
 *
 * Returns `{ ok: true }` on success, `{ ok: false, reason }` otherwise.
 * Step 1 failure aborts the whole flow so we never end up with
 * "onboardingComplete: true" but no branding row.
 */

export interface PersistResult {
  ok: boolean;
  reason?: string;
}

interface OnboardingSnapshot {
  profile?: Partial<UserProfileData>;
  branding?: Partial<BrandingData>;
  template?: { templateId?: string };
  themeStorage?: { theme?: ThemeChoice; storagePath?: string };
  hotkeys?: Record<string, string>;
}

export async function persistOnboarding(data: OnboardingSnapshot): Promise<PersistResult> {
  const profile = data.profile;
  const branding = data.branding;
  const template = data.template;
  const themeStorage = data.themeStorage;
  const hotkeys = data.hotkeys ?? { ...DEFAULT_HOTKEYS };

  if (!profile?.name || !profile.role) {
    return { ok: false, reason: 'profile missing required fields' };
  }
  if (!branding?.companyName || !branding.primaryColor) {
    return { ok: false, reason: 'branding missing required fields' };
  }

  const brandingSave = await window.evidexAPI.branding.save({
    name: `${branding.companyName} (default)`,
    companyName: branding.companyName,
    logoBase64: branding.logoBase64 ?? null,
    logoMimeType: branding.logoMimeType ?? null,
    primaryColor: branding.primaryColor,
    ...(branding.headerText !== undefined ? { headerText: branding.headerText } : {}),
    ...(branding.footerText !== undefined ? { footerText: branding.footerText } : {}),
  });
  if (!brandingSave.ok) {
    return { ok: false, reason: `branding save failed: ${brandingSave.error.message}` };
  }

  const settingsUpdate = await window.evidexAPI.settings.update({
    onboardingComplete: true,
    theme: themeStorage?.theme ?? 'system',
    defaultStoragePath: themeStorage?.storagePath ?? '',
    defaultTemplateId: template?.templateId ?? '',
    profile: {
      name: profile.name,
      role: profile.role,
      ...(profile.team !== undefined && profile.team !== '' ? { team: profile.team } : {}),
      ...(profile.email !== undefined && profile.email !== '' ? { email: profile.email } : {}),
    },
    hotkeys,
    brandingProfileId: brandingSave.data.id,
  });
  if (!settingsUpdate.ok) {
    return { ok: false, reason: `settings save failed: ${settingsUpdate.error.message}` };
  }

  return { ok: true };
}
