import { BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { baseWindowConfig } from './window-config';
import { IPC_EVENTS } from '@shared/ipc-channels';
import type { Session } from '@shared/types/entities';
import { logger } from './logger';

/**
 * Snipping-Tool-style toolbar dimensions.
 *
 * The window is made FULL-DISPLAY-WIDTH so the user can drag the pill
 * left and right across the top of the screen. Only the pill is visible
 * (the rest is transparent). The Electron window has `movable: true` but
 * we clamp vertical position via the 'move' event so the toolbar always
 * hugs the top edge.
 *
 * The pill itself contains a dedicated drag-handle region (marked
 * -webkit-app-region:drag in CSS) so only intentional drags on the
 * handle move the window, not accidental drags on buttons.
 */
const TOOLBAR_HEIGHT     = 88;
const TOOLBAR_TOP_OFFSET =  8;

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
  // Use full display width so the pill can be dragged anywhere left/right.
  const { workArea } = screen.getPrimaryDisplay();
  const toolbarWidth  = workArea.width;

  toolbarWindow = new BrowserWindow({
    ...baseWindowConfig(),
    width:       toolbarWidth,
    height:      TOOLBAR_HEIGHT,
    frame:       false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable:   false,
    movable:     true,          // allow horizontal drag via the handle
    transparent: true,
    hasShadow:   false,
    show:        false,         // showToolbarWindow positions then shows
    focusable:   false,         // capture toolbar must not steal focus
  });
  toolbarWindow.setContentProtection(true);

  // Clamp vertical position — toolbar must always hug the top edge.
  // The user can only drag left/right; any vertical drift is corrected.
  toolbarWindow.on('move', () => {
    if (!toolbarWindow || toolbarWindow.isDestroyed()) return;
    const [cx, ] = toolbarWindow.getPosition();
    const { workArea: wa } = screen.getPrimaryDisplay();
    const clampedY = wa.y + TOOLBAR_TOP_OFFSET;
    // Only write back when Y has drifted — avoids a tight event loop.
    toolbarWindow.setPosition(cx, clampedY, false);
  });

  toolbarWindow.on('closed', () => {
    toolbarWindow = undefined;
  });
  loadRendererEntry(toolbarWindow, 'toolbar');
  return toolbarWindow;
}

/** Position the toolbar window at the top of the primary display.
 *  X defaults to the horizontal centre on first show; subsequent shows
 *  preserve the user's chosen X position (they may have dragged it).
 *  Y is always clamped to TOOLBAR_TOP_OFFSET so it hugs the top edge. */
function positionToolbarTopCenter(win: BrowserWindow): void {
  try {
    const { workArea } = screen.getPrimaryDisplay();
    const toolbarWidth = workArea.width;
    // If the window has never been shown, its X is 0. Snap to centre.
    // If it has been shown before, preserve the current X.
    const [currentX, ] = win.getPosition();
    const isFirstShow   = !win.isVisible();
    const x = isFirstShow
      ? workArea.x  // full-width window starts at left edge of workArea
      : Math.max(workArea.x, Math.min(currentX, workArea.x + workArea.width - toolbarWidth));
    const y = workArea.y + TOOLBAR_TOP_OFFSET;
    win.setBounds({ x, y, width: toolbarWidth, height: TOOLBAR_HEIGHT });
  } catch (err) {
    logger.warn('positionToolbarTopCenter failed — using default bounds', {
      err: String(err),
    });
  }
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

  const initialStatus = {
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

  // Re-snap to top-centre on every show — handles monitor changes
  // between sessions without needing a window reload.
  positionToolbarTopCenter(win);
  if (!win.isVisible()) win.showInactive(); // non-focus-stealing
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
