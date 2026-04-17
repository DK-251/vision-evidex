/**
 * SettingsService — reads/writes %APPDATA%\VisionEviDex\settings.json.
 *
 * Phase 1 Week 3 implementation. Uses atomic write (.tmp + rename).
 * Strongly-typed settings schema is validated with Zod on load.
 */
export class SettingsService {
  async load(): Promise<void> {
    throw new Error('SettingsService.load — Phase 1 Week 3');
  }

  async save(): Promise<void> {
    throw new Error('SettingsService.save — Phase 1 Week 3');
  }

  get(_key: string): unknown {
    throw new Error('SettingsService.get — Phase 1 Week 3');
  }

  set(_key: string, _value: unknown): void {
    throw new Error('SettingsService.set — Phase 1 Week 3');
  }
}
