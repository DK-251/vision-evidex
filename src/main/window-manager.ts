import { BrowserWindow } from 'electron';
import path from 'node:path';
import { baseWindowConfig } from './window-config';
import { IPC_EVENTS } from '@shared/ipc-channels';
import type { Session, SessionStatus } from '@shared/types/entities';
import { logger } from './logger';

/**
 * Main-window creation. The title bar is fully owned by the renderer
 * (see `src/renderer/components/shell/TitleBar.tsx`) — Electron uses
 * `frame: false` so the OS paints no native chrome at all; caption
 * buttons are rendered in React and dispatched through IPC.
 */

function applyWindowMaterial(win: BrowserWindow): void {
  if (process.platform !== 'win32') return;
  try {
    win.setBackgroundMaterial('mica');
  } catch (err) {
    logger.warn('setBackgroundMaterial(mica) failed — falling back to solid fill', {
      err: String(err),
    });
  }
}

let mainWindow: BrowserWindow | undefined;
let toolbarWindow: BrowserWindow | undefined;
let annotationWindow: BrowserWindow | undefined;
let regionWindow: BrowserWindow | undefined;

const RENDERER_BASE_URL = process.env['ELECTRON_RENDERER_URL'];

function loadRendererEntry(window: BrowserWindow, entry: 'main' | 'toolbar' | 'annotation' | 'region'): void {
  const dir = entry === 'main' ? 'renderer' : entry;
  window.webContents.on('did-fail-load', (_e, code, description, url) => {
    logger.error('window.did-fail-load', { entry, code, description, url });
  });
  if (RENDERER_BASE_URL) {
    window.loadURL(`${RENDERER_BASE_URL}/src/${dir}/index.html`);
  } else {
    window.loadFile(path.join(__dirname, `../renderer/src/${dir}/index.html`));
  }
}

function wireWindowStateBroadcasts(win: BrowserWindow): void {
  const broadcast = (maximized: boolean): void => {
    if (win.isDestroyed()) return;
    win.webContents.send(IPC_EVENTS.WINDOW_MAXIMIZED_CHANGE, maximized);
  };
  win.on('maximize', () => broadcast(true));
  win.on('unmaximize', () => broadcast(false));
  win.on('enter-full-screen', () => broadcast(true));
  win.on('leave-full-screen', () => broadcast(false));
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    ...baseWindowConfig(),
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'Vision-EviDex',
    frame: false,
    backgroundColor: '#00000000',
  });

  applyWindowMaterial(mainWindow);
  wireWindowStateBroadcasts(mainWindow);

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
  loadRendererEntry(mainWindow, 'main');
  return mainWindow;
}

export function createToolbarWindow(): BrowserWindow {
  toolbarWindow = new BrowserWindow({
    ...baseWindowConfig(),
    width: 480,
    height: 72,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
  });
  toolbarWindow.setContentProtection(true);
  toolbarWindow.once('ready-to-show', () => toolbarWindow?.show());
  toolbarWindow.on('closed', () => {
    toolbarWindow = undefined;
  });
  loadRendererEntry(toolbarWindow, 'toolbar');
  return toolbarWindow;
}

export function createAnnotationWindow(): BrowserWindow {
  annotationWindow = new BrowserWindow({
    ...baseWindowConfig(),
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Annotate Evidence',
  });
  annotationWindow.once('ready-to-show', () => annotationWindow?.show());
  annotationWindow.on('closed', () => {
    annotationWindow = undefined;
  });
  loadRendererEntry(annotationWindow, 'annotation');
  return annotationWindow;
}

export function createRegionWindow(): BrowserWindow {
  regionWindow = new BrowserWindow({
    ...baseWindowConfig(),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    fullscreen: true,
    hasShadow: false,
  });
  regionWindow.once('ready-to-show', () => regionWindow?.show());
  regionWindow.on('closed', () => {
    regionWindow = undefined;
  });
  loadRendererEntry(regionWindow, 'region');
  return regionWindow;
}

export function getMainWindow(): BrowserWindow | undefined {
  return mainWindow;
}

export function getToolbarWindow(): BrowserWindow | undefined {
  return toolbarWindow;
}

/**
 * Show the floating toolbar bound to an active session. Lifecycle is
 * driven by `SessionService.create()` / `.end()` (not by the user) so
 * the toolbar is only visible while a session is active.
 *
 * The session is pushed once on show via `SESSION_STATUS_UPDATE` so the
 * toolbar renderer can display the test ID and initialise its counter
 * without re-querying the DB on every render.
 */
export function showToolbarWindow(session: Session): void {
  const win = toolbarWindow && !toolbarWindow.isDestroyed()
    ? toolbarWindow
    : createToolbarWindow();

  const initialStatus: SessionStatus = {
    sessionId:    session.id,
    captureCount: session.captureCount,
    passCount:    session.passCount,
    failCount:    session.failCount,
    blockedCount: session.blockedCount,
  };

  const pushInitial = (): void => {
    if (win.isDestroyed()) return;
    win.webContents.send(IPC_EVENTS.SESSION_STATUS_UPDATE, initialStatus);
  };
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', pushInitial);
  } else {
    pushInitial();
  }

  if (!win.isVisible()) win.show();
}

export function hideToolbarWindow(): void {
  if (toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.isVisible()) {
    toolbarWindow.hide();
  }
}

export function getAnnotationWindow(): BrowserWindow | undefined {
  return annotationWindow;
}

export function getRegionWindow(): BrowserWindow | undefined {
  return regionWindow;
}

export function destroyAllWindows(): void {
  for (const win of [mainWindow, toolbarWindow, annotationWindow, regionWindow]) {
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
  }
}
