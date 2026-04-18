import { test, expect } from './fixtures';

/**
 * Appearance coverage — theme switching, design-token resolution,
 * skeleton shimmer presence. Asserts that colour / font / radius
 * tokens declared in `src/renderer/styles/tokens.css` actually reach
 * computed style, which catches missing CSS imports and typo'd var
 * names.
 */

test.describe('theme + design tokens', () => {
  test.beforeEach(async ({ seedSettings }) => {
    seedSettings({ onboardingComplete: true });
  });

  test('html data-theme attribute is set from settings.theme', async ({ window }) => {
    // Seeded theme defaults to 'system' — the Appearance tab explicitly
    // writes data-theme on mount. Navigate to it to force the effect.
    await window.getByRole('button', { name: 'Settings' }).click();
    await window.getByRole('button', { name: 'Appearance' }).click();
    const theme = await window.evaluate(() => document.documentElement.dataset['theme']);
    expect(['light', 'dark', 'system']).toContain(theme);
  });

  test('switching theme radio updates data-theme attribute', async ({ window }) => {
    await window.getByRole('button', { name: 'Settings' }).click();
    await window.getByRole('button', { name: 'Appearance' }).click();

    await window.getByRole('radio', { name: 'dark' }).check({ force: true });
    await expect
      .poll(async () => window.evaluate(() => document.documentElement.dataset['theme']))
      .toBe('dark');

    await window.getByRole('radio', { name: 'light' }).check({ force: true });
    await expect
      .poll(async () => window.evaluate(() => document.documentElement.dataset['theme']))
      .toBe('light');
  });

  test('CSS variable tokens resolve to concrete colours', async ({ window }) => {
    const values = await window.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        accent: style.getPropertyValue('--color-accent').trim(),
        textPrimary: style.getPropertyValue('--text-primary').trim(),
        surfacePrimary: style.getPropertyValue('--surface-primary').trim(),
        radiusMd: style.getPropertyValue('--radius-md').trim(),
      };
    });
    expect(values.accent).toMatch(/^#?[0-9a-fA-F]{3,8}$|^rgb/);
    expect(values.textPrimary).toMatch(/^#?[0-9a-fA-F]{3,8}$|^rgb/);
    expect(values.surfacePrimary).toMatch(/^#?[0-9a-fA-F]{3,8}$|^rgb/);
    expect(values.radiusMd).toMatch(/\d+px/);
  });
});

test.describe('loading skeletons', () => {
  test('boot skeleton or post-boot content is visible within 2s (no blank white)', async ({ window }) => {
    // At least one of: skeleton pulsing block, boot card, or onboarding wizard.
    // The OR guards the fast-boot case where the skeleton flashes past.
    const candidates = window.locator('[aria-hidden="true"].animate-pulse, :has-text("Step 1 of")');
    await expect(candidates.first()).toBeVisible({ timeout: 2_000 });
  });

  test('dashboard metrics eventually show real numbers (skeleton resolves)', async ({ seedSettings, window }) => {
    seedSettings({ onboardingComplete: true });
    // Wait past any skeleton → concrete metric card with a numeric value.
    const activeCard = window.locator(':has-text("Active projects")').first();
    await expect(activeCard).toBeVisible();
    await expect
      .poll(async () => activeCard.innerText(), { timeout: 5_000 })
      .toMatch(/\d/);
  });
});
