import { BrowserWindow, nativeTheme, systemPreferences } from 'electron';
import { IPC_EVENTS } from '@shared/ipc-channels';
import { logger } from '../logger';

/**
 * ThemeService — keeps the renderer's design tokens in sync with the
 * Windows system accent colour and the light/dark preference.
 *
 * On Windows the system accent is read via `systemPreferences.getAccentColor()`
 * which returns an eight-character `rrggbbaa` hex. We drop the alpha and
 * broadcast `#rrggbb` to every window on boot and on every `nativeTheme`
 * `updated` event (fires when the user changes Settings → Personalisation
 * → Colours). The renderer's ThemeProvider picks this up and recalculates
 * the derived accent stops via `applyAccentScale()`.
 *
 * On non-Windows platforms `getSystemAccent()` returns the Fluent default
 * Windows Blue so design-system code paths stay identical in dev.
 */

const DEFAULT_ACCENT = '#0078D4';

export function getSystemAccent(): string {
  if (process.platform !== 'win32') return DEFAULT_ACCENT;
  try {
    const hex = systemPreferences.getAccentColor();
    if (!hex || hex.length < 6) return DEFAULT_ACCENT;
    return `#${hex.slice(0, 6).toUpperCase()}`;
  } catch (err) {
    logger.warn('theme.getSystemAccent failed', { err: String(err) });
    return DEFAULT_ACCENT;
  }
}

export function shouldUseDarkColors(): boolean {
  return nativeTheme.shouldUseDarkColors;
}

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    win.webContents.send(channel, payload);
  }
}

export function pushAccentToAllWindows(): void {
  const accent = getSystemAccent();
  broadcast(IPC_EVENTS.THEME_ACCENT_COLOUR_UPDATE, accent);
}

export function pushSystemThemeToAllWindows(): void {
  broadcast(IPC_EVENTS.THEME_SYSTEM_CHANGE, shouldUseDarkColors());
}

/**
 * Install the `nativeTheme.on('updated')` listener. Call once during
 * `app.whenReady()`. Idempotent — calling twice replaces the prior
 * listener rather than double-broadcasting.
 */
let bound = false;
export function bindThemeBroadcasts(): void {
  if (bound) {
    nativeTheme.removeAllListeners('updated');
  }
  nativeTheme.on('updated', () => {
    pushAccentToAllWindows();
    pushSystemThemeToAllWindows();
  });
  bound = true;
  logger.info('theme.broadcasts-bound', {
    accent: getSystemAccent(),
    darkPreferred: shouldUseDarkColors(),
  });
}
