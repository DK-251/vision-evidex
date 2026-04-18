import { useEffect, useState } from 'react';
import { useOnboardingStore } from '../stores/onboarding-store';

/**
 * Step 7 — Theme & storage.
 *
 * Theme toggle applies live via `document.documentElement.dataset.theme`
 * so the user sees the change instantly. Storage path uses the native
 * Electron dialog via the `dialog:selectDirectory` IPC channel.
 */

export type ThemeChoice = 'light' | 'dark' | 'system';

interface ThemeStorageData {
  theme?: ThemeChoice;
  storagePath?: string;
}

export function ThemeStorageStep(): JSX.Element {
  const current =
    useOnboardingStore((s) => s.data['themeStorage'] as ThemeStorageData | undefined) ?? {};
  const setStepData = useOnboardingStore((s) => s.setStepData);
  const [pickError, setPickError] = useState<string | null>(null);

  const theme = current.theme ?? 'system';
  const storagePath = current.storagePath ?? '';

  // Apply theme live — persisted at Finish.
  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
  }, [theme]);

  function patch(update: ThemeStorageData): void {
    setStepData('themeStorage', { ...current, ...update });
  }

  async function pickFolder() {
    setPickError(null);
    const result = await window.evidexAPI.dialog.selectDirectory({
      title: 'Default storage folder',
      defaultPath: storagePath || undefined,
    });
    if (!result.ok) {
      setPickError(result.error.message);
      return;
    }
    if (result.data.path) patch({ storagePath: result.data.path });
  }

  return (
    <div className="space-y-4 text-sm">
      <fieldset>
        <legend className="text-text-secondary mb-2">Theme</legend>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <label
              key={t}
              className={`px-3 py-1.5 rounded-md border cursor-pointer capitalize ${
                theme === t ? 'border-accent-primary text-text-primary' : 'border-border-subtle text-text-secondary'
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={t}
                checked={theme === t}
                onChange={() => patch({ theme: t })}
                className="sr-only"
              />
              {t}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <span className="text-text-secondary">Default storage folder</span>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="text"
            value={storagePath}
            readOnly
            placeholder="Pick a folder…"
            className="flex-1 rounded-md border border-border-subtle px-3 py-2 font-mono text-text-primary"
          />
          <button
            type="button"
            onClick={pickFolder}
            className="px-3 py-2 rounded-md border border-border-subtle"
          >
            Browse…
          </button>
        </div>
        {pickError && (
          <p className="mt-1 text-xs text-accent-error" role="alert">
            {pickError}
          </p>
        )}
      </div>
    </div>
  );
}
