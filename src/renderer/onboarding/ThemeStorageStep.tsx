import { useEffect, useState } from 'react';
import {
  PaintBrushRegular,
  WeatherSunnyRegular,
  WeatherMoonRegular,
  DesktopRegular,
  FolderRegular,
} from '@fluentui/react-icons';
import type { FluentIconsProps } from '@fluentui/react-icons';
import type { ComponentType } from 'react';
import { useOnboardingStore } from '../stores/onboarding-store';
import { StepLayout } from './StepLayout';
import { Button } from '../components/ui';

type FluentIcon = ComponentType<FluentIconsProps>;

export type ThemeChoice = 'light' | 'dark' | 'system';

interface ThemeStorageData {
  theme?: ThemeChoice;
  storagePath?: string;
}

interface ThemeCardDef {
  id: ThemeChoice;
  label: string;
  icon: FluentIcon;
}

const THEME_CARDS: ThemeCardDef[] = [
  { id: 'light',  label: 'Light',  icon: WeatherSunnyRegular },
  { id: 'system', label: 'System', icon: DesktopRegular },
  { id: 'dark',   label: 'Dark',   icon: WeatherMoonRegular },
];

/**
 * Step 8 — Theme & storage. Three theme cards with mini preview swatches
 * that mimic the app shell (title bar + sidebar + content lines) so the
 * user can see the theme differences inline. Storage folder uses the
 * native Electron dialog.
 */
export function ThemeStorageStep(): JSX.Element {
  const current =
    useOnboardingStore((s) => s.data['themeStorage'] as ThemeStorageData | undefined) ?? {};
  const setStepData = useOnboardingStore((s) => s.setStepData);
  const [pickError, setPickError] = useState<string | null>(null);

  const theme = current.theme ?? 'system';
  const storagePath = current.storagePath ?? '';

  // Apply theme live for the preview — ThemeProvider normally owns
  // data-theme but the wizard is the only place we preview an
  // unpersisted choice.
  useEffect(() => {
    if (theme !== 'system') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  function patch(update: ThemeStorageData): void {
    setStepData('themeStorage', { ...current, ...update });
  }

  async function pickFolder(): Promise<void> {
    setPickError(null);
    const result = await window.evidexAPI.dialog.selectDirectory({
      title: 'Default storage folder',
      ...(storagePath ? { defaultPath: storagePath } : {}),
    });
    if (!result.ok) {
      setPickError(result.error.message);
      return;
    }
    if (result.data.path) patch({ storagePath: result.data.path });
  }

  return (
    <StepLayout
      icon={PaintBrushRegular}
      palette="violet"
      title="Theme & storage"
      subtext="Pick the app appearance and where new projects are saved by default."
      maxWidth={640}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', textAlign: 'left' }}>
        <div>
          <div className="field-floating-label">Theme</div>
          <div
            role="radiogroup"
            aria-label="Theme"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 'var(--space-3)',
              marginTop: 'var(--space-2)',
            }}
          >
            {THEME_CARDS.map((c) => {
              const Icon = c.icon;
              const selected = theme === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => patch({ theme: c.id })}
                  data-theme-variant={c.id}
                  className={`theme-card${selected ? ' selected' : ''}`}
                >
                  <div className="theme-card-swatch">
                    <div className="theme-card-swatch-titlebar" />
                    <div className="theme-card-swatch-body">
                      <div className="theme-card-swatch-sidebar" />
                      <div className="theme-card-swatch-content">
                        <div className="theme-card-swatch-line accent" />
                        <div className="theme-card-swatch-line" />
                        <div className="theme-card-swatch-line" />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-1)' }}>
                    <Icon fontSize={16} />
                    <span className="theme-card-label">{c.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="field-floating-label">Default storage folder<span className="req">*</span></div>
          <div className="field-floating">
            <span className="field-icon">
              <FolderRegular fontSize={20} />
            </span>
            <input
              type="text"
              value={storagePath}
              readOnly
              placeholder="Pick a folder…"
              className="mono"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <Button variant="standard" size="compact" onClick={() => void pickFolder()}>
              Browse…
            </Button>
          </div>
          {pickError && (
            <div className="verify-status error" role="alert" style={{ marginTop: 'var(--space-2)' }}>
              <span>{pickError}</span>
            </div>
          )}
        </div>
      </div>
    </StepLayout>
  );
}
