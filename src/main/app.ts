import { app, BrowserWindow, globalShortcut, ipcMain, session } from 'electron';
import path from 'node:path';
import os from 'node:os';
import {
  createMainWindow,
  createRegionWindow,
  destroyAllWindows,
  getMainWindow,
  getRegionWindow,
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
import type { CaptureMode, CaptureResult, ScreenRegion } from '@shared/types/entities';

/** W10 — broadcast a capture result to all renderer windows. */
function broadcastCapture(sessionId: string, result: CaptureResult): void {
  const updated = sessionService?.get(sessionId);
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
    win.webContents.send(IPC_EVENTS.CAPTURE_ARRIVED, result);
  }
}

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
/**
 * Set to `true` once the async pre-quit save has finished and we are
 * letting Electron tear down. The `before-quit` handler short-circuits
 * on the second pass — otherwise it would prevent quit forever.
 */
let isQuitting = false;
/**
 * Set after the container service is constructed so the module-scope
 * `before-quit` handler can ask "is a project open?" without holding
 * a typed reference to the service itself (which lives inside
 * `app.whenReady`). Returns null when nothing is open.
 */
let getOpenProjectIdForQuit: () => string | null = () => null;
/** W10 D34 — resolve function waiting for region selection result. */
let pendingRegionCapture: ((rect: ScreenRegion) => Promise<void>) | null = null;

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
    // Expose a thin probe to the module-scope before-quit handler so it
    // can run the async close+save dance if the user quits with a
    // project still open (Architectural Rule 8).
    getOpenProjectIdForQuit = (): string | null =>
      containerService.getCurrentHandle()?.projectId ?? null;

    const namingService = new NamingService();

    // SessionLookup adapter — Wk 8 final form. projectName / clientName
    // come from the per-container project DB; the NO_CONTAINER sentinel
    // is gone. Surface PROJECT_NOT_FOUND if the user somehow reaches the
    // capture pipeline without a project open (the SessionService /
    // CaptureService getDb guards normally catch this earlier).
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
        if (!handle || handle.projectId !== sess.projectId) {
          throw new EvidexError(
            EvidexErrorCode.PROJECT_NOT_FOUND,
            'No project is open for this session.',
            { sessionId, projectId: sess.projectId }
          );
        }
        const projectDb = containerService.getProjectDb();
        const project = projectDb?.getProject(sess.projectId) ?? null;
        if (!project || !projectDb) {
          throw new EvidexError(
            EvidexErrorCode.PROJECT_NOT_FOUND,
            'Project record missing from the open container.',
            { projectId: sess.projectId }
          );
        }
        return {
          sessionId,
          projectId:       sess.projectId,
          containerId:     handle.containerId,
          testerName:      sess.testerName,
          projectName:     project.name,
          clientName:      project.clientName,
          // namingPattern is required-string in Project but optional in
          // CaptureSessionContext — guard against an empty pattern row
          // landing in the spread.
          ...(project.namingPattern ? { namingPattern: project.namingPattern } : {}),
          testId:          sess.testId,
          environment:     sess.environment,
          // The captures table is project-DB scoped; query it through
          // projectDb, NOT appDb (the latter has no captures table).
          nextSequenceNum: projectDb.getNextSequenceNum(sess.projectId),
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
          // W10 D34 — Region mode: open the overlay, wait for user selection.
          if (mode === 'region') {
            pendingRegionCapture = async (rect: ScreenRegion): Promise<void> => {
              const result = await captureService!.screenshot({ sessionId, mode, region: rect });
              broadcastCapture(sessionId, result);
            };
            createRegionWindow();
            return; // resolve happens in ipcMain.on(REGION_SELECTED)
          }
          const result = await captureService.screenshot({ sessionId, mode });
          broadcastCapture(sessionId, result);
        } catch (err) {
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

    // W10 D34 — Region capture IPC. The region renderer sends
    // 'region:selected' with { x, y, width, height } on mouseup, or
    // 'region:cancel' on Esc. Both close the region window. Any
    // failure inside the pending callback is logged but never thrown
    // — the IPC channel has no surface to return errors on.
    ipcMain.on(IPC_EVENTS.REGION_SELECTED, (_e, rect: { x: number; y: number; width: number; height: number }) => {
      const rw = getRegionWindow();
      if (rw && !rw.isDestroyed()) rw.close();
      const pending = pendingRegionCapture;
      pendingRegionCapture = null;
      if (!pending) return;
      void (async (): Promise<void> => {
        try {
          await pending(rect);
        } catch (err) {
          logger.warn('region.capture failed', {
            err: err instanceof Error ? err.message : String(err),
          });
        }
      })();
    });
    ipcMain.on(IPC_EVENTS.REGION_CANCEL, () => {
      const rw = getRegionWindow();
      if (rw && !rw.isDestroyed()) rw.close();
      pendingRegionCapture = null;
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

  /**
   * Architectural Rule 8 — `EvidexContainerService.save()` must run on
   * every session/project teardown. If the user quits with a project
   * still open (red-X on the main window, OS shutdown, etc.) Electron's
   * default flow tears the process down before our async save can flush.
   *
   * We intercept the FIRST `before-quit`, prevent the default, run
   * `projectService.close(...)` (which ends the active session and
   * writes the container atomically), then call `app.quit()` again.
   * `isQuitting` short-circuits the second pass so we don't loop.
   */
  app.on('before-quit', (event) => {
    if (isQuitting) return;
    const projectId = getOpenProjectIdForQuit();
    if (!projectId || !projectService) return; // nothing to flush
    event.preventDefault();
    void (async (): Promise<void> => {
      try {
        await projectService.close(projectId);
      } catch (err) {
        logger.error('before-quit: project.close failed — quitting anyway', {
          projectId, err: err instanceof Error ? err.message : String(err),
        });
      } finally {
        isQuitting = true;
        app.quit();
      }
    })();
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
