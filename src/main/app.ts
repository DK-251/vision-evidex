import { app, BrowserWindow, session } from 'electron';
import path from 'node:path';
import { createMainWindow } from './window-manager';
import { CSP_HEADER } from './window-config';
import { registerAllHandlers } from './ipc-router';

/**
 * Vision-EviDex main process entry point.
 *
 * Phase 0 responsibilities (this file):
 *   - Ensure single instance.
 *   - Apply Content Security Policy to all renderer sessions.
 *   - Register IPC handlers.
 *   - Create the main window on app ready.
 *
 * Later phases expand this file with:
 *   - Licence validation gate (Phase 1 Week 4)
 *   - Onboarding window routing (Phase 1 Week 5)
 *   - System tray + global shortcuts (Phase 2)
 */

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
    setAppUserModelId();
    applyCSP();
    registerAllHandlers();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

// Surface uncaught promise rejections instead of silent failure.
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[main] unhandled rejection:', reason);
});

bootstrap();

// Path used by relative imports during build; keep silent.
export const __APP_DIR__ = path.resolve(__dirname);
