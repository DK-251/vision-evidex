import { globalShortcut } from 'electron';
import type { CaptureMode, StatusTag } from '@shared/types/entities';
import { EvidexError } from '@shared/types/errors';
import { EvidexErrorCode } from '@shared/types/ipc';
import { logger } from '../logger';

/**
 * ShortcutService — Phase 2 Week 7 / D32.
 *
 * HK-01 fix: all action IDs now use `captureActiveWindow` (not `captureWindow`).
 * HK-02 fix: all 6 hotkey actions are registered as global shortcuts.
 * HK-03 fix: DEFAULT_HOTKEY_BINDINGS is the single source of truth — imported by
 *            the renderer's hotkey-utils.ts so no duplicate definitions exist.
 * HK-04 fix: toElectronAccelerator() converts renderer `Ctrl+` → Electron `CmdOrCtrl+`.
 */

export interface HotkeyBindings {
  captureFullscreen:   string;
  captureActiveWindow: string;  // HK-01: was captureWindow, now aligned with renderer
  captureRegion:       string;
  tagPass:             string;  // HK-02: now registered
  tagFail:             string;  // HK-02: now registered
  openToolbar:         string;  // HK-02: now registered
}

/**
 * Single source of truth for default bindings.
 * Renderer hotkey-utils.ts imports this, so no duplicate values.
 * Toolbar hint labels also derive from this.
 */
export const DEFAULT_HOTKEY_BINDINGS: HotkeyBindings = Object.freeze({
  captureFullscreen:   'CmdOrCtrl+Shift+1',
  captureActiveWindow: 'CmdOrCtrl+Shift+2',
  captureRegion:       'CmdOrCtrl+Shift+3',
  tagPass:             'CmdOrCtrl+Shift+P',
  tagFail:             'CmdOrCtrl+Shift+F',
  openToolbar:         'CmdOrCtrl+Shift+T',
});

/**
 * HK-04: Convert a renderer-format key string ("Ctrl+Shift+1") to an
 * Electron accelerator string ("CmdOrCtrl+Shift+1").
 */
export function toElectronAccelerator(key: string): string {
  return key
    .replace(/\bCtrl\b/g, 'CmdOrCtrl')
    .replace(/\bControl\b/g, 'CmdOrCtrl')
    .replace(/\bCommand\b/g, 'CmdOrCtrl');
}

export interface GlobalShortcutLike {
  register(accelerator: string, callback: () => void): boolean;
  unregister(accelerator: string): void;
  unregisterAll(): void;
  isRegistered(accelerator: string): boolean;
}

export interface ShortcutCallbacks {
  /** Fired for fullscreen / active-window / region captures. */
  onCapture: (sessionId: string, mode: CaptureMode) => void | Promise<void>;
  /**
   * HK-02: Tag the most recently-taken capture.
   * The implementation in app.ts resolves the last captureId via SessionService.
   */
  onTagCapture?: (sessionId: string, tag: StatusTag) => void | Promise<void>;
  /** HK-02: Toggle toolbar show/hide. */
  onToggleToolbar?: () => void;
}

export interface ShortcutServiceDeps {
  callbacks: ShortcutCallbacks;
  shortcuts?: GlobalShortcutLike;
}

interface AcceleratorBinding {
  accel: string;
  action: () => void | Promise<void>;
}

export class ShortcutService {
  private activeSessionId: string | null = null;
  private currentBindings: HotkeyBindings | null = null;
  private readonly api: GlobalShortcutLike;

  constructor(private readonly deps: ShortcutServiceDeps) {
    this.api = deps.shortcuts ?? globalShortcut;
  }

  registerSessionShortcuts(sessionId: string, bindings: HotkeyBindings): void {
    if (this.activeSessionId === sessionId && this.currentBindings) return;
    if (this.currentBindings) this.unregisterSessionShortcuts();

    const { callbacks } = this.deps;

    // Convert all bindings to Electron accelerator format (HK-04).
    const accelerators: AcceleratorBinding[] = [
      {
        accel: toElectronAccelerator(bindings.captureFullscreen),
        action: () => void callbacks.onCapture(sessionId, 'fullscreen'),
      },
      {
        accel: toElectronAccelerator(bindings.captureActiveWindow),
        action: () => void callbacks.onCapture(sessionId, 'active-window'),
      },
      {
        accel: toElectronAccelerator(bindings.captureRegion),
        action: () => void callbacks.onCapture(sessionId, 'region'),
      },
      // HK-02: tag shortcuts — only register if callback provided
      ...(callbacks.onTagCapture ? [
        {
          accel: toElectronAccelerator(bindings.tagPass),
          action: () => void callbacks.onTagCapture!(sessionId, 'pass'),
        },
        {
          accel: toElectronAccelerator(bindings.tagFail),
          action: () => void callbacks.onTagCapture!(sessionId, 'fail'),
        },
      ] : []),
      // HK-02: toolbar toggle — only register if callback provided
      ...(callbacks.onToggleToolbar ? [
        {
          accel: toElectronAccelerator(bindings.openToolbar),
          action: () => callbacks.onToggleToolbar!(),
        },
      ] : []),
    ];

    // Pre-check all accelerators for conflicts.
    for (const { accel } of accelerators) {
      if (this.api.isRegistered(accel)) {
        throw new EvidexError(
          EvidexErrorCode.SHORTCUT_CONFLICT,
          `Hotkey ${accel} is already registered`,
          { accelerator: accel }
        );
      }
    }

    for (const { accel, action } of accelerators) {
      const ok = this.api.register(accel, () => {
        if (!this.activeSessionId) return;
        try { void action(); } catch (err) {
          logger.error('shortcut.callback.failed', { accel, err: String(err) });
        }
      });
      if (!ok) {
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
