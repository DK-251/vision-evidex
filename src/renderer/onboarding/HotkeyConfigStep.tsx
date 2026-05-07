import { useEffect, useRef } from 'react';
import { KeyboardRegular } from '@fluentui/react-icons';
import { useOnboardingStore } from '../stores/onboarding-store';
import { detectHotkeyConflicts, formatKeyEvent, DEFAULT_HOTKEYS, HOTKEY_ACTIONS } from './hotkey-utils';
import { StepLayout } from './StepLayout';

/**
 * Step 7 — Hotkey configuration. Centred layout; each action renders as
 * a left-labelled row with a Fluent key-chip on the right. Click the
 * chip to remap; conflicts turn the chip red.
 */
export function HotkeyConfigStep(): JSX.Element {
  const hotkeys =
    useOnboardingStore((s) => s.data['hotkeys'] as Record<string, string> | undefined) ??
    { ...DEFAULT_HOTKEYS };
  const setStepData = useOnboardingStore((s) => s.setStepData);
  const conflicts = detectHotkeyConflicts(hotkeys);
  const activeRemapRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  // Clean up any pending remap listener on unmount.
  useEffect(() => {
    return () => {
      if (activeRemapRef.current) {
        window.removeEventListener('keydown', activeRemapRef.current, true);
      }
    };
  }, []);

  function startRemap(actionId: string): void {
    // Cancel any previous pending remap first.
    if (activeRemapRef.current) {
      window.removeEventListener('keydown', activeRemapRef.current, true);
    }
    const handler = (e: KeyboardEvent): void => {
      e.preventDefault();
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      window.removeEventListener('keydown', handler, true);
      activeRemapRef.current = null;
      setStepData('hotkeys', { ...hotkeys, [actionId]: formatKeyEvent(e) });
    };
    activeRemapRef.current = handler;
    window.addEventListener('keydown', handler, true);
  }

  return (
    <StepLayout
      icon={KeyboardRegular}
      palette="cool"
      title="Keyboard shortcuts"
      subtext="Click a binding to remap it. Defaults are shown; each shortcut must be unique."
      maxWidth={560}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', textAlign: 'left' }}>
        {HOTKEY_ACTIONS.map((a) => {
          const binding = hotkeys[a.id] ?? '(unset)';
          const isConflict = conflicts.has(a.id);
          return (
            <div key={a.id} className="setting-row">
              <div className="setting-row-label">
                <div style={{ fontSize: 'var(--type-body-size)', color: 'var(--color-text-primary)' }}>
                  {a.label}
                </div>
                <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {a.description}
                </div>
              </div>
              <div className="setting-row-control" style={{ minWidth: 140 }}>
                <button
                  type="button"
                  onClick={() => startRemap(a.id)}
                  className={`key-chip${isConflict ? ' conflict' : ''}`}
                >
                  {binding}
                </button>
              </div>
            </div>
          );
        })}
        {conflicts.size > 0 && (
          <div className="verify-status error" role="alert" style={{ marginTop: 'var(--space-2)' }}>
            <span>Duplicate binding — each shortcut must be unique.</span>
          </div>
        )}
      </div>
    </StepLayout>
  );
}
