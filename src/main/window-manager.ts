import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { baseWindowConfig } from './window-config';
import { logger } from './logger';

/**
 * WindowManager — factory and registry for all BrowserWindows in the app.
 *
 * Phase 0 stub: creates empty windows pointing at the four renderer entry
 * points. Full implementation lands in Phase 1 Week 3 (D12).
 */

let mainWindow: BrowserWindow | undefined;
let toolbarWindow: BrowserWindow | undefined;
let annotationWindow: BrowserWindow | undefined;
let regionWindow: BrowserWindow | undefined;

const RENDERER_BASE_URL = process.env['ELECTRON_RENDERER_URL'];

function loadRendererEntry(window: BrowserWindow, entry: 'main' | 'toolbar' | 'annotation' | 'region'): void {
  // Each entry's HTML lives at `src/<dir>/index.html` where <dir> is the
  // entry name, except `main` which lives at `src/renderer/index.html`.
  // With `renderer.root: '.'` in electron.vite.config.ts the dev server
  // serves every HTML at its relative path from the project root — there
  // is nothing at `/`, so appending the sub-path is required for the
  // main window too (otherwise we get a blank page from vite's 404).
  const dir = entry === 'main' ? 'renderer' : entry;
  const url = RENDERER_BASE_URL
    ? `${RENDERER_BASE_URL}/src/${dir}/index.html`
    : undefined;
  const file = RENDERER_BASE_URL
    ? undefined
    : path.join(__dirname, `../renderer/src/${dir}/index.html`);
  logger.info('window.load', { entry, url: url ?? file });

  const wc = window.webContents;
  wc.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    logger.error('window.did-fail-load', { entry, errorCode, errorDescription, validatedURL });
  });
  wc.on('render-process-gone', (_e, details) => {
    logger.error('window.render-process-gone', { entry, reason: details.reason, exitCode: details.exitCode });
  });
  wc.on('preload-error', (_e, preloadPath, error) => {
    logger.error('window.preload-error', { entry, preloadPath, message: error.message, stack: error.stack });
  });
  wc.on('console-message', (_e, level, message, line, sourceId) => {
    const levels = ['verbose', 'info', 'warning', 'error'] as const;
    logger.info('renderer.console', {
      entry,
      level: levels[level] ?? String(level),
      message,
      line,
      sourceId,
    });
  });

  if (!app.isPackaged) {
    wc.once('dom-ready', () => wc.openDevTools({ mode: 'right' }));
  }

  if (url) {
    window.loadURL(url);
  } else {
    window.loadFile(file!);
  }
}

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    ...baseWindowConfig(),
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'Vision-EviDex',
  });

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
  toolbarWindow.setContentProtection(true); // prevents toolbar from appearing in its own screenshots
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
  // Crosshair cursor is applied via CSS on <body> in src/region/App.tsx (Phase 2 Wk7 D34).
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

export function getAnnotationWindow(): BrowserWindow | undefined {
  return annotationWindow;
}

export function getRegionWindow(): BrowserWindow | undefined {
  return regionWindow;
}

/**
 * Tear-down hook called from `app.on('will-quit')`. Safe to call multiple
 * times — each window's `closed` handler clears its module-level ref.
 */
export function destroyAllWindows(): void {
  for (const win of [mainWindow, toolbarWindow, annotationWindow, regionWindow]) {
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
  }
}
