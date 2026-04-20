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
import { MetricsService } from './services/metrics.service';
import { bindThemeBroadcasts, pushAccentToAllWindows, pushSystemThemeToAllWindows } from './services/theme.service';

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

    const metricsService = new MetricsService(appDb);
    registerAllHandlers({
      licence: licenceService,
      settings: settingsService,
      appDb: appDb,
      metrics: metricsService,
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
      logger.warn('licence.gate-miss — falling through to main window', {
        reason: licence.reason,
      });
    }
    bindThemeBroadcasts();
    const mainWin = createMainWindow();

    // Send the initial accent + light/dark once the renderer is ready so
    // the ThemeProvider does not flash the default `#0078D4` before the
    // system accent arrives.
    mainWin.webContents.once('did-finish-load', () => {
      pushAccentToAllWindows();
      pushSystemThemeToAllWindows();
    });

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
