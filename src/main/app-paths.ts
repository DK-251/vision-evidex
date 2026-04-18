import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Resolves the on-disk locations Vision-EviDex writes to at runtime.
 * Everything lives under `%APPDATA%/VisionEviDex` on Windows.
 *
 * Paths are computed lazily because `app.getPath('appData')` is only
 * valid after the app is ready — callers must invoke these inside or
 * after `app.whenReady()`.
 */

const APP_DIR_NAME = 'VisionEviDex';

function appDataRoot(): string {
  return path.join(app.getPath('appData'), APP_DIR_NAME);
}

export function getAppDataRoot(): string {
  const root = appDataRoot();
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export function getSettingsPath(): string {
  return path.join(getAppDataRoot(), 'settings.json');
}

export function getLicencePath(): string {
  return path.join(getAppDataRoot(), 'licence.sig');
}

export function getLogDir(): string {
  const dir = path.join(getAppDataRoot(), 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getLogPath(date = new Date()): string {
  const ymd = date.toISOString().slice(0, 10);
  return path.join(getLogDir(), `app-${ymd}.log`);
}
