import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ShortcutService,
  DEFAULT_HOTKEY_BINDINGS,
  type GlobalShortcutLike,
  type HotkeyBindings,
} from '../src/main/services/shortcut.service';
import { EvidexErrorCode } from '../src/shared/types/ipc';

/**
 * Phase 2 Week 7 / D32. ShortcutService owns the lifecycle of the three
 * session-scoped capture hotkeys. The brief Task 2 contract asserts:
 *
 *   - register-then-unregister clears the bindings + active sessionId
 *   - registering when an accelerator is already taken throws
 *     EvidexError(SHORTCUT_CONFLICT) BEFORE any partial registration
 *   - unregistering when nothing is registered is a silent no-op
 *
 * The service takes an injectable `GlobalShortcutLike` so we never have
 * to `vi.mock` an Electron module — matches the dep-injection pattern
 * already used in `capture-service.spec.ts`.
 */

interface FakeShortcuts extends GlobalShortcutLike {
  registered: Map<string, () => void>;
  forceRegisterFails: Set<string>;
}

function makeFakeShortcuts(initiallyHeld: string[] = []): FakeShortcuts {
  const registered = new Map<string, () => void>();
  const forceRegisterFails = new Set<string>();
  // "Externally held" accelerators are reported as registered without a callback.
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

describe('ShortcutService — session-scoped hotkey lifecycle (Phase 2 Wk7 / D32)', () => {
  let shortcuts: FakeShortcuts;
  let onCapture: ReturnType<typeof vi.fn>;
  let service: ShortcutService;

  beforeEach(() => {
    shortcuts = makeFakeShortcuts();
    onCapture = vi.fn();
    service = new ShortcutService({ onCapture, shortcuts });
  });

  it('register then unregister clears bindings and session', () => {
    service.registerSessionShortcuts('sess_01HX', DEFAULT_HOTKEY_BINDINGS);

    expect(service.getCurrentBindings()).toEqual(DEFAULT_HOTKEY_BINDINGS);
    expect(shortcuts.registered.size).toBe(3);

    service.unregisterSessionShortcuts();

    expect(service.getCurrentBindings()).toBeNull();
    expect(shortcuts.unregisterAll).toHaveBeenCalledTimes(1);
    expect(shortcuts.registered.size).toBe(0);
  });

  it('throws SHORTCUT_CONFLICT when an accelerator is already held — and registers nothing', () => {
    // External app holds Ctrl+Shift+1 before SessionService runs.
    shortcuts = makeFakeShortcuts([DEFAULT_HOTKEY_BINDINGS.captureFullscreen]);
    service = new ShortcutService({ onCapture, shortcuts });

    expect(() =>
      service.registerSessionShortcuts('sess_01HX', DEFAULT_HOTKEY_BINDINGS)
    ).toThrowError(
      expect.objectContaining({
        code: EvidexErrorCode.SHORTCUT_CONFLICT,
        fields: { accelerator: DEFAULT_HOTKEY_BINDINGS.captureFullscreen },
      })
    );

    // Nothing should have been registered through the service.
    expect(shortcuts.registered.size).toBe(0);
    expect(service.getCurrentBindings()).toBeNull();
  });

  it('rolls back partial registration if globalShortcut.register() returns false mid-flight', () => {
    // The first two registrations succeed, the third (region) fails — the
    // service must unregisterAll to avoid leaking the first two hotkeys.
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
    const customBindings: HotkeyBindings = {
      captureFullscreen: 'CmdOrCtrl+Alt+1',
      captureWindow:     'CmdOrCtrl+Alt+2',
      captureRegion:     'CmdOrCtrl+Alt+3',
    };

    service.registerSessionShortcuts('sess_01HX_NEW', customBindings);

    expect(shortcuts.unregisterAll).toHaveBeenCalled();
    expect(service.getCurrentBindings()).toEqual(customBindings);
    expect(shortcuts.registered.size).toBe(3);
    // None of the OLD bindings should still be registered.
    expect(shortcuts.registered.has(DEFAULT_HOTKEY_BINDINGS.captureFullscreen)).toBe(false);
  });

  it('hotkey callback fires onCapture(activeSessionId, mode)', () => {
    service.registerSessionShortcuts('sess_01HX', DEFAULT_HOTKEY_BINDINGS);

    shortcuts.registered.get(DEFAULT_HOTKEY_BINDINGS.captureFullscreen)!();
    shortcuts.registered.get(DEFAULT_HOTKEY_BINDINGS.captureWindow)!();
    shortcuts.registered.get(DEFAULT_HOTKEY_BINDINGS.captureRegion)!();

    expect(onCapture).toHaveBeenNthCalledWith(1, 'sess_01HX', 'fullscreen');
    expect(onCapture).toHaveBeenNthCalledWith(2, 'sess_01HX', 'active-window');
    expect(onCapture).toHaveBeenNthCalledWith(3, 'sess_01HX', 'region');
  });

  it('callback after unregister does not invoke onCapture (sessionId is null)', () => {
    service.registerSessionShortcuts('sess_01HX', DEFAULT_HOTKEY_BINDINGS);
    const fullscreenCb = shortcuts.registered.get(DEFAULT_HOTKEY_BINDINGS.captureFullscreen)!;
    service.unregisterSessionShortcuts();

    // The callback closure may still be reachable in a TOCTOU window. It must
    // bail out cleanly when activeSessionId has been cleared.
    fullscreenCb();
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('isRegistered() reflects external holds even before the service binds anything', () => {
    shortcuts = makeFakeShortcuts(['CmdOrCtrl+Shift+9']);
    service = new ShortcutService({ onCapture, shortcuts });

    expect(service.isRegistered('CmdOrCtrl+Shift+9')).toBe(true);
    expect(service.isRegistered('CmdOrCtrl+Shift+8')).toBe(false);
  });
});
