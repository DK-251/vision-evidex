/**
 * ShortcutService — registers Electron globalShortcut entries for the
 * active session. CRITICAL: must call `unregisterSessionShortcuts()` on
 * session end AND app quit — otherwise hotkeys linger across sessions.
 *
 * Phase 2 Week 7 implementation.
 */
export class ShortcutService {
  private registered: string[] = [];

  registerSessionShortcuts(_hotkeys: Record<string, string>): void {
    throw new Error('ShortcutService.registerSessionShortcuts — Phase 2 Week 7');
  }

  unregisterSessionShortcuts(): void {
    this.registered = [];
  }

  getRegistered(): string[] {
    return [...this.registered];
  }
}
