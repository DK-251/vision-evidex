import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  SettingsService,
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
} from '../src/main/services/settings.service';

describe('SettingsService', () => {
  let tmpDir: string;
  let settingsPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidex-settings-'));
    settingsPath = path.join(tmpDir, 'settings.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns defaults when file does not exist', () => {
    const svc = new SettingsService(settingsPath);
    expect(svc.loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(svc.isOnboardingComplete()).toBe(false);
  });

  it('writes atomically: no leftover .tmp after save', () => {
    const svc = new SettingsService(settingsPath);
    svc.loadSettings();
    svc.saveSettings({ onboardingComplete: true });

    expect(fs.existsSync(settingsPath)).toBe(true);
    expect(fs.existsSync(`${settingsPath}.tmp`)).toBe(false);

    const persisted = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    expect(persisted).toEqual({
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      onboardingComplete: true,
    });
  });

  it('merges partial updates into existing settings', () => {
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({ schemaVersion: 1, onboardingComplete: true })
    );
    const svc = new SettingsService(settingsPath);
    svc.loadSettings();
    const next = svc.saveSettings({ schemaVersion: 2 });
    expect(next).toEqual({ schemaVersion: 2, onboardingComplete: true });
  });

  it('falls back to defaults when file is corrupted', () => {
    fs.writeFileSync(settingsPath, '{ not valid json');
    const svc = new SettingsService(settingsPath);
    expect(svc.loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults when schema validation fails', () => {
    fs.writeFileSync(settingsPath, JSON.stringify({ onboardingComplete: 'yes' }));
    const svc = new SettingsService(settingsPath);
    expect(svc.loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('rejects saveSettings that would produce an invalid shape', () => {
    const svc = new SettingsService(settingsPath);
    svc.loadSettings();
    expect(() =>
      svc.saveSettings({ onboardingComplete: 'nope' as unknown as boolean })
    ).toThrow();
  });

  it('isOnboardingComplete reflects latest saved value', () => {
    const svc = new SettingsService(settingsPath);
    svc.loadSettings();
    expect(svc.isOnboardingComplete()).toBe(false);
    svc.saveSettings({ onboardingComplete: true });
    expect(svc.isOnboardingComplete()).toBe(true);
  });
});
