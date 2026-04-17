import { BrowserWindow } from 'electron';
import path from 'node:path';
import { baseWindowConfig } from './window-config';

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
  if (RENDERER_BASE_URL) {
    // Dev mode — electron-vite serves renderers
    const url = entry === 'main' ? RENDERER_BASE_URL : `${RENDERER_BASE_URL}/src/${entry}/index.html`;
    window.loadURL(url);
  } else {
    // Prod mode — load built HTML from out/renderer/
    const htmlPath =
      entry === 'main'
        ? path.join(__dirname, '../renderer/index.html')
        : path.join(__dirname, `../renderer/src/${entry}/index.html`);
    window.loadFile(htmlPath);
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
