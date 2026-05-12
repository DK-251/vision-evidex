import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ThemePreference } from '@shared/types/entities';
import { applyAccentScale } from '../lib/accent-scale';

/**
 * ThemeProvider — installs the `data-theme`, `data-density`, and
 * `data-font-size` attributes on the document root and subscribes to
 * the main-process `theme:accentColourUpdate` / `theme:systemThemeChange`
 * broadcasts so the renderer's Fluent tokens stay in sync with Windows.
 *
 * Theme preference is loaded on every mount from `settings.json` via
 * `window.evidexAPI.settings.get()`. This covers both app boot and the
 * onboarding → shell transition where ThemeProvider re-mounts after
 * `complete()` is called.
 *
 * Live theme changes from AppSettingsPage are applied immediately via
 * the `setPreference` function exposed on ThemeContext — no restart needed.
 *
 * This provider does not own settings — it only reflects them into the DOM.
 */

type Density = 'normal' | 'compact';
type FontSize = 'normal' | 'large';

interface ThemeContextValue {
  theme: 'light' | 'dark';   // resolved — never 'system'
  accent: string;
  density: Density;
  fontSize: FontSize;
  /** Update the preference live — used by AppSettingsPage to apply instantly. */
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(pref: ThemePreference, systemDark: boolean): 'light' | 'dark' {
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return systemDark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  // Provisional initial value — Chromium's `matchMedia` is a best-effort
  // guess that can disagree with `nativeTheme.shouldUseDarkColors` on
  // Windows (registry edge cases). The main process broadcasts the
  // authoritative value through `theme:systemThemeChange` once the
  // renderer finishes loading; until then we gate data-theme application
  // entirely to avoid a flash-of-wrong-theme.
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [accent, setAccent]         = useState<string>('#0078D4');
  const [settingsLoaded, setSettingsLoaded]             = useState(false);
  const [systemThemeReceived, setSystemThemeReceived]   = useState(false);

  // Load persisted theme preference. Re-run whenever the component
  // mounts — this covers both app boot and the onboarding → shell
  // transition where ThemeProvider re-mounts after completion.
  useEffect(() => {
    let cancelled = false;
    void (async (): Promise<void> => {
      try {
        const result = await window.evidexAPI.settings.get();
        if (cancelled) return;
        if (result.ok) setPreference(result.data.theme ?? 'system');
      } catch {
        // Fail soft — keep 'system' default.
      } finally {
        if (!cancelled) setSettingsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to main-process broadcasts. Mark `systemThemeReceived`
  // the first time we hear from the main process so the theme-apply
  // effect (below) knows the authoritative value has arrived.
  useEffect(() => {
    if (!window.evidexAPI?.events?.onAccentColourUpdate) {
      // Sub-window without preload — fall back to matchMedia immediately
      // so we don't deadlock the theme-apply gate.
      setSystemThemeReceived(true);
      return;
    }
    const offAccent = window.evidexAPI.events.onAccentColourUpdate((next) => {
      setAccent(next);
      applyAccentScale(next);
    });
    const offSystem = window.evidexAPI.events.onSystemThemeChange((dark) => {
      setSystemDark(dark);
      setSystemThemeReceived(true);
    });
    // Safety net: if the broadcast never arrives within 1s (sub-windows,
    // dev hot-reload), unblock the gate so the UI doesn't stay frozen.
    const fallback = window.setTimeout(() => setSystemThemeReceived(true), 1000);
    return () => {
      offAccent?.();
      offSystem?.();
      window.clearTimeout(fallback);
    };
  }, []);

  // Reflect resolved theme on the document root. Wait for BOTH
  // settings load and the system-theme broadcast so the very first
  // paint uses the right value — fixes Asus issues #1/#3.
  const resolved = resolveTheme(preference, systemDark);
  useEffect(() => {
    if (!settingsLoaded || !systemThemeReceived) return;
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    if (!root.hasAttribute('data-density')) root.setAttribute('data-density', 'normal');
    if (!root.hasAttribute('data-font-size')) root.setAttribute('data-font-size', 'normal');
  }, [resolved, settingsLoaded, systemThemeReceived]);

  return (
    <ThemeContext.Provider
      value={{ theme: resolved, accent, density: 'normal', fontSize: 'normal', setPreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within <ThemeProvider>');
  return ctx;
}
