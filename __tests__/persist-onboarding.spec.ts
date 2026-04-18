import { describe, it, expect, beforeEach, vi } from 'vitest';
import { persistOnboarding } from '../src/renderer/onboarding/persist-onboarding';

/**
 * Tests the D22 Finish flow — branding.save then settings.update,
 * fails-closed if either rejects, never leaves onboardingComplete=true
 * with no branding row.
 */

interface MockApi {
  branding: {
    save: ReturnType<typeof vi.fn>;
  };
  settings: {
    update: ReturnType<typeof vi.fn>;
  };
}

function installApi(): MockApi {
  const api: MockApi = {
    branding: { save: vi.fn() },
    settings: { update: vi.fn() },
  };
  (globalThis as unknown as { window: { evidexAPI: unknown } }).window = {
    evidexAPI: api,
  };
  return api;
}

const validInput = {
  profile: { name: 'Deepak', role: 'Tester', email: 'd@x.co' },
  branding: { companyName: 'ACME', primaryColor: '#1A6FD4' },
  template: { templateId: 'tpl_tsr_standard' },
  themeStorage: { theme: 'dark' as const, storagePath: 'C:/Projects' },
  hotkeys: { captureFullscreen: 'Ctrl+Shift+F' },
};

describe('persistOnboarding', () => {
  let api: MockApi;

  beforeEach(() => {
    api = installApi();
    api.branding.save.mockResolvedValue({
      ok: true,
      data: { id: 'brand_abc', createdAt: '2026-04-18T00:00:00Z' },
    });
    api.settings.update.mockResolvedValue({
      ok: true,
      data: { onboardingComplete: true },
    });
  });

  it('calls branding.save then settings.update with merged payloads', async () => {
    const result = await persistOnboarding(validInput);
    expect(result).toEqual({ ok: true });
    expect(api.branding.save).toHaveBeenCalledTimes(1);
    expect(api.settings.update).toHaveBeenCalledTimes(1);
    const settingsArg = api.settings.update.mock.calls[0]?.[0];
    expect(settingsArg.onboardingComplete).toBe(true);
    expect(settingsArg.brandingProfileId).toBe('brand_abc');
    expect(settingsArg.defaultTemplateId).toBe('tpl_tsr_standard');
    expect(settingsArg.defaultStoragePath).toBe('C:/Projects');
    expect(settingsArg.theme).toBe('dark');
  });

  it('returns failure when profile is missing required fields', async () => {
    const result = await persistOnboarding({
      ...validInput,
      profile: { name: 'Only' },
    });
    expect(result.ok).toBe(false);
    expect(api.branding.save).not.toHaveBeenCalled();
    expect(api.settings.update).not.toHaveBeenCalled();
  });

  it('returns failure when branding is missing required fields', async () => {
    const result = await persistOnboarding({
      ...validInput,
      branding: { companyName: 'A' } as unknown,
    } as Parameters<typeof persistOnboarding>[0]);
    expect(result.ok).toBe(false);
    expect(api.branding.save).not.toHaveBeenCalled();
  });

  it('fails-closed when branding.save rejects (never calls settings.update)', async () => {
    api.branding.save.mockResolvedValue({
      ok: false,
      error: { code: 'FS_WRITE_FAILED', message: 'disk full' },
    });
    const result = await persistOnboarding(validInput);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('branding save failed');
    expect(api.settings.update).not.toHaveBeenCalled();
  });

  it('fails-closed when settings.update rejects', async () => {
    api.settings.update.mockResolvedValue({
      ok: false,
      error: { code: 'FS_WRITE_FAILED', message: 'disk full' },
    });
    const result = await persistOnboarding(validInput);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('settings save failed');
  });

  it('omits optional profile fields when empty', async () => {
    await persistOnboarding({
      ...validInput,
      profile: { name: 'D', role: 'T', team: '', email: '' },
    });
    const settingsArg = api.settings.update.mock.calls[0]?.[0];
    expect(settingsArg.profile.team).toBeUndefined();
    expect(settingsArg.profile.email).toBeUndefined();
  });
});
