import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../src/main/services/database.service';
import { PROJECT_MIGRATIONS } from '../src/main/migrations';

/**
 * Runs against better-sqlite3 `:memory:` so each test gets a clean DB.
 * The native module must be compiled for the active Node runtime — Asus
 * TUF's `npm install` + electron-rebuild covers this; CTS never builds.
 */

const APP_VERSION = '0.1.0-test';

function seedProject(db: DatabaseService, id = 'proj_1') {
  db.insertProject({
    id,
    name: 'Test project',
    clientName: 'ACME',
    description: 'A test',
    startDate: '2026-04-18',
    templateId: 'tpl_default',
    brandingProfileId: '',
    storagePath: '',
    namingPattern: '{Seq}',
    status: 'active',
    createdAt: '2026-04-18T00:00:00Z',
    appVersion: APP_VERSION,
  });
}

function seedSession(db: DatabaseService, id = 'sess_1', projectId = 'proj_1') {
  db.insertSession({
    id,
    projectId,
    testId: 'T-001',
    testName: 'Login test',
    scenario: 'Happy path',
    environment: 'QA',
    applicationUnderTest: 'web-app',
    testerName: 'Deepak',
    startedAt: '2026-04-18T09:00:00Z',
  });
}

function seedCapture(db: DatabaseService, id = 'cap_1', opts: Partial<{ seq: number; session: string }> = {}) {
  db.insertCapture({
    id,
    sessionId: opts.session ?? 'sess_1',
    projectId: 'proj_1',
    sequenceNum: opts.seq ?? 1,
    originalFilename: `${id}.jpg`,
    sha256Hash: 'a'.repeat(64),
    fileSizeBytes: 1024,
    captureMode: 'fullscreen',
    statusTag: 'untagged',
    capturedAt: '2026-04-18T09:05:00Z',
    machineName: 'asus-tuf',
    osVersion: 'Windows 11',
    appVersion: APP_VERSION,
    testerName: 'Deepak',
  });
}

describe('DatabaseService — app.db', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initAppSchema();
  });

  afterEach(() => db.close());

  it('creates app tables idempotently', () => {
    expect(() => db.initAppSchema()).not.toThrow();
  });

  it('returns empty recent_projects', () => {
    expect(db.getRecentProjects()).toEqual([]);
  });

  it('upsertRecentProject inserts then updates the same projectId', () => {
    db.upsertRecentProject({
      projectId: 'proj_01',
      name: 'Alpha',
      filePath: 'C:/projects/alpha.evidex',
      lastOpenedAt: '2026-04-18T10:00:00Z',
    });
    db.upsertRecentProject({
      projectId: 'proj_01',
      name: 'Alpha (renamed)',
      filePath: 'C:/projects/alpha.evidex',
      lastOpenedAt: '2026-04-18T11:00:00Z',
    });
    const rows = db.getRecentProjects();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Alpha (renamed)');
  });

  it('orders recent projects by lastOpenedAt DESC', () => {
    db.upsertRecentProject({
      projectId: 'proj_a',
      name: 'Older',
      filePath: '/a.evidex',
      lastOpenedAt: '2026-04-10T09:00:00Z',
    });
    db.upsertRecentProject({
      projectId: 'proj_b',
      name: 'Newer',
      filePath: '/b.evidex',
      lastOpenedAt: '2026-04-18T09:00:00Z',
    });
    expect(db.getRecentProjects().map((p) => p.name)).toEqual(['Newer', 'Older']);
  });
});

describe('DatabaseService — project.db migrations', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
  });

  afterEach(() => db.close());

  it('initProjectSchema applies every registered migration', () => {
    db.initProjectSchema();
    expect(db.getAppliedMigrations()).toEqual(PROJECT_MIGRATIONS.map((m) => m.version));
  });

  it('initProjectSchema is idempotent — second call applies nothing new', () => {
    db.initProjectSchema();
    const first = db.getAppliedMigrations();
    db.initProjectSchema();
    expect(db.getAppliedMigrations()).toEqual(first);
  });
});

describe('DatabaseService — projects', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initProjectSchema();
  });

  afterEach(() => db.close());

  it('insertProject → getProject roundtrip', () => {
    seedProject(db);
    const p = db.getProject('proj_1');
    expect(p?.name).toBe('Test project');
    expect(p?.clientName).toBe('ACME');
    expect(p?.status).toBe('active');
    expect(p?.updatedAt).toBe(p?.createdAt);
  });

  it('returns null for unknown projectId', () => {
    expect(db.getProject('missing')).toBeNull();
  });

  it('updateProjectStatus changes status and bumps updated_at', async () => {
    seedProject(db);
    const before = db.getProject('proj_1');
    await new Promise((r) => setTimeout(r, 5));
    db.updateProjectStatus('proj_1', 'archived');
    const after = db.getProject('proj_1');
    expect(after?.status).toBe('archived');
    expect(after?.updatedAt).not.toBe(before?.updatedAt);
  });

  it('updateProjectUpdatedAt bumps only the timestamp', async () => {
    seedProject(db);
    const before = db.getProject('proj_1');
    await new Promise((r) => setTimeout(r, 5));
    db.updateProjectUpdatedAt('proj_1');
    const after = db.getProject('proj_1');
    expect(after?.updatedAt).not.toBe(before?.updatedAt);
    expect(after?.status).toBe(before?.status);
  });
});

describe('DatabaseService — sessions', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initProjectSchema();
    seedProject(db);
  });

  afterEach(() => db.close());

  it('insertSession → getSession with default counts', () => {
    seedSession(db);
    const s = db.getSession('sess_1');
    expect(s?.testId).toBe('T-001');
    expect(s?.captureCount).toBe(0);
    expect(s?.endedAt).toBeUndefined();
  });

  it('getActiveSession returns an open session and null after close', () => {
    seedSession(db);
    expect(db.getActiveSession('proj_1')?.id).toBe('sess_1');
    db.closeSession('sess_1', '2026-04-18T10:00:00Z');
    expect(db.getActiveSession('proj_1')).toBeNull();
  });

  it('getSessionsForProject returns rows ordered by started_at DESC', () => {
    db.insertSession({
      id: 's_old',
      projectId: 'proj_1',
      testId: 'T1',
      testName: 'old',
      scenario: 'a',
      environment: 'QA',
      applicationUnderTest: 'x',
      testerName: 'D',
      startedAt: '2026-04-01T00:00:00Z',
    });
    db.insertSession({
      id: 's_new',
      projectId: 'proj_1',
      testId: 'T2',
      testName: 'new',
      scenario: 'a',
      environment: 'QA',
      applicationUnderTest: 'x',
      testerName: 'D',
      startedAt: '2026-04-18T00:00:00Z',
    });
    expect(db.getSessionsForProject('proj_1').map((s) => s.id)).toEqual(['s_new', 's_old']);
  });

  it('updateSessionCounts increments by delta', () => {
    seedSession(db);
    db.updateSessionCounts('sess_1', { total: 3, pass: 2, fail: 1 });
    db.updateSessionCounts('sess_1', { total: 1, blocked: 1 });
    const s = db.getSession('sess_1');
    expect(s?.captureCount).toBe(4);
    expect(s?.passCount).toBe(2);
    expect(s?.failCount).toBe(1);
    expect(s?.blockedCount).toBe(1);
  });

  it('getNextSequenceNum starts at 1 and increments with inserted captures', () => {
    seedSession(db);
    expect(db.getNextSequenceNum('proj_1')).toBe(1);
    seedCapture(db, 'cap_1', { seq: 1 });
    expect(db.getNextSequenceNum('proj_1')).toBe(2);
    seedCapture(db, 'cap_2', { seq: 2 });
    expect(db.getNextSequenceNum('proj_1')).toBe(3);
  });

  it('insertSession without matching projects row fails FK constraint', () => {
    expect(() =>
      db.insertSession({
        id: 'orphan',
        projectId: 'does-not-exist',
        testId: 'T',
        testName: 'orphan',
        scenario: 'a',
        environment: 'QA',
        applicationUnderTest: 'x',
        testerName: 'D',
        startedAt: '2026-04-18T00:00:00Z',
      })
    ).toThrow(/FOREIGN KEY/i);
  });
});

describe('DatabaseService — captures', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initProjectSchema();
    seedProject(db);
    seedSession(db);
  });

  afterEach(() => db.close());

  it('insertCapture → getCapture roundtrip', () => {
    seedCapture(db);
    const c = db.getCapture('cap_1');
    expect(c?.sequenceNum).toBe(1);
    expect(c?.originalFilename).toBe('cap_1.jpg');
    expect(c?.annotatedFilename).toBeUndefined();
    expect(c?.statusTag).toBe('untagged');
  });

  it('getCapturesForSession orders by sequence ASC', () => {
    seedCapture(db, 'cap_2', { seq: 2 });
    seedCapture(db, 'cap_1', { seq: 1 });
    expect(db.getCapturesForSession('sess_1').map((c) => c.id)).toEqual(['cap_1', 'cap_2']);
  });

  it('updateCaptureTag persists', () => {
    seedCapture(db);
    db.updateCaptureTag('cap_1', 'fail');
    expect(db.getCapture('cap_1')?.statusTag).toBe('fail');
  });

  it('updateCaptureAnnotation sets annotated path and has_annotation', () => {
    seedCapture(db);
    db.updateCaptureAnnotation('cap_1', 'images/annotated/cap_1_annot.jpg');
    expect(db.getCapture('cap_1')?.annotatedFilename).toBe('cap_1_annot.jpg');
  });

  it('updateCaptureNotes persists', () => {
    seedCapture(db);
    db.updateCaptureNotes('cap_1', 'interesting edge case');
    expect(db.getCapture('cap_1')?.notes).toBe('interesting edge case');
  });
});

describe('DatabaseService — annotation_layers', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initProjectSchema();
    seedProject(db);
    seedSession(db);
    seedCapture(db);
  });

  afterEach(() => db.close());

  it('insert and get a layer', () => {
    const layerJson = JSON.stringify({ version: '5.3.0', objects: [], blurRegions: [] });
    db.insertAnnotationLayer({
      id: 'lyr_1',
      captureId: 'cap_1',
      layerJson,
      fabricVersion: '5.3.0',
      blurRegions: [],
      savedAt: '2026-04-18T10:00:00Z',
    });
    const layer = db.getAnnotationLayer('cap_1');
    expect(layer?.captureId).toBe('cap_1');
    expect(layer?.fabricVersion).toBe('5.3.0');
  });

  it('updateAnnotationLayer overwrites layer_json', () => {
    db.insertAnnotationLayer({
      id: 'lyr_1',
      captureId: 'cap_1',
      layerJson: '{"version":"5.3.0","objects":[]}',
      fabricVersion: '5.3.0',
      blurRegions: [],
      savedAt: '2026-04-18T10:00:00Z',
    });
    db.updateAnnotationLayer('cap_1', '{"version":"5.3.0","objects":[{"type":"rect"}]}');
    const layer = db.getAnnotationLayer('cap_1');
    expect(layer?.layerJson).toContain('rect');
  });
});

describe('DatabaseService — sign_offs (APPEND-ONLY)', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initProjectSchema();
    seedProject(db);
  });

  afterEach(() => db.close());

  it('insertSignOff + getSignOffsForProject preserves comments', () => {
    db.insertSignOff({
      id: 'so_1',
      projectId: 'proj_1',
      reviewerName: 'Alice',
      reviewerRole: 'Lead',
      decision: 'accept',
      signedAt: '2026-04-18T10:00:00Z',
      submittedBy: 'Deepak',
    });
    db.insertSignOff({
      id: 'so_2',
      projectId: 'proj_1',
      reviewerName: 'Bob',
      reviewerRole: 'Audit',
      decision: 'reject',
      comments: 'needs rework',
      signedAt: '2026-04-18T11:00:00Z',
      submittedBy: 'Deepak',
    });
    const rows = db.getSignOffsForProject('proj_1');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.decision).toBe('accept');
    expect(rows[1]?.comments).toBe('needs rework');
  });

  it('exposes no update or delete method (architectural rule 5)', () => {
    expect((db as unknown as Record<string, unknown>)['updateSignOff']).toBeUndefined();
    expect((db as unknown as Record<string, unknown>)['deleteSignOff']).toBeUndefined();
  });
});

describe('DatabaseService — access_log (APPEND-ONLY)', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initProjectSchema();
    seedProject(db);
  });

  afterEach(() => db.close());

  it('insert + get in chronological order', () => {
    db.insertAccessLog({
      id: 'al_1',
      projectId: 'proj_1',
      eventType: 'project_open',
      performedBy: 'Deepak',
      performedAt: '2026-04-18T09:00:00Z',
    });
    db.insertAccessLog({
      id: 'al_2',
      projectId: 'proj_1',
      eventType: 'session_start',
      details: '{"session":"sess_1"}',
      performedBy: 'Deepak',
      performedAt: '2026-04-18T09:01:00Z',
    });
    const rows = db.getAccessLog('proj_1');
    expect(rows.map((r) => r.eventType)).toEqual(['project_open', 'session_start']);
    expect(rows[1]?.details).toBe('{"session":"sess_1"}');
  });

  it('exposes no update or delete method', () => {
    expect((db as unknown as Record<string, unknown>)['updateAccessLog']).toBeUndefined();
    expect((db as unknown as Record<string, unknown>)['deleteAccessLog']).toBeUndefined();
  });
});

describe('DatabaseService — version_history (APPEND-ONLY)', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initProjectSchema();
    seedProject(db);
  });

  afterEach(() => db.close());

  it('insertVersionHistory + getVersionHistory preserves order', () => {
    db.insertVersionHistory({
      id: 'vh_1',
      projectId: 'proj_1',
      savedAt: '2026-04-18T09:00:00Z',
      savedBy: 'Deepak',
      appVersion: APP_VERSION,
    });
    db.insertVersionHistory({
      id: 'vh_2',
      projectId: 'proj_1',
      savedAt: '2026-04-18T10:00:00Z',
      savedBy: 'Deepak',
      appVersion: APP_VERSION,
    });
    expect(db.getVersionHistory('proj_1').map((v) => v.id)).toEqual(['vh_1', 'vh_2']);
  });

  it('exposes no update or delete method', () => {
    expect((db as unknown as Record<string, unknown>)['updateVersionHistory']).toBeUndefined();
    expect((db as unknown as Record<string, unknown>)['deleteVersionHistory']).toBeUndefined();
  });

  it('walCheckpoint does not throw', () => {
    expect(() => db.walCheckpoint()).not.toThrow();
  });
});

describe('DatabaseService — import_history', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initProjectSchema();
    seedProject(db);
  });

  afterEach(() => db.close());

  it('insert + get sorted most-recent first', () => {
    db.insertImportHistory({
      id: 'ih_1',
      projectId: 'proj_1',
      filename: 'Q1.xlsx',
      importedAt: '2026-04-01T09:00:00Z',
      importedBy: 'Deepak',
      fieldCount: 18,
      schemaVersion: 'evidex-import-v1',
    });
    db.insertImportHistory({
      id: 'ih_2',
      projectId: 'proj_1',
      filename: 'Q2.xlsx',
      importedAt: '2026-04-18T09:00:00Z',
      importedBy: 'Deepak',
      fieldCount: 18,
      schemaVersion: 'evidex-import-v1',
    });
    expect(db.getImportHistory('proj_1').map((r) => r.filename)).toEqual(['Q2.xlsx', 'Q1.xlsx']);
  });
});
