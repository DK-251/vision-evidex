import { test, expect } from './fixtures';

/**
 * Dashboard + AppSettings — the post-onboarding surface. These specs
 * skip the wizard by seeding `settings.json` with onboardingComplete
 * already true, then assert the dashboard shell + the 6 settings tabs
 * all render.
 */

test.use({
  storageState: undefined,
});

test.describe('dashboard (onboarded)', () => {
  test.beforeEach(async ({ seedSettings }) => {
    seedSettings({ onboardingComplete: true });
  });

  test('renders Dashboard heading and the four metric cards', async ({ window }) => {
    await expect(window.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(window.getByText('Active projects')).toBeVisible();
    await expect(window.getByText('Sessions today')).toBeVisible();
    await expect(window.getByText('Captures this week')).toBeVisible();
    await expect(window.getByText('Exports this week')).toBeVisible();
  });

  test('shows "No projects yet." empty state when recent_projects is empty', async ({ window }) => {
    await expect(window.getByRole('heading', { name: 'Recent projects' })).toBeVisible();
    await expect(window.getByText('No projects yet.')).toBeVisible();
  });

  test('Settings button navigates to AppSettingsPage', async ({ window }) => {
    await window.getByRole('button', { name: 'Settings' }).click();
    await expect(window.getByRole('heading', { name: 'App settings' })).toBeVisible();
  });
});

test.describe('AppSettings tabs', () => {
  test.beforeEach(async ({ seedSettings, window }) => {
    seedSettings({ onboardingComplete: true });
    await window.getByRole('button', { name: 'Settings' }).click();
    await expect(window.getByRole('heading', { name: 'App settings' })).toBeVisible();
  });

  test('six tabs render with correct labels (Licence in keygen → About in none)', async ({ window }) => {
    for (const label of ['Profile', 'Hotkeys', 'Appearance', 'Storage', 'Defaults']) {
      await expect(window.getByRole('button', { name: label })).toBeVisible();
    }
    // In `none` mode the sixth tab reads "About", not "Licence".
    await expect(window.getByRole('button', { name: 'About' })).toBeVisible();
  });

  test('clicking each tab shows its content without unmount errors', async ({ window }) => {
    const tabs = ['Hotkeys', 'Appearance', 'Storage', 'Defaults', 'About', 'Profile'];
    for (const t of tabs) {
      await window.getByRole('button', { name: t }).click();
      // a lightweight assertion: no error alert role surfaces
      await expect(window.getByRole('alert')).toHaveCount(0);
    }
  });

  test('Dashboard back-link returns to DashboardPage', async ({ window }) => {
    await window.getByRole('button', { name: /Dashboard/ }).click();
    await expect(window.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
