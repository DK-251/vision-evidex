import { defineConfig } from '@playwright/test';

/**
 * Playwright config for Vision-EviDex end-to-end tests.
 *
 * Tests drive the packaged-style main process via `_electron.launch()` —
 * each spec file is responsible for building a clean tmp `userData` dir
 * so runs do not collide with each other or with the developer's real
 * `%APPDATA%\VisionEviDex` state. The `EVIDEX_APPDATA_ROOT` env var
 * (honored by `src/main/app-paths.ts::appDataRoot`) is how isolation is
 * achieved.
 *
 * Run these via `npm run test:e2e`. Asus must install the Playwright
 * browser binaries once (`npx playwright install`) — the node_modules
 * install alone is not sufficient.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'run-reports/e2e-results.json' }],
    ['html', { outputFolder: 'run-reports/e2e-html', open: 'never' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
