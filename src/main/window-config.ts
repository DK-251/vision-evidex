import { app, type BrowserWindowConstructorOptions } from 'electron';
import path from 'node:path';

/**
 * Shared BrowserWindow security config. Every window in the app — main,
 * toolbar, annotation, region — MUST use this base config. Deviations
 * from these values violate the process-isolation rule (Architectural Rule 1).
 */
export function baseWindowConfig(): BrowserWindowConstructorOptions {
  return {
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, '../preload/preload.js'),
      devTools: !app.isPackaged,
    },
    show: false,
  };
}

/** CSP header applied to every renderer session.
 *  `connect-src 'none'` blocks all external network calls from the renderer. */
export const CSP_HEADER =
  "default-src 'self'; " +
  "script-src 'self'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; " +
  "font-src 'self' data:; " +
  "connect-src 'none'; " +
  "frame-src 'none'; " +
  "object-src 'none'; " +
  "base-uri 'self';";
