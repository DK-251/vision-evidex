import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../src/main/services/database.service';

/**
 * Runs against better-sqlite3 `:memory:` so each test gets a clean DB.
 * The native module must be compiled for the active Node runtime — Asus
 * TUF's `npm install` + `electron-rebuild` covers this; CTS never builds.
 */

describe('DatabaseService (app.db)', () => {
  let db: DatabaseService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initAppSchema();
  });

  afterEach(() => {
    db.close();
  });

  it('creates the four app-level tables idempotently', () => {
    // Second call must not throw — CREATE TABLE IF NOT EXISTS.
    expect(() => db.initAppSchema()).not.toThrow();
  });

  it('returns an empty list from getRecentProjects when empty', () => {
    expect(db.getRecentProjects()).toEqual([]);
  });

  it('upsertRecentProject inserts then updates the same projectId', () => {
    db.upsertRecentProject({
      projectId: 'proj_01',
      name: 'Alpha',
      filePath: 'C:/projects/alpha.evidex',
      lastOpenedAt: '2026-04-18T10:00:00.000Z',
    });
    expect(db.getRecentProjects()).toEqual([
      {
        projectId: 'proj_01',
        name: 'Alpha',
        filePath: 'C:/projects/alpha.evidex',
        lastOpenedAt: '2026-04-18T10:00:00.000Z',
      },
    ]);

    db.upsertRecentProject({
      projectId: 'proj_01',
      name: 'Alpha (renamed)',
      filePath: 'C:/projects/alpha.evidex',
      lastOpenedAt: '2026-04-18T11:00:00.000Z',
    });
    const rows = db.getRecentProjects();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Alpha (renamed)');
    expect(rows[0]?.lastOpenedAt).toBe('2026-04-18T11:00:00.000Z');
  });

  it('orders recent projects by lastOpenedAt DESC', () => {
    db.upsertRecentProject({
      projectId: 'proj_a',
      name: 'Older',
      filePath: '/a.evidex',
      lastOpenedAt: '2026-04-10T09:00:00.000Z',
    });
    db.upsertRecentProject({
      projectId: 'proj_b',
      name: 'Newer',
      filePath: '/b.evidex',
      lastOpenedAt: '2026-04-18T09:00:00.000Z',
    });
    const names = db.getRecentProjects().map((p) => p.name);
    expect(names).toEqual(['Newer', 'Older']);
  });
});
