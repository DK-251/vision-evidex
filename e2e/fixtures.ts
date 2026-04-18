import { test as base, _electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Shared fixtures for Vision-EviDex e2e.
 *
 * `app` launches the built main-process entry with an isolated tmp
 * userData dir. `window` is the first BrowserWindow — currently the
 * main renderer, since the app does not open overlay windows until
 * Phase 2. Each test gets its own tmp dir so `settings.json` and
 * `app.db` state never leaks between tests.
 *
 * Callers that need onboarding to be pre-completed can seed a
 * `settings.json` via `seedSettings` before opening `app`.
 */

type Fx = {
  userDataDir: string;
  app: ElectronApplication;
  window: Page;
  seedSettings: (partial: Record<string, unknown>) => void;
};

const MAIN_ENTRY = path.resolve(__dirname, '..', 'out', 'main', 'app.js');

export const test = base.extend<Fx>({
  userDataDir: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidex-e2e-'));
    await use(dir);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort — don't fail teardown
    }
  },

  seedSettings: async ({ userDataDir }, use) => {
    const write = (partial: Record<string, unknown>): void => {
      const full = {
        schemaVersion: 1,
        onboardingComplete: false,
        theme: 'system',
        defaultStoragePath: '',
        defaultTemplateId: '',
        ...partial,
      };
      fs.writeFileSync(path.join(userDataDir, 'settings.json'), JSON.stringify(full, null, 2), 'utf8');
    };
    await use(write);
  },

  app: async ({ userDataDir }, use) => {
    if (!fs.existsSync(MAIN_ENTRY)) {
      throw new Error(
        `Main-process entry not built at ${MAIN_ENTRY}. Run \`npm run build\` before \`npm run test:e2e\`.`
      );
    }
    const electronApp = await _electron.launch({
      args: [MAIN_ENTRY],
      env: {
        ...process.env,
        EVIDEX_LICENCE_MODE: 'none',
        EVIDEX_APPDATA_ROOT: userDataDir,
        NODE_ENV: 'test',
      },
    });
    await use(electronApp);
    await electronApp.close();
  },

  window: async ({ app }, use) => {
    const win = await app.firstWindow();
    await win.waitForLoadState('domcontentloaded');
    await use(win);
  },
});

export { expect } from '@playwright/test';
