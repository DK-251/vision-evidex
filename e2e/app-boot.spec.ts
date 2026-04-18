import { test, expect } from './fixtures';

/**
 * Smoke: the Electron main window boots, renders React, and exposes
 * the IPC preload bridge. If any of these fail, every other spec is
 * meaningless, so this file runs first.
 */

test.describe('app boot', () => {
  test('main window mounts React and shows onboarding by default', async ({ window }) => {
    await expect(window).toHaveTitle('Vision-EviDex');
    // Onboarding wizard renders a "Step N of M" marker — assert on it
    // rather than a specific step title so reordering stays green.
    await expect(window.getByText(/Step \d+ of \d+/)).toBeVisible();
  });

  test('preload bridge is exposed on window.evidexAPI', async ({ window }) => {
    const hasBridge = await window.evaluate(
      () => typeof (globalThis as unknown as { evidexAPI?: unknown }).evidexAPI === 'object'
    );
    expect(hasBridge).toBe(true);
  });

  test('settings:get IPC returns Settings shape', async ({ window }) => {
    const settings = await window.evaluate(async () => {
      const api = (globalThis as unknown as {
        evidexAPI: { settings: { get: () => Promise<unknown> } };
      }).evidexAPI;
      return api.settings.get();
    });
    expect(settings).toMatchObject({
      ok: true,
      data: expect.objectContaining({
        schemaVersion: expect.any(Number),
        onboardingComplete: expect.any(Boolean),
        theme: expect.any(String),
      }),
    });
  });

  test('no uncaught renderer console errors on boot', async ({ app, window }) => {
    const errors: string[] = [];
    window.on('pageerror', (err) => errors.push(err.message));
    window.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await window.waitForLoadState('networkidle').catch(() => {
      // dev URL may not reach networkidle quickly — fall back to a timeout
    });
    await window.waitForTimeout(500);
    expect(errors, `renderer console errors: ${errors.join(' | ')}`).toEqual([]);
    expect(await app.windows()).toHaveLength(1);
  });
});
