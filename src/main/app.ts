import { app, BrowserWindow, globalShortcut, session } from 'electron';
import path from 'node:path';
import { createMainWindow, destroyAllWindows, getMainWindow } from './window-manager';
import { CSP_HEADER } from './window-config';
import { registerAllHandlers } from './ipc-router';
import { getAppDataRoot, getLicencePath, getSettingsPath } from './app-paths';
import { logger } from './logger';
import { LicenceService } from './services/licence.service';
import { SettingsService } from './services/settings.service';
import { DatabaseService } from './services/database.service';

/**
 * Vision-EviDex main process entry point.
 *
 * Phase 1 Week 3 D11 responsibilities:
 *   - Single-instance lock
 *   - Content Security Policy on every renderer session
 *   - IPC handler registration
 *   - AppData directory provisioning
 *   - File-backed logger initialization
 *   - Licence validation at startup (no-op in Phase 0–1 stub mode)
 *   - globalShortcut cleanup on quit
 *
 * Later phases expand this file with:
 *   - Activation window routing when `licenceService.validate()` returns invalid (Week 4)
 *   - Onboarding window routing when settings.onboardingComplete === false (Week 5)
 *   - System tray + hotkey registration (Phase 2)
 */

export const isDev = !app.isPackaged;

const LICENCE_MODE = ((process.env['EVIDEX_LICENCE_MODE'] ?? 'none') === 'keygen'
  ? 'keygen'
  : 'none') as 'keygen' | 'none';

let licenceService: LicenceService | undefined;
let settingsService: SettingsService | undefined;
let appDb: DatabaseService | undefined;

function applyCSP(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP_HEADER],
      },
    });
  });
}

function setAppUserModelId(): void {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.vision-evidex.app');
  }
}

function bootstrap(): void {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    const appDataRoot = getAppDataRoot();
    logger.info('app.ready', {
      isDev,
      appDataRoot,
      platform: process.platform,
      electron: process.versions.electron,
      node: process.versions.node,
    });

    setAppUserModelId();
    applyCSP();

    licenceService = new LicenceService({
      mode: LICENCE_MODE,
      licenceFilePath: getLicencePath(),
      isDev,
      ...(process.env['EVIDEX_KEYGEN_PUBLIC_KEY']
        ? { publicKeyPem: process.env['EVIDEX_KEYGEN_PUBLIC_KEY'] }
        : {}),
      ...(process.env['EVIDEX_KEYGEN_ACCOUNT_ID']
        ? { keygenAccountId: process.env['EVIDEX_KEYGEN_ACCOUNT_ID'] }
        : {}),
    });

    settingsService = new SettingsService(getSettingsPath());
    settingsService.loadSettings();

    appDb = new DatabaseService(path.join(appDataRoot, 'app.db'));
    appDb.initAppSchema();

    registerAllHandlers({
      licence: licenceService,
      settings: settingsService,
      appDb: appDb,
      getMainWindow,
    });

    logger.info('services.ready', {
      onboardingComplete: settingsService.isOnboardingComplete(),
      appDbPath: path.join(appDataRoot, 'app.db'),
    });

    const licence = licenceService.validate();
    logger.info('licence.validate', {
      mode: licenceService.getMode(),
      valid: licence.valid,
      ...(licence.valid ? {} : { reason: licence.reason }),
    });
    if (!licence.valid) {
      // Activation window lands D20 — for now we log the gate miss
      // and fall through to the main window so dev can still boot.
      logger.warn('licence.gate-miss — falling through to main window (D20 will route to activation)', {
        reason: licence.reason,
      });
    }
    // Week 5 adds: if (!settingsService.isOnboardingComplete()) return windowManager.showOnboardingWindow();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    destroyAllWindows();
    try {
      appDb?.close();
    } catch (err) {
      logger.warn('appDb.close failed', { err: String(err) });
    }
    logger.info('app.will-quit');
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', { message: err.message, stack: err.stack });
});

bootstrap();

export const __APP_DIR__ = path.resolve(__dirname);
