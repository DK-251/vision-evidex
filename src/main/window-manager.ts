import { BrowserWindow, nativeTheme } from 'electron';
import path from 'node:path';
import { baseWindowConfig } from './window-config';
import { logger } from './logger';

/**
 * Fluent title-bar-overlay palette. The title bar is rendered by the OS
 * as a 32px strip over our window; we pick its fill + symbol colour to
 * match the current light/dark theme so the caption buttons stay legible.
 */
function titleBarOverlay(theme: 'light' | 'dark'): { color: string; symbolColor: string; height: number } {
  return theme === 'dark'
    ? { color: '#202020', symbolColor: 'rgba(255,255,255,0.8956)', height: 32 }
    : { color: '#F3F3F3', symbolColor: 'rgba(0,0,0,0.8956)', height: 32 };
}

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

export function updateTitleBarForTheme(win: BrowserWindow, theme: 'light' | 'dark'): void {
  try {
    win.setTitleBarOverlay(titleBarOverlay(theme));
  } catch {
    // Overlay is only supported when titleBarStyle === 'hidden'; safe to swallow.
  }
}

let mainWindow: BrowserWindow | undefined;
let toolbarWindow: BrowserWindow | undefined;
let annotationWindow: BrowserWindow | undefined;
let regionWindow: BrowserWindow | undefined;

const RENDERER_BASE_URL = process.env['ELECTRON_RENDERER_URL'];

function loadRendererEntry(window: BrowserWindow, entry: 'main' | 'toolbar' | 'annotation' | 'region'): void {
  // Each entry's HTML lives at `src/<dir>/index.html` where <dir> is the
  // entry name, except `main` which maps to `src/renderer/index.html`.
  // With `renderer.root: '.'` in electron.vite.config.ts, the dev server
  // serves every HTML at its relative path from project root.
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

export function createMainWindow(opts: { initialTheme?: 'light' | 'dark' } = {}): BrowserWindow {
  // Prefer the caller-supplied resolved theme (e.g. from settings.theme) so
  // the boot-time overlay matches what the renderer will paint. Fall back
  // to the OS preference if not provided.
  const initialTheme: 'light' | 'dark' =
    opts.initialTheme ?? (nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  mainWindow = new BrowserWindow({
    ...baseWindowConfig(),
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'Vision-EviDex',
    titleBarStyle: 'hidden',
    titleBarOverlay: titleBarOverlay(initialTheme),
    backgroundColor: '#00000000',
  });

  applyWindowMaterial(mainWindow);

  // Keep the caption button colours legible when the OS theme flips.
  const onNativeThemeUpdate = (): void => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    updateTitleBarForTheme(mainWindow, nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  };
  nativeTheme.on('updated', onNativeThemeUpdate);

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    nativeTheme.off('updated', onNativeThemeUpdate);
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
