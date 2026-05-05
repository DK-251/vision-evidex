// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ProjectService } from '../src/main/services/project.service';
import { DatabaseService } from '../src/main/services/database.service';
import { EvidexErrorCode } from '../src/shared/types/ipc';
import type { ProjectCreateInput, ContainerHandle } from '../src/shared/types/entities';

/**
 * ProjectService unit tests (Phase 2 Wk 8 / W8-1).
 *
 * The container is mocked — its real implementation needs sharp/jszip
 * and a writable filesystem path; we exercise it in the integration
 * suite. Here we assert ProjectService's wiring contract:
 *
 *   - storage path validation throws STORAGE_PATH_NOT_WRITABLE
 *   - sanitised filename + path.join layout
 *   - container.create called with the right payload
 *   - per-container project DB receives the project + access-log row
 *   - app.db gets the recent-projects upsert
 *   - open() throws PROJECT_NOT_FOUND when file missing
 *   - close() ends an active session before tearing down
 *   - close() saves and then closes the container
 */

const FIXED_NOW = new Date('2026-05-05T10:00:00.000Z');

const intake = (overrides: Partial<ProjectCreateInput> = {}): ProjectCreateInput => ({
  name: 'Week 8 Gate Project',
  clientName: 'ACME Corp',
  startDate: '2026-05-05',
  templateId: 'tpl-default-tsr',
  brandingProfileId: 'brand-default',
  storagePath: '',  // overridden per test
  namingPattern: '{ProjectCode}_{TestID}_{Date}_{Time}_{Seq}',
  ...overrides,
});

let workDir: string;
let appDb: DatabaseService;
let projectDbStub: {
  insertProject: ReturnType<typeof vi.fn>;
  insertAccessLog: ReturnType<typeof vi.fn>;
  getProject: ReturnType<typeof vi.fn>;
};
let container: {
  create: ReturnType<typeof vi.fn>;
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  getCurrentHandle: ReturnType<typeof vi.fn>;
  getProjectDb: ReturnType<typeof vi.fn>;
};
let sessionsStub: {
  getActive: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
};
let svc: ProjectService;

beforeEach(() => {
  // A real, writable temp dir for the path-validation guard. Cleaned on afterEach.
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidex-project-spec-'));

  appDb = new DatabaseService(':memory:');
  appDb.initAppSchema();

  projectDbStub = {
    insertProject: vi.fn(),
    insertAccessLog: vi.fn(),
    getProject: vi.fn(() => null),
  };

  const handleStub: ContainerHandle = {
    containerId: 'cont_TEST',
    projectId: '',  // overridden in create() mock per call
    filePath: '',
    openedAt: FIXED_NOW.toISOString(),
  };

  container = {
    create: vi.fn(async (cfg: { projectId: string; filePath: string }) => ({
      ...handleStub,
      projectId: cfg.projectId,
      filePath: cfg.filePath,
    })),
    open: vi.fn(async (filePath: string) => ({
      ...handleStub,
      projectId: 'proj_FROM_OPEN',
      filePath,
    })),
    close: vi.fn(async () => undefined),
    save: vi.fn(async () => undefined),
    getCurrentHandle: vi.fn(() => null),
    getProjectDb: vi.fn(() => projectDbStub),
  };

  sessionsStub = {
    getActive: vi.fn(() => null),
    end: vi.fn(async () => ({ sessionId: '', captureCount: 0, passCount: 0, failCount: 0, blockedCount: 0, durationSec: 0 })),
  };

  svc = new ProjectService({
    appDb,
    container: container as never,
    sessions: sessionsStub as never,
    appVersion: '1.0.0-test',
    now: () => FIXED_NOW,
  });
});

afterEach(() => {
  appDb.close();
  fs.rmSync(workDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('ProjectService.create', () => {

  it('throws STORAGE_PATH_NOT_WRITABLE when the directory does not exist', async () => {
    const bogus = path.join(workDir, 'does-not-exist');
    await expect(svc.create(intake({ storagePath: bogus }))).rejects.toMatchObject({
      code: EvidexErrorCode.STORAGE_PATH_NOT_WRITABLE,
    });
    expect(container.create).not.toHaveBeenCalled();
  });

  it('joins storagePath + sanitised name to build the .evidex file path', async () => {
    await svc.create(intake({ storagePath: workDir, name: 'Bad/Name?Project' }));
    expect(container.create).toHaveBeenCalledTimes(1);
    const cfg = container.create.mock.calls[0]![0]!;
    expect(cfg.filePath).toBe(path.join(workDir, 'Bad_Name_Project.evidex'));
  });

  it('inserts the project row into the per-container project DB (NOT app.db)', async () => {
    await svc.create(intake({ storagePath: workDir }));
    expect(projectDbStub.insertProject).toHaveBeenCalledTimes(1);
    const inserted = projectDbStub.insertProject.mock.calls[0]![0]!;
    expect(inserted).toMatchObject({
      name: 'Week 8 Gate Project',
      clientName: 'ACME Corp',
      status: 'active',
      appVersion: '1.0.0-test',
      templateId: 'tpl-default-tsr',
      brandingProfileId: 'brand-default',
    });
    expect(inserted.id).toMatch(/^proj_/);
  });

  it('upserts a recent_projects row into app.db keyed by the new project id', async () => {
    const project = await svc.create(intake({ storagePath: workDir }));
    const recent = appDb.getRecentProjects();
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({
      projectId: project.id,
      name: project.name,
      filePath: project.storagePath,
    });
  });

  it('writes a project_create access_log row + persists via container.save', async () => {
    await svc.create(intake({ storagePath: workDir }));
    expect(projectDbStub.insertAccessLog).toHaveBeenCalledTimes(1);
    expect(projectDbStub.insertAccessLog.mock.calls[0]![0]!).toMatchObject({
      eventType: 'project_create',
    });
    expect(container.save).toHaveBeenCalledWith('cont_TEST');
  });
});

describe('ProjectService.open', () => {

  it('throws PROJECT_NOT_FOUND when the file does not exist', async () => {
    await expect(svc.open(path.join(workDir, 'missing.evidex'))).rejects.toMatchObject({
      code: EvidexErrorCode.PROJECT_NOT_FOUND,
    });
    expect(container.open).not.toHaveBeenCalled();
  });

  it('returns the project + handle when container.open succeeds and the row is present', async () => {
    const real = path.join(workDir, 'real.evidex');
    fs.writeFileSync(real, 'pretend this is encrypted');
    projectDbStub.getProject.mockReturnValueOnce({
      id: 'proj_FROM_OPEN',
      name: 'Reopened Project',
      clientName: 'C',
      startDate: '2026-05-05',
      templateId: 'tpl-default-tsr',
      brandingProfileId: 'brand-default',
      storagePath: real,
      namingPattern: '',
      status: 'active',
      createdAt: '2026-05-04T00:00:00Z',
      updatedAt: '2026-05-04T00:00:00Z',
    });
    const result = await svc.open(real);
    expect(result.project.id).toBe('proj_FROM_OPEN');
    expect(result.handle.containerId).toBe('cont_TEST');
    expect(appDb.getRecentProjects()).toHaveLength(1);
  });
});

describe('ProjectService.close', () => {

  it('ends the active session first, then saves + closes the container', async () => {
    const order: string[] = [];
    sessionsStub.getActive.mockReturnValueOnce({ id: 'sess_X' });
    sessionsStub.end.mockImplementationOnce(async () => { order.push('session.end'); return {} as never; });
    container.save.mockImplementationOnce(async () => { order.push('container.save'); });
    container.close.mockImplementationOnce(async () => { order.push('container.close'); });
    container.getCurrentHandle.mockReturnValue({
      containerId: 'cont_TEST', projectId: 'proj_TEST', filePath: '/tmp/p.evidex', openedAt: FIXED_NOW.toISOString(),
    });

    await svc.close('proj_TEST');

    expect(sessionsStub.end).toHaveBeenCalledWith('sess_X');
    expect(order).toEqual(['session.end', 'container.save', 'container.close']);
  });

  it('is a no-op when no project is open (idempotent close)', async () => {
    container.getCurrentHandle.mockReturnValue(null);
    await expect(svc.close('proj_NOTHING')).resolves.toBeUndefined();
    expect(container.save).not.toHaveBeenCalled();
    expect(container.close).not.toHaveBeenCalled();
  });
});
