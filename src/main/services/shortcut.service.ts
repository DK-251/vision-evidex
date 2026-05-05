import { globalShortcut } from 'electron';
import type { CaptureMode } from '@shared/types/entities';
import { EvidexError } from '@shared/types/errors';
import { EvidexErrorCode } from '@shared/types/ipc';
import { logger } from '../logger';

/**
 * ShortcutService — Phase 2 Week 7 / D32.
 *
 * Owns the lifecycle of the three session-scoped capture hotkeys
 * (fullscreen / active-window / region). Hotkeys exist only while a
 * session is active. `SessionService.create()` calls
 * `registerSessionShortcuts`; `SessionService.end()` (and the
 * `app.will-quit` backstop) call `unregisterSessionShortcuts`.
 *
 * The service stays decoupled from `CaptureService` — the owner injects
 * an `onCapture(sessionId, mode)` callback at construction time. That
 * keeps the service testable without an Electron runtime and matches
 * the "no service calls another service directly" rule (CLAUDE.md §3).
 */

export interface HotkeyBindings {
  captureFullscreen: string;
  captureWindow:     string;
  captureRegion:     string;
}

export const DEFAULT_HOTKEY_BINDINGS: HotkeyBindings = Object.freeze({
  captureFullscreen: 'CmdOrCtrl+Shift+1',
  captureWindow:     'CmdOrCtrl+Shift+2',
  captureRegion:     'CmdOrCtrl+Shift+3',
});

/**
 * Subset of Electron's `globalShortcut` we depend on. Lets tests pass a
 * fake object without `vi.mock`-ing an Electron module.
 */
export interface GlobalShortcutLike {
  register(accelerator: string, callback: () => void): boolean;
  unregister(accelerator: string): void;
  unregisterAll(): void;
  isRegistered(accelerator: string): boolean;
}

export interface ShortcutServiceDeps {
  /** Owner wires this to `CaptureService.screenshot({ sessionId, mode })`. */
  onCapture: (sessionId: string, mode: CaptureMode) => void | Promise<void>;
  /** Override for tests. Defaults to Electron's `globalShortcut`. */
  shortcuts?: GlobalShortcutLike;
}

interface AcceleratorBinding {
  accel: string;
  mode:  CaptureMode;
}

export class ShortcutService {
  private activeSessionId: string | null = null;
  private currentBindings: HotkeyBindings | null = null;
  private readonly api: GlobalShortcutLike;

  constructor(private readonly deps: ShortcutServiceDeps) {
    this.api = deps.shortcuts ?? globalShortcut;
  }

  registerSessionShortcuts(sessionId: string, bindings: HotkeyBindings): void {
    // Idempotent re-register on the same session: no-op so that retrying a
    // session creation from the renderer cannot leak handlers.
    if (this.activeSessionId === sessionId && this.currentBindings) return;

    // Different session already holds the hotkeys — clear before re-registering.
    if (this.currentBindings) this.unregisterSessionShortcuts();

    const accelerators: AcceleratorBinding[] = [
      { accel: bindings.captureFullscreen, mode: 'fullscreen' },
      { accel: bindings.captureWindow,     mode: 'active-window' },
      { accel: bindings.captureRegion,     mode: 'region' },
    ];

    // Conflict pre-check — globalShortcut.register() returns false silently
    // if another process owns the accelerator; surface that as an EvidexError
    // so the IPC layer can show a toast to the user.
    for (const { accel } of accelerators) {
      if (this.api.isRegistered(accel)) {
        throw new EvidexError(
          EvidexErrorCode.SHORTCUT_CONFLICT,
          `Hotkey ${accel} is already registered`,
          { accelerator: accel }
        );
      }
    }

    for (const { accel, mode } of accelerators) {
      const ok = this.api.register(accel, () => {
        if (!this.activeSessionId) return;
        try {
          void this.deps.onCapture(this.activeSessionId, mode);
        } catch (err) {
          logger.error('shortcut.callback.failed', { mode, err: String(err) });
        }
      });
      if (!ok) {
        // Roll back partial registration so we never leak hotkeys.
        this.api.unregisterAll();
        throw new EvidexError(
          EvidexErrorCode.SHORTCUT_CONFLICT,
          `Failed to register hotkey ${accel}`,
          { accelerator: accel }
        );
      }
    }

    this.activeSessionId = sessionId;
    this.currentBindings = { ...bindings };
    logger.info('shortcut.registered', { sessionId, bindings });
  }

  unregisterSessionShortcuts(): void {
    if (this.activeSessionId === null && this.currentBindings === null) return;
    this.api.unregisterAll();
    this.activeSessionId = null;
    this.currentBindings = null;
    logger.info('shortcut.unregistered');
  }

  isRegistered(accelerator: string): boolean {
    return this.api.isRegistered(accelerator);
  }

  getCurrentBindings(): HotkeyBindings | null {
    return this.currentBindings ? { ...this.currentBindings } : null;
  }
}
