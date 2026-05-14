import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ShortcutService,
  DEFAULT_HOTKEY_BINDINGS,
  type GlobalShortcutLike,
  type HotkeyBindings,
} from '../src/main/services/shortcut.service';
import { EvidexErrorCode } from '../src/shared/types/ipc';

/**
 * Phase 2 Week 7 / D32 — updated pre-Phase 3 audit pass.
 *
 * Changes from original:
 *   - HotkeyBindings now has 6 fields (was 3). Added tagPass, tagFail, openToolbar.
 *   - captureWindow renamed to captureActiveWindow (HK-01).
 *   - ShortcutService constructor now takes { callbacks: { onCapture, onTagCapture?, onToggleToolbar? } }.
 *   - All 6 accelerators register when callbacks are provided. Tests that count
 *     registered size must reflect the new count (6, not 3).
 *
 * The dep-injection pattern is unchanged; GlobalShortcutLike is still injectable.
 */

interface FakeShortcuts extends GlobalShortcutLike {
  registered: Map<string, () => void>;
  forceRegisterFails: Set<string>;
}

function makeFakeShortcuts(initiallyHeld: string[] = []): FakeShortcuts {
  const registered = new Map<string, () => void>();
  const forceRegisterFails = new Set<string>();
  const externallyHeld = new Set(initiallyHeld);

  return {
    registered,
    forceRegisterFails,
    register: vi.fn((accel: string, cb: () => void): boolean => {
      if (forceRegisterFails.has(accel)) return false;
      if (externallyHeld.has(accel) || registered.has(accel)) return false;
      registered.set(accel, cb);
      return true;
    }),
    unregister: vi.fn((accel: string): void => {
      registered.delete(accel);
    }),
    unregisterAll: vi.fn((): void => {
      registered.clear();
    }),
    isRegistered: vi.fn((accel: string): boolean => {
      return externallyHeld.has(accel) || registered.has(accel);
    }),
  };
}

// How many accelerators should register when all callbacks are provided.
// 3 capture + tagPass + tagFail + openToolbar = 6.
const FULL_BINDING_COUNT = 6;

// How many register when only onCapture is provided (no tag/toolbar callbacks).
const CAPTURE_ONLY_COUNT = 3;

describe('ShortcutService — session-scoped hotkey lifecycle (Phase 2 Wk7 / D32)', () => {
  let shortcuts: FakeShortcuts;
  let onCapture: ReturnType<typeof vi.fn>;
  let onTagCapture: ReturnType<typeof vi.fn>;
  let onToggleToolbar: ReturnType<typeof vi.fn>;
  let service: ShortcutService;

  beforeEach(() => {
    shortcuts = makeFakeShortcuts();
    onCapture = vi.fn();
    onTagCapture = vi.fn();
    onToggleToolbar = vi.fn();
    // Full callbacks — all 6 accelerators register.
    service = new ShortcutService({
      callbacks: { onCapture, onTagCapture, onToggleToolbar },
      shortcuts,
    });
  });

  it('register then unregister clears bindings and session', () => {
    service.registerSessionShortcuts('sess_01HX', DEFAULT_HOTKEY_BINDINGS);

    expect(service.getCurrentBindings()).toEqual(DEFAULT_HOTKEY_BINDINGS);
    expect(shortcuts.registered.size).toBe(FULL_BINDING_COUNT);

    service.unregisterSessionShortcuts();

    expect(service.getCurrentBindings()).toBeNull();
    expect(shortcuts.unregisterAll).toHaveBeenCalledTimes(1);
    expect(shortcuts.registered.size).toBe(0);
  });

  it('only 3 accelerators register when tagCapture/toggleToolbar callbacks are absent', () => {
    const captureOnlyService = new ShortcutService({
      callbacks: { onCapture },
      shortcuts,
    });
    captureOnlyService.registerSessionShortcuts('sess_01HX', DEFAULT_HOTKEY_BINDINGS);
    expect(shortcuts.registered.size).toBe(CAPTURE_ONLY_COUNT);
  });

  it('throws SHORTCUT_CONFLICT when an accelerator is already held — and registers nothing', () => {
    shortcuts = makeFakeShortcuts([DEFAULT_HOTKEY_BINDINGS.captureFullscreen]);
    service = new ShortcutService({
      callbacks: { onCapture, onTagCapture, onToggleToolbar },
      shortcuts,
    });

    expect(() =>
      service.registerSessionShortcuts('sess_01HX', DEFAULT_HOTKEY_BINDINGS)
    ).toThrowError(
      expect.objectContaining({
        code: EvidexErrorCode.SHORTCUT_CONFLICT,
        fields: { accelerator: DEFAULT_HOTKEY_BINDINGS.captureFullscreen },
      })
    );

    expect(shortcuts.registered.size).toBe(0);
    expect(service.getCurrentBindings()).toBeNull();
  });

  it('rolls back partial registration if globalShortcut.register() returns false mid-flight', () => {
    shortcuts.forceRegisterFails.add(DEFAULT_HOTKEY_BINDINGS.captureRegion);

    expect(() =>
      service.registerSessionShortcuts('sess_01HX', DEFAULT_HOTKEY_BINDINGS)
    ).toThrowError(
      expect.objectContaining({ code: EvidexErrorCode.SHORTCUT_CONFLICT })
    );

    expect(shortcuts.unregisterAll).toHaveBeenCalled();
    expect(shortcuts.registered.size).toBe(0);
    expect(service.getCurrentBindings()).toBeNull();
  });

  it('unregister is a silent no-op when nothing is registered', () => {
    expect(() => service.unregisterSessionShortcuts()).not.toThrow();
    expect(shortcuts.unregisterAll).not.toHaveBeenCalled();
  });

  it('idempotent re-register on the same session does not double-register', () => {
    service.registerSessionShortcuts('sess_01HX', DEFAULT_HOTKEY_BINDINGS);
    const sizeAfterFirst = shortcuts.registered.size;
    const registerCalls = (shortcuts.register as ReturnType<typeof vi.fn>).mock.calls.length;

    service.registerSessionShortcuts('sess_01HX', DEFAULT_HOTKEY_BINDINGS);

    expect(shortcuts.registered.size).toBe(sizeAfterFirst);
    expect((shortcuts.register as ReturnType<typeof vi.fn>).mock.calls.length).toBe(registerCalls);
  });

  it('register on a different session clears the previous session before binding the new one', () => {
    service.registerSessionShortcuts('sess_01HX_OLD', DEFAULT_HOTKEY_BINDINGS);
    // Custom bindings — use the new 6-field shape.
    const customBindings: HotkeyBindings = {
      captureFullscreen:   'CmdOrCtrl+Alt+1',
      captureActiveWindow: 'CmdOrCtrl+Alt+2',  // HK-01: was captureWindow
      captureRegion:       'CmdOrCtrl+Alt+3',
      tagPass:             'CmdOrCtrl+Alt+P',
      tagFail:             'CmdOrCtrl+Alt+F',
      openToolbar:         'CmdOrCtrl+Alt+T',
    };

    service.registerSessionShortcuts('sess_01HX_NEW', customBindings);

    expect(shortcuts.unregisterAll).toHaveBeenCalled();
    expect(service.getCurrentBindings()).toEqual(customBindings);
    expect(shortcuts.registered.size).toBe(FULL_BINDING_COUNT);
    expect(shortcuts.registered.has(DEFAULT_HOTKEY_BINDINGS.captureFullscreen)).toBe(false);
  });

  it('hotkey callbacks fire with correct args', () => {
    service.registerSessionShortcuts('sess_01HX', DEFAULT_HOTKEY_BINDINGS);

    // Capture shortcuts → onCapture
    shortcuts.registered.get(DEFAULT_HOTKEY_BINDINGS.captureFullscreen)!();
    shortcuts.registered.get(DEFAULT_HOTKEY_BINDINGS.captureActiveWindow)!();
    shortcuts.registered.get(DEFAULT_HOTKEY_BINDINGS.captureRegion)!();

    expect(onCapture).toHaveBeenNthCalledWith(1, 'sess_01HX', 'fullscreen');
    expect(onCapture).toHaveBeenNthCalledWith(2, 'sess_01HX', 'active-window');
    expect(onCapture).toHaveBeenNthCalledWith(3, 'sess_01HX', 'region');

    // Tag shortcuts → onTagCapture
    shortcuts.registered.get(DEFAULT_HOTKEY_BINDINGS.tagPass)!();
    shortcuts.registered.get(DEFAULT_HOTKEY_BINDINGS.tagFail)!();
    expect(onTagCapture).toHaveBeenNthCalledWith(1, 'sess_01HX', 'pass');
    expect(onTagCapture).toHaveBeenNthCalledWith(2, 'sess_01HX', 'fail');

    // Toolbar toggle → onToggleToolbar
    shortcuts.registered.get(DEFAULT_HOTKEY_BINDINGS.openToolbar)!();
    expect(onToggleToolbar).toHaveBeenCalledTimes(1);
  });

  it('callback after unregister does not invoke onCapture (sessionId is null)', () => {
    service.registerSessionShortcuts('sess_01HX', DEFAULT_HOTKEY_BINDINGS);
    const fullscreenCb = shortcuts.registered.get(DEFAULT_HOTKEY_BINDINGS.captureFullscreen)!;
    service.unregisterSessionShortcuts();

    fullscreenCb();
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('isRegistered() reflects external holds even before the service binds anything', () => {
    shortcuts = makeFakeShortcuts(['CmdOrCtrl+Shift+9']);
    service = new ShortcutService({
      callbacks: { onCapture },
      shortcuts,
    });

    expect(service.isRegistered('CmdOrCtrl+Shift+9')).toBe(true);
    expect(service.isRegistered('CmdOrCtrl+Shift+8')).toBe(false);
  });

  it('DEFAULT_HOTKEY_BINDINGS has all 6 required keys', () => {
    expect(DEFAULT_HOTKEY_BINDINGS).toMatchObject({
      captureFullscreen:   expect.any(String),
      captureActiveWindow: expect.any(String),  // HK-01: was captureWindow
      captureRegion:       expect.any(String),
      tagPass:             expect.any(String),
      tagFail:             expect.any(String),
      openToolbar:         expect.any(String),
    });
    // Ensure the old key name is gone
    expect((DEFAULT_HOTKEY_BINDINGS as Record<string, unknown>)['captureWindow']).toBeUndefined();
  });
});
