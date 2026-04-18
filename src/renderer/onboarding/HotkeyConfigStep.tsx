import { useOnboardingStore } from '../stores/onboarding-store';
import { detectHotkeyConflicts, formatKeyEvent, DEFAULT_HOTKEYS, HOTKEY_ACTIONS } from './hotkey-utils';

/**
 * Step 6 — Hotkey configuration.
 *
 * Six configurable actions; click-to-remap captures the next key-down.
 * Conflict detection highlights any action whose binding is duplicated
 * in another row. The onboarding store holds `hotkeys: Record<id, combo>`.
 */

export function HotkeyConfigStep(): JSX.Element {
  const hotkeys =
    useOnboardingStore((s) => s.data['hotkeys'] as Record<string, string> | undefined) ??
    { ...DEFAULT_HOTKEYS };
  const setStepData = useOnboardingStore((s) => s.setStepData);
  const conflicts = detectHotkeyConflicts(hotkeys);

  function startRemap(actionId: string): void {
    const handler = (e: KeyboardEvent): void => {
      e.preventDefault();
      // Ignore pure modifier presses — wait for a real non-modifier key.
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      window.removeEventListener('keydown', handler, true);
      const combo = formatKeyEvent(e);
      setStepData('hotkeys', { ...hotkeys, [actionId]: combo });
    };
    window.addEventListener('keydown', handler, true);
  }

  return (
    <div className="space-y-2 text-sm">
      {HOTKEY_ACTIONS.map((a) => {
        const binding = hotkeys[a.id] ?? '(unset)';
        const isConflict = conflicts.has(a.id);
        return (
          <div
            key={a.id}
            className={`flex items-center justify-between p-2 rounded-md border ${
              isConflict ? 'border-accent-error' : 'border-border-subtle'
            }`}
          >
            <div>
              <div className="text-text-primary">{a.label}</div>
              <div className="text-xs text-text-secondary">{a.description}</div>
            </div>
            <button
              type="button"
              onClick={() => startRemap(a.id)}
              className="font-mono text-text-primary px-3 py-1 rounded-md border border-border-subtle"
            >
              {binding}
            </button>
          </div>
        );
      })}
      {conflicts.size > 0 && (
        <p className="text-xs text-accent-error" role="alert">
          Duplicate binding — each shortcut must be unique.
        </p>
      )}
    </div>
  );
}
