// @vitest-environment node
/**
 * New tests targeting gaps identified in the final pre-W9 analysis.
 * Covers: nav-store param clearing, session.store lifecycle,
 * project.store edge cases, database-service boundaries,
 * capture-service edge cases, naming-service boundaries,
 * settings-service edge cases, ipc-schemas edge cases,
 * container-crypto boundaries, and hotkey-utils.
 *
 * Target: push suite from 347 to ~415 tests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — nav-store: param clearing on navigation (PRE-W9 fix verification)
// ─────────────────────────────────────────────────────────────────────────────

import { useNavStore } from '../src/renderer/stores/nav-store';

describe('useNavStore — param clearing on navigate (PRE-W9 fix)', () => {
  beforeEach(() => {
    useNavStore.setState({
      page: 'project-list',
      currentProjectId: null,
      currentSessionId: null,
      history: [],
      sidebarCollapsed: false,
    });
  });

  it('clears currentSessionId when navigating to a non-session page', () => {
    useNavStore.getState().navigate('session-gallery', { projectId: 'p1', sessionId: 's1' });
    expect(useNavStore.getState().currentSessionId).toBe('s1');
    useNavStore.getState().navigate('settings');
    expect(useNavStore.getState().currentSessionId).toBeNull();
  });

  it('clears currentProjectId when navigating to a top-level page (dashboard)', () => {
    useNavStore.getState().navigate('session-intake', { projectId: 'p1' });
    expect(useNavStore.getState().currentProjectId).toBe('p1');
    useNavStore.getState().navigate('dashboard');
    expect(useNavStore.getState().currentProjectId).toBeNull();
  });

  it('clears currentProjectId when navigating to settings', () => {
    useNavStore.getState().navigate('create-project', { projectId: 'p1' });
    useNavStore.getState().navigate('settings');
    expect(useNavStore.getState().currentProjectId).toBeNull();
  });

  it('preserves currentProjectId when navigating between project-scoped pages', () => {
    useNavStore.getState().navigate('session-intake', { projectId: 'p1' });
    useNavStore.getState().navigate('session-gallery', { projectId: 'p1', sessionId: 's1' });
    expect(useNavStore.getState().currentProjectId).toBe('p1');
  });

  it('preserves currentSessionId when navigating between session pages', () => {
    useNavStore.getState().navigate('session-intake', { projectId: 'p1', sessionId: 's1' });
    useNavStore.getState().navigate('session-gallery', { projectId: 'p1', sessionId: 's1' });
    expect(useNavStore.getState().currentSessionId).toBe('s1');
  });

  it('navigating to create-project preserves currentProjectId', () => {
    useNavStore.getState().navigate('session-intake', { projectId: 'p1' });
    useNavStore.getState().navigate('create-project');
    expect(useNavStore.getState().currentProjectId).toBe('p1');
  });

  it('navigating to project-list clears currentSessionId', () => {
    useNavStore.getState().navigate('session-gallery', { projectId: 'p1', sessionId: 's1' });
    useNavStore.getState().navigate('project-list');
    expect(useNavStore.getState().currentSessionId).toBeNull();
  });

  it('setSidebarCollapsed sets collapsed to the exact value', () => {
    useNavStore.getState().setSidebarCollapsed(true);
    expect(useNavStore.getState().sidebarCollapsed).toBe(true);
    useNavStore.getState().setSidebarCollapsed(false);
    expect(useNavStore.getState().sidebarCollapsed).toBe(false);
  });

  it('navigate with no params sticky — existing projectId preserved on session pages', () => {
    useNavStore.getState().navigate('session-intake', { projectId: 'p99' });
    // Navigate to session-gallery without re-specifying projectId
    useNavStore.getState().navigate('session-gallery', { sessionId: 's99' });
    // projectId should be sticky from session-intake
    expect(useNavStore.getState().currentProjectId).toBe('p99');
    expect(useNavStore.getState().currentSessionId).toBe('s99');
  });

  it('history is empty after goBack drains all entries, page stays project-list', () => {
    useNavStore.getState().navigate('settings');
    useNavStore.getState().navigate('dashboard');
    useNavStore.getState().goBack();
    useNavStore.getState().goBack();
    useNavStore.getState().goBack(); // extra call — empty history
    expect(useNavStore.getState().page).toBe('project-list');
    expect(useNavStore.getState().history).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — database-service: clientName, recentProject, edge cases
// ─────────────────────────────────────────────────────────────────────────────

import { DatabaseService } from '../src/main/services/database.service';

describe('DatabaseService — RecentProject clientName (GAP-T2)', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initAppSchema();
  });

  afterEach(() => db.close());

  it('upsertRecentProject stores and returns clientName', () => {
    db.upsertRecentProject({
      projectId: 'p1',
      name: 'Alpha',
      clientName: 'ACME Corp',
      filePath: '/alpha.evidex',
      lastOpenedAt: '2026-05-08T10:00:00Z',
    });
    const rows = db.getRecentProjects();
    expect(rows[0]?.clientName).toBe('ACME Corp');
  });

  it('upsertRecentProject updates clientName on conflict', () => {
    db.upsertRecentProject({
      projectId: 'p1', name: 'A', clientName: 'Old Client',
      filePath: '/a.evidex', lastOpenedAt: '2026-05-08T10:00:00Z',
    });
    db.upsertRecentProject({
      projectId: 'p1', name: 'A', clientName: 'New Client',
      filePath: '/a.evidex', lastOpenedAt: '2026-05-08T11:00:00Z',
    });
    expect(db.getRecentProjects()[0]?.clientName).toBe('New Client');
  });

  it('getRecentProjects returns clientName as empty string when not set (default)', () => {
    // Test the ALTER TABLE migration path — simulate an old row with no clientName
    // by directly inserting via the raw SQL (the column has DEFAULT '')
    db.upsertRecentProject({
      projectId: 'p2', name: 'B', clientName: '',
      filePath: '/b.evidex', lastOpenedAt: '2026-05-08T09:00:00Z',
    });
    const row = db.getRecentProjects().find((r) => r.projectId === 'p2');
    expect(row?.clientName).toBe('');
  });

  it('upsertRecentProject inserts multiple clients in separate rows', () => {
    db.upsertRecentProject({ projectId: 'p1', name: 'A', clientName: 'Client A', filePath: '/a.evidex', lastOpenedAt: '2026-05-08T10:00:00Z' });
    db.upsertRecentProject({ projectId: 'p2', name: 'B', clientName: 'Client B', filePath: '/b.evidex', lastOpenedAt: '2026-05-08T09:00:00Z' });
    const rows = db.getRecentProjects();
    expect(rows).toHaveLength(2);
    // DESC order: A (10:00) first, B (09:00) second
    expect(rows[0]?.clientName).toBe('Client A');
    expect(rows[1]?.clientName).toBe('Client B');
  });
});

describe('DatabaseService — captures boundary cases', () => {
  let db: DatabaseService;

  function seedAll(d: DatabaseService): void {
    d.insertProject({
      id: 'proj_1', name: 'P', clientName: 'C', startDate: '2026-05-08',
      templateId: 'tpl', brandingProfileId: '', storagePath: '', namingPattern: '',
      status: 'active', createdAt: '2026-05-08T00:00:00Z', appVersion: '1.0',
    });
    d.insertSession({
      id: 'sess_1', projectId: 'proj_1', testId: 'T1', testName: 'Test',
      scenario: 'S', environment: 'QA', applicationUnderTest: 'App',
      testerName: 'Deepak', startedAt: '2026-05-08T10:00:00Z',
    });
  }

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initProjectSchema();
    seedAll(db);
  });

  afterEach(() => db.close());

  it('getCapturesForProject returns all captures across sessions', () => {
    for (let i = 1; i <= 3; i++) {
      db.insertCapture({
        id: `cap_${i}`, sessionId: 'sess_1', projectId: 'proj_1',
        sequenceNum: i, originalFilename: `cap_${i}.jpg`,
        sha256Hash: 'a'.repeat(64), fileSizeBytes: 1024,
        captureMode: 'fullscreen', statusTag: 'untagged',
        capturedAt: '2026-05-08T10:0' + i + ':00Z',
        machineName: 'pc', osVersion: 'Win11', appVersion: '1.0', testerName: 'D',
      });
    }
    expect(db.getCapturesForProject('proj_1')).toHaveLength(3);
  });

  it('getCapture returns null for unknown captureId', () => {
    expect(db.getCapture('cap_ghost')).toBeNull();
  });

  it('updateCaptureTag changes only the status_tag field', () => {
    db.insertCapture({
      id: 'cap_tag', sessionId: 'sess_1', projectId: 'proj_1',
      sequenceNum: 1, originalFilename: 'cap_tag.jpg',
      sha256Hash: 'b'.repeat(64), fileSizeBytes: 512,
      captureMode: 'active-window', statusTag: 'untagged',
      capturedAt: '2026-05-08T10:05:00Z',
      machineName: 'pc', osVersion: 'Win11', appVersion: '1.0', testerName: 'D',
    });
    const allTags = ['pass', 'fail', 'blocked', 'skip', 'untagged'] as const;
    for (const tag of allTags) {
      db.updateCaptureTag('cap_tag', tag);
      expect(db.getCapture('cap_tag')?.statusTag).toBe(tag);
    }
  });

  it('getCapturesForSession returns empty array for session with no captures', () => {
    expect(db.getCapturesForSession('sess_empty')).toEqual([]);
  });

  it('getNextSequenceNum returns 1 for a fresh project', () => {
    expect(db.getNextSequenceNum('proj_1')).toBe(1);
  });

  it('getNextSequenceNum returns max+1 after multiple inserts', () => {
    for (let seq = 1; seq <= 5; seq++) {
      db.insertCapture({
        id: `cap_s${seq}`, sessionId: 'sess_1', projectId: 'proj_1',
        sequenceNum: seq, originalFilename: `s${seq}.jpg`,
        sha256Hash: 'c'.repeat(64), fileSizeBytes: 100,
        captureMode: 'fullscreen', statusTag: 'untagged',
        capturedAt: '2026-05-08T10:10:00Z',
        machineName: 'pc', osVersion: 'Win11', appVersion: '1.0', testerName: 'D',
      });
    }
    expect(db.getNextSequenceNum('proj_1')).toBe(6);
  });

  it('updateCaptureNotes stores multi-line notes', () => {
    db.insertCapture({
      id: 'cap_note', sessionId: 'sess_1', projectId: 'proj_1',
      sequenceNum: 1, originalFilename: 'cap_note.jpg',
      sha256Hash: 'd'.repeat(64), fileSizeBytes: 200,
      captureMode: 'region', statusTag: 'fail',
      capturedAt: '2026-05-08T10:15:00Z',
      machineName: 'pc', osVersion: 'Win11', appVersion: '1.0', testerName: 'D',
    });
    const notes = 'Line 1\nLine 2\nLine 3';
    db.updateCaptureNotes('cap_note', notes);
    expect(db.getCapture('cap_note')?.notes).toBe(notes);
  });

  it('walCheckpoint is callable on initProjectSchema DB without error', () => {
    expect(() => db.walCheckpoint()).not.toThrow();
  });
});

describe('DatabaseService — templates', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initAppSchema();
  });

  afterEach(() => db.close());

  it('getTemplates returns empty when nothing inserted', () => {
    expect(db.getTemplates()).toEqual([]);
  });

  it('insertTemplate + getTemplate roundtrip', () => {
    db.insertTemplate({
      id: 'tpl_001',
      name: 'TSR Standard',
      description: 'Test Summary Report',
      schema: { reportType: 'TSR', sections: [] },
      isBuiltin: true,
    });
    const t = db.getTemplate('tpl_001');
    expect(t?.name).toBe('TSR Standard');
    expect(t?.isBuiltin).toBe(true);
    expect(t?.schema.reportType).toBe('TSR');
  });

  it('insertTemplate is INSERT OR IGNORE — duplicate id does not throw', () => {
    db.insertTemplate({ id: 'tpl_dup', name: 'A', schema: { reportType: 'TSR', sections: [] }, isBuiltin: false });
    expect(() =>
      db.insertTemplate({ id: 'tpl_dup', name: 'B', schema: { reportType: 'TSR', sections: [] }, isBuiltin: false })
    ).not.toThrow();
    // First insert wins
    expect(db.getTemplate('tpl_dup')?.name).toBe('A');
  });

  it('getTemplate returns null for unknown id', () => {
    expect(db.getTemplate('missing_tpl')).toBeNull();
  });

  it('getTemplates returns all templates sorted by name', () => {
    db.insertTemplate({ id: 't3', name: 'Zebra', schema: { reportType: 'TSR', sections: [] }, isBuiltin: false });
    db.insertTemplate({ id: 't1', name: 'Alpha', schema: { reportType: 'TSR', sections: [] }, isBuiltin: true });
    db.insertTemplate({ id: 't2', name: 'Mango', schema: { reportType: 'TSR', sections: [] }, isBuiltin: false });
    const names = db.getTemplates().map((t) => t.name);
    expect(names).toEqual(['Alpha', 'Mango', 'Zebra']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — naming-service: additional boundary cases
// ─────────────────────────────────────────────────────────────────────────────

import { NamingService, type NamingContext } from '../src/main/services/naming.service';

const FIXED = new Date('2026-05-08T14:30:45Z');
const naming = () => new NamingService({ now: () => FIXED });

const baseCtx = (o: Partial<NamingContext> = {}): NamingContext => ({
  projectName: 'Test Project', clientName: 'Client Co',
  testId: 'T-001', testerName: 'Alice Bob',
  environment: 'UAT', sequenceNum: 1, ...o,
});

describe('NamingService — additional boundary cases', () => {

  it('single-word tester name produces one initial', () => {
    const out = naming().generate(baseCtx({ pattern: '{TesterInitials}', testerName: 'Alice' }));
    expect(out).toBe('A.jpg');
  });

  it('project name with all special chars produces underscores only', () => {
    const out = naming().generate(baseCtx({ pattern: '{ProjectCode}', projectName: 'A<B>C:D' }));
    // After replace Windows-illegal chars → underscore, truncate to 8
    expect(out).toBe('A_B_C_D.jpg');
  });

  it('sequence number 9999 is still 4 digits', () => {
    expect(naming().generate(baseCtx({ pattern: '{Seq}', sequenceNum: 9999 }))).toBe('9999.jpg');
  });

  it('sequence number 10000 is 5 digits (no truncation)', () => {
    expect(naming().generate(baseCtx({ pattern: '{Seq}', sequenceNum: 10000 }))).toBe('10000.jpg');
  });

  it('status tag defaults to UNTAGGED in preview', () => {
    const out = naming().preview('{Status}', {});
    expect(out).toBe('UNTAGGED.jpg');
  });

  it('all status tags render uppercased', () => {
    const tags = ['pass', 'fail', 'blocked', 'skip', 'untagged'] as const;
    for (const tag of tags) {
      const out = naming().generate(baseCtx({ pattern: '{Status}', statusTag: tag }));
      expect(out).toBe(`${tag.toUpperCase()}.jpg`);
    }
  });

  it('multi-token pattern with all tokens resolves correctly', () => {
    const out = naming().generate(baseCtx({
      pattern: '{ProjectCode}_{ClientCode}_{TestID}_{TesterInitials}_{Date}_{Time}_{Seq}_{Status}_{Env}',
      statusTag: 'pass',
      sequenceNum: 7,
    }));
    expect(out).toMatch(/^TEST-PRO_CLIENT-C_T-001_AB_2026-05-08_14-30-45_0007_PASS_UAT\.jpg$/);
  });

  it('validate reports multiple distinct unknown tokens only once each', () => {
    const r = naming().validate('{Foo}_{Foo}_{Bar}_{ProjectCode}');
    expect(r.valid).toBe(false);
    expect(r.unknownTokens.sort()).toEqual(['{Bar}', '{Foo}']);
  });

  it('preview with projectName override uses provided value', () => {
    const out = naming().preview('{ProjectCode}', { projectName: 'Custom Name' });
    expect(out).toBe('CUSTOM-N.jpg');
  });

  it('capturedAt overrides clock for Date + Time tokens', () => {
    const out = naming().generate(baseCtx({
      pattern: '{Date}_{Time}',
      capturedAt: '2025-01-01T00:00:00.000Z',
    }));
    expect(out).toBe('2025-01-01_00-00-00.jpg');
  });

  it('Env with exactly 6 chars renders without truncation', () => {
    const out = naming().generate(baseCtx({ pattern: '{Env}', environment: 'STAGNG' }));
    expect(out).toBe('STAGNG.jpg');
  });

  it('Env with more than 6 chars is truncated', () => {
    const out = naming().generate(baseCtx({ pattern: '{Env}', environment: 'Production' }));
    expect(out).toBe('PRODUC.jpg');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — settings-service: hotkeys and profile fields
// ─────────────────────────────────────────────────────────────────────────────

import { SettingsService } from '../src/main/services/settings.service';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('SettingsService — hotkeys and profile', () => {
  let tmpDir: string;
  let settingsPath: string;
  let svc: SettingsService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidex-settings2-'));
    settingsPath = path.join(tmpDir, 'settings.json');
    svc = new SettingsService(settingsPath);
    svc.loadSettings();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves and retrieves hotkeys object', () => {
    const hotkeys = { captureFullscreen: 'CmdOrCtrl+Alt+F', captureWindow: 'CmdOrCtrl+Alt+W', captureRegion: 'CmdOrCtrl+Alt+R' };
    const result = svc.saveSettings({ hotkeys });
    expect(result.hotkeys).toEqual(hotkeys);
    // Reload from disk
    const svc2 = new SettingsService(settingsPath);
    expect(svc2.loadSettings().hotkeys).toEqual(hotkeys);
  });

  it('saves and retrieves profile with optional fields', () => {
    svc.saveSettings({ profile: { name: 'Deepak', role: 'QA', team: 'Release', email: 'd@test.com' } });
    const s = svc.getSettings();
    expect(s.profile?.name).toBe('Deepak');
    expect(s.profile?.team).toBe('Release');
    expect(s.profile?.email).toBe('d@test.com');
  });

  it('saves profile without optional team/email', () => {
    svc.saveSettings({ profile: { name: 'Alice', role: 'Lead' } });
    const s = svc.getSettings();
    expect(s.profile?.team).toBeUndefined();
    expect(s.profile?.email).toBeUndefined();
  });

  it('saves all three theme values correctly', () => {
    for (const theme of ['light', 'dark', 'system'] as const) {
      svc.saveSettings({ theme });
      expect(svc.getSettings().theme).toBe(theme);
    }
  });

  it('saveSettings without loading first still works (lazy load)', () => {
    const svc2 = new SettingsService(settingsPath);
    expect(() => svc2.saveSettings({ onboardingComplete: true })).not.toThrow();
    expect(svc2.isOnboardingComplete()).toBe(true);
  });

  it('saves and retrieves brandingProfileId', () => {
    svc.saveSettings({ brandingProfileId: 'brand_001' });
    expect(svc.getSettings().brandingProfileId).toBe('brand_001');
  });

  it('saves and retrieves defaultTemplateId', () => {
    svc.saveSettings({ defaultTemplateId: 'tpl_tsr_standard' });
    expect(svc.getSettings().defaultTemplateId).toBe('tpl_tsr_standard');
  });

  it('saves and retrieves defaultStoragePath', () => {
    svc.saveSettings({ defaultStoragePath: 'C:\\Users\\test\\Documents' });
    expect(svc.getSettings().defaultStoragePath).toBe('C:\\Users\\test\\Documents');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — ipc-schemas: additional boundary coverage
// ─────────────────────────────────────────────────────────────────────────────

import {
  SessionIntakeSchema,
  CaptureRequestSchema,
  ProjectCreateSchema,
  SettingsUpdateSchema,
  BrandingSaveSchema,
} from '@shared/schemas/index';

describe('IPC Schemas — additional boundary cases', () => {

  describe('SessionIntakeSchema — boundary strings', () => {
    const base = () => ({
      projectId: 'proj_1', testId: 'T-001', testName: 'Login',
      scenario: 'S', environment: 'QA', testerName: 'Alice',
      applicationUnderTest: 'App v1',
    });

    it('rejects projectId as empty string', () => {
      expect(SessionIntakeSchema.safeParse({ ...base(), projectId: '' }).success).toBe(false);
    });

    it('accepts testDataMatrix as non-empty optional string', () => {
      expect(SessionIntakeSchema.safeParse({ ...base(), testDataMatrix: 'row1|row2' }).success).toBe(true);
    });

    it('accepts requirementId and requirementDesc as optional strings', () => {
      expect(SessionIntakeSchema.safeParse({
        ...base(), requirementId: 'REQ-001', requirementDesc: 'Login requirement',
      }).success).toBe(true);
    });

    it('rejects testName longer than 200 characters', () => {
      expect(SessionIntakeSchema.safeParse({ ...base(), testName: 'A'.repeat(201) }).success).toBe(false);
    });

    it('accepts testerName with unicode characters', () => {
      expect(SessionIntakeSchema.safeParse({ ...base(), testerName: 'Olusegun Adébáyọ̀' }).success).toBe(true);
    });
  });

  describe('CaptureRequestSchema — all mode combinations', () => {
    it('accepts region with fractional coordinates', () => {
      expect(CaptureRequestSchema.safeParse({
        sessionId: 's1', mode: 'region',
        region: { x: 10.5, y: 20.3, width: 800.7, height: 600.1 },
      }).success).toBe(true);
    });

    it('rejects region with zero width', () => {
      expect(CaptureRequestSchema.safeParse({
        sessionId: 's1', mode: 'region',
        region: { x: 0, y: 0, width: 0, height: 100 },
      }).success).toBe(false);
    });

    it('accepts all valid statusTag values explicitly', () => {
      const tags = ['pass', 'fail', 'blocked', 'skip', 'untagged'] as const;
      for (const tag of tags) {
        expect(CaptureRequestSchema.safeParse({ sessionId: 's1', mode: 'fullscreen', statusTag: tag }).success).toBe(true);
      }
    });

    it('rejects null mode', () => {
      expect(CaptureRequestSchema.safeParse({ sessionId: 's1', mode: null }).success).toBe(false);
    });
  });

  describe('ProjectCreateSchema — boundary cases', () => {
    const base = () => ({
      name: 'My Project', clientName: 'ACME',
      startDate: '2026-05-08', templateId: 'tpl_1',
      brandingProfileId: 'brand_1', storagePath: 'C:\\Projects',
    });

    it('accepts description as optional string', () => {
      expect(ProjectCreateSchema.safeParse({ ...base(), description: 'A great project' }).success).toBe(true);
    });

    it('rejects description longer than 500 characters', () => {
      expect(ProjectCreateSchema.safeParse({ ...base(), description: 'A'.repeat(501) }).success).toBe(false);
    });

    it('accepts clientName up to 100 characters', () => {
      expect(ProjectCreateSchema.safeParse({ ...base(), clientName: 'C'.repeat(100) }).success).toBe(true);
    });

    it('rejects clientName over 100 characters', () => {
      expect(ProjectCreateSchema.safeParse({ ...base(), clientName: 'C'.repeat(101) }).success).toBe(false);
    });

    it('rejects empty storagePath', () => {
      expect(ProjectCreateSchema.safeParse({ ...base(), storagePath: '' }).success).toBe(false);
    });

    it('accepts namingPattern with all known tokens', () => {
      expect(ProjectCreateSchema.safeParse({
        ...base(),
        namingPattern: '{ProjectCode}_{ClientCode}_{TestID}_{Date}_{Time}_{Seq}_{Status}_{Env}_{TesterInitials}_{ModuleCode}',
      }).success).toBe(true);
    });
  });

  describe('SettingsUpdateSchema', () => {
    it('accepts an empty patch object (no-op update)', () => {
      expect(SettingsUpdateSchema.safeParse({}).success).toBe(true);
    });

    it('accepts partial theme-only patch', () => {
      expect(SettingsUpdateSchema.safeParse({ theme: 'dark' }).success).toBe(true);
    });

    it('rejects invalid theme value', () => {
      expect(SettingsUpdateSchema.safeParse({ theme: 'midnight' }).success).toBe(false);
    });

    it('accepts hotkeys as a record of strings', () => {
      expect(SettingsUpdateSchema.safeParse({
        hotkeys: { captureFullscreen: 'CmdOrCtrl+1' },
      }).success).toBe(true);
    });

    it('accepts onboardingComplete:false', () => {
      expect(SettingsUpdateSchema.safeParse({ onboardingComplete: false }).success).toBe(true);
    });
  });

  describe('BrandingSaveSchema', () => {
    const base = () => ({
      name: 'My Brand', companyName: 'ACME', logoBase64: null,
      logoMimeType: null, primaryColor: '#0078D4',
    });

    it('accepts valid brand without logo', () => {
      expect(BrandingSaveSchema.safeParse(base()).success).toBe(true);
    });

    it('accepts valid brand with PNG logo', () => {
      expect(BrandingSaveSchema.safeParse({
        ...base(), logoBase64: 'aGVsbG8=', logoMimeType: 'image/png',
      }).success).toBe(true);
    });

    it('accepts valid brand with JPEG logo', () => {
      expect(BrandingSaveSchema.safeParse({
        ...base(), logoBase64: 'aGVsbG8=', logoMimeType: 'image/jpeg',
      }).success).toBe(true);
    });

    it('rejects invalid logoMimeType', () => {
      expect(BrandingSaveSchema.safeParse({
        ...base(), logoBase64: 'aGVsbG8=', logoMimeType: 'image/gif',
      }).success).toBe(false);
    });

    it('rejects empty companyName', () => {
      expect(BrandingSaveSchema.safeParse({ ...base(), companyName: '' }).success).toBe(false);
    });

    it('rejects empty primaryColor', () => {
      expect(BrandingSaveSchema.safeParse({ ...base(), primaryColor: '' }).success).toBe(false);
    });

    it('accepts optional id field', () => {
      expect(BrandingSaveSchema.safeParse({ ...base(), id: 'brand_001' }).success).toBe(true);
    });

    it('accepts optional headerText and footerText', () => {
      expect(BrandingSaveSchema.safeParse({
        ...base(), headerText: 'Report Header', footerText: 'Confidential',
      }).success).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — session.store: capture subscription lifecycle (GAP-S1 fix)
// ─────────────────────────────────────────────────────────────────────────────

describe('useSessionStore — capture subscription lifecycle (GAP-S1)', () => {
  // These tests verify the fix: subscription must be tied to session lifecycle,
  // not module-level

  let onCaptureArrived: ReturnType<typeof vi.fn>;
  let captureOffFn: ReturnType<typeof vi.fn>;

  const sessionApi2 = { create: vi.fn(), end: vi.fn(), get: vi.fn() };
  const captureApi2 = { updateTag: vi.fn() };

  beforeEach(async () => {
    captureOffFn = vi.fn();
    onCaptureArrived = vi.fn().mockReturnValue(captureOffFn);
    // Ensure window exists in globalThis
    if (!('window' in globalThis)) {
      (globalThis as any).window = {};
    }
    // Patch the window evidexAPI with our capture mock
    (globalThis.window as any).evidexAPI = {
      session: sessionApi2,
      capture: captureApi2,
      events: {
        onCaptureFlash: vi.fn(() => vi.fn()),
        onSessionStatusUpdate: vi.fn(() => vi.fn()),
        onCaptureArrived,
      },
    };

    const { useSessionStore: store } = await import('../src/renderer/stores/session.store');
    store.setState({ activeSession: null, captures: [], isCapturing: false, _captureListener: null });
    vi.clearAllMocks();
    // Re-patch after clearing mocks
    onCaptureArrived = vi.fn().mockReturnValue(captureOffFn);
    (globalThis.window as any).evidexAPI = {
      session: sessionApi2,
      capture: captureApi2,
      events: {
        onCaptureFlash: vi.fn(() => vi.fn()),
        onSessionStatusUpdate: vi.fn(() => vi.fn()),
        onCaptureArrived,
      },
    };
  });

  it('startSession subscribes to onCaptureArrived', async () => {
    const { useSessionStore: store } = await import('../src/renderer/stores/session.store');
    const session = {
      id: 's1', projectId: 'p1', testId: 'T', testName: 'N',
      environment: 'E', testerName: 'D', applicationUnderTest: 'A',
      startedAt: new Date().toISOString(), captureCount: 0,
      passCount: 0, failCount: 0, blockedCount: 0,
    };
    sessionApi2.create.mockResolvedValueOnce({ ok: true, data: session });
    await store.getState().startSession({
      projectId: 'p1', testId: 'T', testName: 'N',
      environment: 'E', testerName: 'D', applicationUnderTest: 'A',
    });
    expect(onCaptureArrived).toHaveBeenCalledTimes(1);
  });

  it('clearSession calls the unsubscribe function', async () => {
    const { useSessionStore: store } = await import('../src/renderer/stores/session.store');
    const session = {
      id: 's1', projectId: 'p1', testId: 'T', testName: 'N',
      environment: 'E', testerName: 'D', applicationUnderTest: 'A',
      startedAt: new Date().toISOString(), captureCount: 0,
      passCount: 0, failCount: 0, blockedCount: 0,
    };
    sessionApi2.create.mockResolvedValueOnce({ ok: true, data: session });
    await store.getState().startSession({
      projectId: 'p1', testId: 'T', testName: 'N',
      environment: 'E', testerName: 'D', applicationUnderTest: 'A',
    });
    store.getState().clearSession();
    expect(captureOffFn).toHaveBeenCalledTimes(1);
  });

  it('clearSession sets _captureListener to null', async () => {
    const { useSessionStore: store } = await import('../src/renderer/stores/session.store');
    store.setState({ _captureListener: vi.fn() });
    store.getState().clearSession();
    expect(store.getState()._captureListener).toBeNull();
  });

  it('no subscription when startSession fails (ok:false)', async () => {
    const { useSessionStore: store } = await import('../src/renderer/stores/session.store');
    sessionApi2.create.mockResolvedValueOnce({ ok: false, error: { code: 'INTERNAL', message: 'fail' } });
    await store.getState().startSession({
      projectId: 'p1', testId: 'T', testName: 'N',
      environment: 'E', testerName: 'D', applicationUnderTest: 'A',
    }).catch(() => {});
    // onCaptureArrived should not be called if startSession threw before subscription
    expect(store.getState()._captureListener).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — project.store: isLoading and loadRecent edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('useProjectStore — isLoading and edge cases (GAP-S2)', () => {
  const projectApi2 = {
    create: vi.fn(), open: vi.fn(), close: vi.fn(),
    get: vi.fn(), list: vi.fn(), getRecent: vi.fn(),
  };

  beforeEach(async () => {
    // Ensure window exists in globalThis
    if (!('window' in globalThis)) {
      (globalThis as any).window = {};
    }
    (globalThis.window as any).evidexAPI = {
      project: projectApi2,
    };
    const { useProjectStore: store } = await import('../src/renderer/stores/project.store');
    store.setState({ activeProject: null, recentProjects: [], isLoading: false });
    vi.clearAllMocks();
  });

  it('loadRecent sets isLoading:true then false on success', async () => {
    const { useProjectStore: store } = await import('../src/renderer/stores/project.store');
    let capturedLoading = false;
    projectApi2.getRecent.mockImplementationOnce(async () => {
      capturedLoading = store.getState().isLoading;
      return { ok: true, data: [] };
    });
    await store.getState().loadRecent();
    expect(capturedLoading).toBe(true);
    expect(store.getState().isLoading).toBe(false);
  });

  it('loadRecent sets isLoading:false even on failure', async () => {
    const { useProjectStore: store } = await import('../src/renderer/stores/project.store');
    projectApi2.getRecent.mockResolvedValueOnce({ ok: false, error: { code: 'ERR', message: 'bad' } });
    await store.getState().loadRecent();
    expect(store.getState().isLoading).toBe(false);
  });

  it('createProject sets isLoading:false even when IPC fails', async () => {
    const { useProjectStore: store } = await import('../src/renderer/stores/project.store');
    projectApi2.create.mockResolvedValueOnce({ ok: false, error: { code: 'ERR', message: 'bad' } });
    await store.getState().createProject({
      name: 'P', clientName: 'C', startDate: '2026-05-08',
      templateId: 't', brandingProfileId: 'b', storagePath: '/tmp',
    }).catch(() => {});
    expect(store.getState().isLoading).toBe(false);
  });

  it('clear() resets everything to initial state', async () => {
    const { useProjectStore: store } = await import('../src/renderer/stores/project.store');
    store.setState({
      activeProject: { id: 'p', name: 'P', clientName: 'C', startDate: '', templateId: '', brandingProfileId: '', storagePath: '', namingPattern: '', status: 'active', createdAt: '', updatedAt: '' },
      recentProjects: [{ projectId: 'p', name: 'P', clientName: 'C', filePath: '/p.evidex', lastOpenedAt: '' }],
      isLoading: true,
    });
    store.getState().clear();
    expect(store.getState().activeProject).toBeNull();
    expect(store.getState().recentProjects).toHaveLength(0);
    expect(store.getState().isLoading).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — capture-service: additional edge cases and boundaries
// ─────────────────────────────────────────────────────────────────────────────

import sharp from 'sharp';
import { CaptureService, type CaptureServiceDeps, type CaptureSource, type SessionLookup, type CaptureSessionContext } from '../src/main/services/capture.service';
import { EvidexErrorCode } from '../src/shared/types/ipc';

async function makePng(): Promise<Buffer> {
  return sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
}

const SESSION_CTX: CaptureSessionContext = {
  sessionId: 'sess_1', projectId: 'proj_1', containerId: 'cont_1',
  testerName: 'D', projectName: 'P', clientName: 'C',
  testId: 'T-001', environment: 'QA', nextSequenceNum: 1,
};

describe('CaptureService — additional edge cases', () => {
  let raw: Buffer;
  let source: CaptureSource;
  let sessions: SessionLookup;
  let containerMock: { addImage: ReturnType<typeof vi.fn>; appendManifest: ReturnType<typeof vi.fn> };
  let dbMock: { insertCapture: ReturnType<typeof vi.fn> };
  let service: CaptureService;
  const FIXED = new Date('2026-05-08T10:00:00Z');

  beforeEach(async () => {
    raw = await makePng();
    source = { getRawScreen: vi.fn().mockResolvedValue(raw) };
    sessions = { getSessionContext: vi.fn().mockResolvedValue({ ...SESSION_CTX }) };
    containerMock = { addImage: vi.fn().mockResolvedValue('images/original/test.jpg'), appendManifest: vi.fn().mockResolvedValue(undefined) };
    dbMock = { insertCapture: vi.fn() };
    const deps: CaptureServiceDeps = {
      source, sessions,
      container: containerMock as unknown as CaptureServiceDeps['container'],
      getDb: () => dbMock as unknown as ReturnType<CaptureServiceDeps['getDb']>,
      naming: new NamingService({ now: () => FIXED }),
      runtime: { machineName: 'PC', osVersion: 'Win11', appVersion: '1.0' },
      now: () => FIXED,
    };
    service = new CaptureService(deps);
  });

  it('throws PROJECT_NOT_FOUND when getDb() returns null', async () => {
    const svc = new CaptureService({
      source, sessions, naming: new NamingService({ now: () => FIXED }),
      container: containerMock as unknown as CaptureServiceDeps['container'],
      getDb: () => null,
      runtime: { machineName: 'PC', osVersion: 'Win11', appVersion: '1.0' },
      now: () => FIXED,
    });
    await expect(svc.screenshot({ sessionId: 'sess_1', mode: 'fullscreen' })).rejects.toMatchObject({
      code: EvidexErrorCode.PROJECT_NOT_FOUND,
    });
  });

  it('updateTag throws PROJECT_NOT_FOUND when getDb() returns null', () => {
    const svc = new CaptureService({
      source, sessions, naming: new NamingService({ now: () => FIXED }),
      container: containerMock as unknown as CaptureServiceDeps['container'],
      getDb: () => null,
      runtime: { machineName: 'PC', osVersion: 'Win11', appVersion: '1.0' },
    });
    expect(() => svc.updateTag('cap_1', 'pass')).toThrow();
  });

  it('updateTag calls db.updateCaptureTag with correct args', () => {
    dbMock.insertCapture = vi.fn();
    const updateCaptureTag = vi.fn();
    const svc = new CaptureService({
      source, sessions, naming: new NamingService({ now: () => FIXED }),
      container: containerMock as unknown as CaptureServiceDeps['container'],
      getDb: () => ({ updateCaptureTag } as unknown as ReturnType<CaptureServiceDeps['getDb']>),
      runtime: { machineName: 'PC', osVersion: 'Win11', appVersion: '1.0' },
    });
    svc.updateTag('cap_x', 'fail');
    expect(updateCaptureTag).toHaveBeenCalledWith('cap_x', 'fail');
  });

  it('returns statusTag in the CaptureResult (GAP-T1)', async () => {
    const result = await service.screenshot({ sessionId: 'sess_1', mode: 'fullscreen', statusTag: 'pass' });
    expect(result.statusTag).toBe('pass');
  });

  it('defaults statusTag to untagged in CaptureResult when not provided', async () => {
    const result = await service.screenshot({ sessionId: 'sess_1', mode: 'fullscreen' });
    expect(result.statusTag).toBe('untagged');
  });

  it('passes all five status tags through to CaptureResult', async () => {
    const tags = ['pass', 'fail', 'blocked', 'skip', 'untagged'] as const;
    for (const statusTag of tags) {
      const result = await service.screenshot({ sessionId: 'sess_1', mode: 'fullscreen', statusTag });
      expect(result.statusTag).toBe(statusTag);
    }
  });

  it('does not call onFlash when no onFlash provided', async () => {
    // No error thrown when onFlash is undefined
    await expect(service.screenshot({ sessionId: 'sess_1', mode: 'fullscreen' })).resolves.toBeDefined();
  });

  it('namingPattern from context is used when provided', async () => {
    sessions = { getSessionContext: vi.fn().mockResolvedValue({ ...SESSION_CTX, namingPattern: '{Seq}' }) };
    const svc = new CaptureService({
      source, sessions,
      container: containerMock as unknown as CaptureServiceDeps['container'],
      getDb: () => dbMock as unknown as ReturnType<CaptureServiceDeps['getDb']>,
      naming: new NamingService({ now: () => FIXED }),
      runtime: { machineName: 'PC', osVersion: 'Win11', appVersion: '1.0' },
      now: () => FIXED,
    });
    const result = await svc.screenshot({ sessionId: 'sess_1', mode: 'fullscreen' });
    expect(result.filename).toBe('0001.jpg');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — container-crypto: additional edge cases
// ─────────────────────────────────────────────────────────────────────────────

import {
  encryptContainer, decryptContainer, HEADER_LENGTH,
  SALT_LENGTH_BYTES, IV_LENGTH_BYTES, ContainerCryptoError,
} from '../src/main/services/container-crypto';

describe('container-crypto — additional edge cases', () => {
  const PWD = 'test-password-robust';

  it('encrypts and decrypts empty buffer', () => {
    const plain = Buffer.alloc(0);
    expect(decryptContainer(encryptContainer(plain, PWD), PWD).length).toBe(0);
  });

  it('encrypts and decrypts large buffer (1 MB)', () => {
    const plain = Buffer.alloc(1024 * 1024, 0xAB);
    const enc = encryptContainer(plain, PWD);
    expect(decryptContainer(enc, PWD).equals(plain)).toBe(true);
  });

  it('Buffer password works same as string password', () => {
    const plain = Buffer.from('data');
    const pwdBuf = Buffer.from(PWD, 'utf8');
    const enc = encryptContainer(plain, pwdBuf);
    expect(decryptContainer(enc, pwdBuf).equals(plain)).toBe(true);
  });

  it('cross-password: string encrypt, same string decrypt succeeds', () => {
    const plain = Buffer.from('cross-test');
    const enc = encryptContainer(plain, 'password-A');
    expect(decryptContainer(enc, 'password-A').equals(plain)).toBe(true);
  });

  it('flipping auth tag byte at last position throws ContainerCryptoError', () => {
    const plain = Buffer.from('tag-flip-test');
    const enc = encryptContainer(plain, PWD);
    const tampered = Buffer.from(enc);
    const lastTagByte = HEADER_LENGTH - 1; // last byte of the tag
    tampered[lastTagByte] = tampered[lastTagByte] ^ 0xFF;
    expect(() => decryptContainer(tampered, PWD)).toThrow(ContainerCryptoError);
  });

  it('zero-length ciphertext with valid header structure throws ContainerCryptoError', () => {
    // Construct a buffer with valid magic+version+salt+iv+tag but no actual ciphertext
    const enc = encryptContainer(Buffer.from('x'), PWD);
    const trimmed = enc.subarray(0, HEADER_LENGTH); // just header + tag, no ciphertext
    expect(() => decryptContainer(trimmed, PWD)).toThrow(ContainerCryptoError);
  });

  it('decryptContainer throws ContainerCryptoError (not generic Error) for bad magic', () => {
    const enc = encryptContainer(Buffer.from('data'), PWD);
    const bad = Buffer.from(enc);
    bad[0] = 0x00;
    try {
      decryptContainer(bad, PWD);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ContainerCryptoError);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 — hotkey-utils: detectHotkeyConflicts and formatKeyEvent
// ─────────────────────────────────────────────────────────────────────────────

import { detectHotkeyConflicts, formatKeyEvent, DEFAULT_HOTKEYS } from '../src/renderer/onboarding/hotkey-utils';

describe('hotkey-utils — detectHotkeyConflicts', () => {
  it('returns empty set when all bindings are unique', () => {
    const result = detectHotkeyConflicts({
      captureFullscreen: 'Ctrl+Shift+1',
      captureWindow: 'Ctrl+Shift+2',
      captureRegion: 'Ctrl+Shift+3',
    });
    expect(result.size).toBe(0);
  });

  it('detects duplicate binding between two actions', () => {
    const result = detectHotkeyConflicts({
      captureFullscreen: 'Ctrl+Shift+1',
      captureWindow: 'Ctrl+Shift+1',
      captureRegion: 'Ctrl+Shift+3',
    });
    expect(result.has('captureFullscreen') || result.has('captureWindow')).toBe(true);
  });

  it('detects when all three bindings are the same', () => {
    const result = detectHotkeyConflicts({
      captureFullscreen: 'Ctrl+F',
      captureWindow: 'Ctrl+F',
      captureRegion: 'Ctrl+F',
    });
    expect(result.size).toBeGreaterThan(0);
  });

  it('DEFAULT_HOTKEYS have no conflicts', () => {
    expect(detectHotkeyConflicts(DEFAULT_HOTKEYS).size).toBe(0);
  });
});

describe('hotkey-utils — formatKeyEvent', () => {
  function makeKeyEvent(overrides: Partial<{
    key: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean;
  }> = {}): KeyboardEvent {
    return {
      key: 'F', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false,
      ...overrides,
    } as unknown as KeyboardEvent;
  }

  it('formats Ctrl+Shift+F', () => {
    const result = formatKeyEvent(makeKeyEvent({ key: 'F', ctrlKey: true, shiftKey: true }));
    expect(result).toContain('Ctrl');
    expect(result).toContain('Shift');
    expect(result).toContain('F');
  });

  it('formats Alt+key', () => {
    const result = formatKeyEvent(makeKeyEvent({ key: 'G', altKey: true }));
    expect(result).toContain('Alt');
    expect(result).toContain('G');
  });

  it('formats a key with no modifiers', () => {
    const result = formatKeyEvent(makeKeyEvent({ key: 'F5' }));
    expect(result).toContain('F5');
  });

  it('does not include modifier names as the key itself', () => {
    // Modifier-only events should not appear as key names in the output
    const result = formatKeyEvent(makeKeyEvent({ key: 'A', ctrlKey: true }));
    expect(result).not.toMatch(/^(Control|Shift|Alt|Meta)$/);
  });
});
