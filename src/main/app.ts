import { app, BrowserWindow, globalShortcut, session } from 'electron';
import path from 'node:path';
import os from 'node:os';
import {
  createMainWindow,
  destroyAllWindows,
  getMainWindow,
  showToolbarWindow,
  hideToolbarWindow,
} from './window-manager';
import { CSP_HEADER } from './window-config';
import { registerAllHandlers } from './ipc-router';
import { getAppDataRoot, getLicencePath, getSettingsPath } from './app-paths';
import { logger } from './logger';
import { LicenceService } from './services/licence.service';
import { SettingsService } from './services/settings.service';
import { DatabaseService } from './services/database.service';
import { MetricsService } from './services/metrics.service';
import { ShortcutService } from './services/shortcut.service';
import { SessionService, makeSessionWindowControls } from './services/session.service';
import { EvidexContainerService } from './services/evidex-container.service';
import { NamingService } from './services/naming.service';
import {
  CaptureService,
  type CaptureSessionContext,
  type SessionLookup,
} from './services/capture.service';
import { electronCaptureSource } from './services/electron-capture-source';
import { ProjectService } from './services/project.service';
import { seedBuiltinDefaults } from './services/seed-defaults';
import { getMachineFingerprint } from './services/machine-fingerprint';
import { bindThemeBroadcasts, pushAccentToAllWindows, pushSystemThemeToAllWindows } from './services/theme.service';
import { IPC_EVENTS } from '@shared/ipc-channels';
import { EvidexError } from '@shared/types/errors';
import { EvidexErrorCode } from '@shared/types/ipc';
import type { CaptureMode } from '@shared/types/entities';

export const isDev = !app.isPackaged;

const LICENCE_MODE = ((process.env['EVIDEX_LICENCE_MODE'] ?? 'none') === 'keygen'
  ? 'keygen'
  : 'none') as 'keygen' | 'none';

let licenceService: LicenceService | undefined;
let settingsService: SettingsService | undefined;
let appDb: DatabaseService | undefined;
let shortcutService: ShortcutService | undefined;
let sessionService: SessionService | undefined;
let captureService: CaptureService | undefined;
let projectService: ProjectService | undefined;

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
    // First-run seed: one builtin template + one default branding profile
    // (rows skipped if already present). The full 5-template builtin pack
    // lands in Phase 3 alongside the Template Builder.
    seedBuiltinDefaults(appDb);

    const metricsService = new MetricsService(appDb);

    // Container password is derived from EVIDEX_APP_SECRET + the per-machine
    // fingerprint so a .evidex only opens on the machine that created it.
    // Wk 8 (Project-open) will switch this to a proper key-stretching path.
    const containerService = new EvidexContainerService({
      password: Buffer.from(
        (process.env['EVIDEX_APP_SECRET'] ?? '') + getMachineFingerprint(),
        'utf8'
      ),
    });

    const namingService = new NamingService();

    // SessionLookup adapter — D35 plumbing variant. projectName / clientName
    // are stubbed pre-Wk8 because the project-DB lookup ships alongside
    // Project-open. Container ID resolves to 'NO_CONTAINER' when nothing
    // is open, and the capture pipeline will fail at addImage — that
    // failure is the expected D35 behaviour per AQ5.
    const sessionLookup: SessionLookup = {
      async getSessionContext(sessionId: string): Promise<CaptureSessionContext> {
        const sess = sessionService?.get(sessionId) ?? null;
        if (!sess) {
          throw new EvidexError(
            EvidexErrorCode.SESSION_NOT_FOUND,
            `SessionLookup: session ${sessionId} not found`,
            { sessionId }
          );
        }
        const handle = containerService.getCurrentHandle();
        const containerId =
          handle && handle.projectId === sess.projectId
            ? handle.containerId
            : 'NO_CONTAINER';
        return {
          sessionId,
          projectId:       sess.projectId,
          containerId,
          testerName:      sess.testerName,
          // STUB — Phase 2 Wk 8 project.store wires real values
          projectName:     'Pre-Wk8 Project',
          clientName:      'Pre-Wk8 Client',
          testId:          sess.testId,
          environment:     sess.environment,
          nextSequenceNum: appDb!.getNextSequenceNum(sess.projectId),
        };
      },
    };

    captureService = new CaptureService({
      source:    electronCaptureSource,
      sessions:  sessionLookup,
      container: containerService,
      // Wk 8 — per-container project DB resolved on every call.
      // When no project is open: getDb() returns null and CaptureService
      // throws PROJECT_NOT_FOUND through the IpcResult error path.
      getDb:     () => containerService.getProjectDb(),
      naming:    namingService,
      runtime: {
        machineName: os.hostname(),
        osVersion:   `${process.platform}-${os.release()}`,
        appVersion:  app.getVersion(),
      },
    });

    shortcutService = new ShortcutService({
      onCapture: async (sessionId: string, mode: CaptureMode): Promise<void> => {
        if (!sessionService || !captureService) return;
        const sess = sessionService.get(sessionId);
        if (!sess || sess.endedAt !== undefined) return;
        try {
          await captureService.screenshot({ sessionId, mode });
          const updated = sessionService.get(sessionId);
          for (const win of BrowserWindow.getAllWindows()) {
            if (win.isDestroyed()) continue;
            if (updated) {
              win.webContents.send(IPC_EVENTS.SESSION_STATUS_UPDATE, {
                sessionId:    updated.id,
                captureCount: updated.captureCount,
                passCount:    updated.passCount,
                failCount:    updated.failCount,
                blockedCount: updated.blockedCount,
              });
            }
            win.webContents.send(IPC_EVENTS.CAPTURE_FLASH);
          }
        } catch (err) {
          // Never throw from a globalShortcut callback. In D35 plumbing
          // mode the failure is expected (NO_CONTAINER sentinel blocks
          // step 7 of the capture pipeline) — the tester sees a logger
          // entry, not a crash.
          logger.warn('hotkey.capture failed', {
            sessionId, mode, err: err instanceof Error ? err.message : String(err),
          });
        }
      },
    });

    sessionService = new SessionService({
      // Wk 8 — same swap as CaptureService. SessionService.create now
      // throws PROJECT_NOT_FOUND when no project is open instead of
      // hitting a "no such table: sessions" SQLite error against app.db.
      getDb: () => containerService.getProjectDb(),
      container: containerService,
      shortcuts: shortcutService,
      settings: settingsService,
      windows: makeSessionWindowControls(
        showToolbarWindow,
        hideToolbarWindow,
        () => BrowserWindow.getAllWindows()
      ),
    });

    projectService = new ProjectService({
      appDb,
      container: containerService,
      sessions: sessionService,
      appVersion: app.getVersion(),
    });

    registerAllHandlers({
      licence: licenceService,
      settings: settingsService,
      appDb: appDb,
      metrics: metricsService,
      session: sessionService,
      capture: captureService,
      container: containerService,
      project: projectService,
      naming: namingService,
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
    // Order matters per AQ6: clear ShortcutService's internal state first
    // (active sessionId + bindings), then run the globalShortcut backstop.
    shortcutService?.unregisterSessionShortcuts();
    globalShortcut.unregisterAll(); // defensive — runs even if ShortcutService not initialised
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
