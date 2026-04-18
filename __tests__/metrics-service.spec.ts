import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../src/main/services/database.service';
import { MetricsService } from '../src/main/services/metrics.service';

describe('MetricsService', () => {
  let db: DatabaseService;
  let svc: MetricsService;

  beforeEach(() => {
    db = new DatabaseService(':memory:');
    db.initAppSchema();
    svc = new MetricsService(db);
  });

  afterEach(() => db.close());

  it('returns zeros when no recent projects exist', () => {
    expect(svc.summary()).toEqual({
      activeProjects: 0,
      sessionsToday: 0,
      capturesThisWeek: 0,
      exportsThisWeek: 0,
    });
  });

  it('reflects recent_projects count in activeProjects', () => {
    db.upsertRecentProject({
      projectId: 'proj_a',
      name: 'A',
      filePath: '/a.evidex',
      lastOpenedAt: '2026-04-18T00:00:00Z',
    });
    db.upsertRecentProject({
      projectId: 'proj_b',
      name: 'B',
      filePath: '/b.evidex',
      lastOpenedAt: '2026-04-18T00:00:00Z',
    });
    expect(svc.summary().activeProjects).toBe(2);
  });

  it('session / capture / export counters are placeholder zeros until Phase 2+', () => {
    db.upsertRecentProject({
      projectId: 'proj_a',
      name: 'A',
      filePath: '/a.evidex',
      lastOpenedAt: '2026-04-18T00:00:00Z',
    });
    const summary = svc.summary();
    expect(summary.sessionsToday).toBe(0);
    expect(summary.capturesThisWeek).toBe(0);
    expect(summary.exportsThisWeek).toBe(0);
  });
});
