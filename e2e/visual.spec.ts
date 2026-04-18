import { test, expect } from './fixtures';

/**
 * Visual regression — screenshot baselines for the critical surfaces.
 * First run on a new machine creates baselines (`-snapshots/`); subsequent
 * runs diff against them. Font smoothing differs between machines, so
 * these should be regenerated on Asus (the canonical run machine) and
 * committed alongside. Regenerate with:
 *     npx playwright test e2e/visual.spec.ts --update-snapshots
 */

const VIEWPORT = { width: 1280, height: 800 };

test.describe('visual baselines', () => {
  test('onboarding Step 1 — pristine wizard card', async ({ window }) => {
    await window.setViewportSize(VIEWPORT);
    await expect(window.getByText('Step 1 of 7')).toBeVisible();
    // Freeze the render — give fonts and the Framer-Motion tour carousel
    // a beat to settle before snapping.
    await window.waitForTimeout(400);
    expect(await window.screenshot({ fullPage: false })).toMatchSnapshot('onboarding-step1.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('dashboard empty state', async ({ seedSettings, window }) => {
    seedSettings({ onboardingComplete: true });
    await window.setViewportSize(VIEWPORT);
    await expect(window.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(window.getByText('No projects yet.')).toBeVisible();
    await window.waitForTimeout(400);
    expect(await window.screenshot({ fullPage: false })).toMatchSnapshot('dashboard-empty.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('app settings — Appearance tab in dark theme', async ({ seedSettings, window }) => {
    seedSettings({ onboardingComplete: true, theme: 'dark' });
    await window.setViewportSize(VIEWPORT);
    await window.getByRole('button', { name: 'Settings' }).click();
    await window.getByRole('button', { name: 'Appearance' }).click();
    await window.waitForTimeout(400);
    expect(await window.screenshot({ fullPage: false })).toMatchSnapshot('settings-appearance-dark.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});
