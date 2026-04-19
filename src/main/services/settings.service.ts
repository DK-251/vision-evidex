import fs from 'node:fs';
import path from 'node:path';
import { SettingsSchema } from '@shared/schemas';
import type { Settings } from '@shared/types/entities';

/**
 * SettingsService — reads/writes %APPDATA%/VisionEviDex/settings.json.
 *
 * Contract:
 *   - `loadSettings()` returns defaults if the file does not exist or fails
 *     schema validation; never throws into the caller.
 *   - `saveSettings(partial)` merges, validates, and atomically writes:
 *     write to `.tmp` then `fs.rename` to the final path (Architectural
 *     Rule 6). If the rename fails the original file is left intact.
 */

export const SETTINGS_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  onboardingComplete: false,
  // First launch after install defaults to light so the title bar,
  // Mica tint, and content surfaces are coherent before the user has
  // picked a theme in onboarding. They can switch during
  // ThemeStorageStep or later in AppSettings → Appearance.
  theme: 'light',
  defaultStoragePath: '',
  defaultTemplateId: '',
});

export class SettingsService {
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private loaded = false;

  constructor(private readonly filePath: string) {}

  loadSettings(): Settings {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      // Zod's .optional() infers `T | undefined` which is incompatible
      // with bare `T?: U` under exactOptionalPropertyTypes. Cast via
      // `unknown` — Zod has already validated the shape, so this is safe.
      this.settings = SettingsSchema.parse(JSON.parse(raw)) as unknown as Settings;
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
    this.loaded = true;
    return { ...this.settings };
  }

  getSettings(): Settings {
    if (!this.loaded) this.loadSettings();
    return { ...this.settings };
  }

  saveSettings(partial: Partial<Settings>): Settings {
    if (!this.loaded) this.loadSettings();
    const merged: Settings = { ...this.settings, ...partial };
    SettingsSchema.parse(merged);
    this.writeAtomic(merged);
    this.settings = merged;
    return { ...merged };
  }

  isOnboardingComplete(): boolean {
    return this.getSettings().onboardingComplete;
  }

  private writeAtomic(data: Settings): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: 'utf8' });
    fs.renameSync(tmp, this.filePath);
  }
}
