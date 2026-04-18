import { test, expect } from './fixtures';

/**
 * Onboarding wizard — the critical first-run flow. In `none` licence
 * mode the visible sequence is 7 steps: tour → profile → branding →
 * template → hotkeys → themeStorage → done. Tests exercise
 * navigation, validation gating, and form input writes.
 */

test.describe('onboarding wizard', () => {
  test('renders Step 1 of 7 with Back disabled and Next visible', async ({ window }) => {
    await expect(window.getByText('Step 1 of 7')).toBeVisible();
    const back = window.getByRole('button', { name: 'Back' });
    await expect(back).toBeDisabled();
    const nextOrFinish = window.getByRole('button', { name: /Next|Finish/ });
    await expect(nextOrFinish).toBeVisible();
  });

  test('Next advances the step counter', async ({ window }) => {
    await expect(window.getByText('Step 1 of 7')).toBeVisible();
    const next = window.getByRole('button', { name: 'Next' });
    // Tour step is optional and always valid — Next is enabled from the start.
    await next.click();
    await expect(window.getByText('Step 2 of 7')).toBeVisible();
  });

  test('Back returns to the previous step', async ({ window }) => {
    await window.getByRole('button', { name: 'Next' }).click();
    await expect(window.getByText('Step 2 of 7')).toBeVisible();
    await window.getByRole('button', { name: 'Back' }).click();
    await expect(window.getByText('Step 1 of 7')).toBeVisible();
  });

  test('profile step gates Next until name and role are filled', async ({ window }) => {
    // Advance to profile (step 2 in none mode).
    await window.getByRole('button', { name: 'Next' }).click();
    await expect(window.getByText('Step 2 of 7')).toBeVisible();

    const next = window.getByRole('button', { name: 'Next' });
    await expect(next).toBeDisabled();

    // Filling name alone is not enough — role is also required.
    await window.getByLabel(/name/i).fill('Deepak Sahu');
    await expect(next).toBeDisabled();

    // Role is a native <select>; first non-empty option unblocks Next.
    const role = window.locator('select').first();
    const options = await role.locator('option').allTextContents();
    const firstReal = options.find((o) => o.trim().length > 0 && !/select/i.test(o));
    if (firstReal) await role.selectOption({ label: firstReal });
    await expect(next).toBeEnabled();
  });

  test('Skip button is present on optional steps and absent on required ones', async ({ window }) => {
    // Step 1 (tour) is optional → Skip visible.
    const skipOnOptional = window.getByRole('button', { name: 'Skip' });
    await expect(skipOnOptional).toBeVisible();

    // Advance to step 2 (profile, required) → Skip gone.
    await window.getByRole('button', { name: 'Next' }).click();
    await expect(window.getByText('Step 2 of 7')).toBeVisible();
    await expect(window.getByRole('button', { name: 'Skip' })).toHaveCount(0);
  });
});
