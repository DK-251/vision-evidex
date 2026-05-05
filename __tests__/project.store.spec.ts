// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Project, RecentProject } from '@shared/types/entities';

/**
 * Shape mirrors the preload bridge: nested `project.create / open / close
 * / get / list / getRecent`. Install the shim BEFORE importing the store
 * so the module-load-time read of `window.evidexAPI` (via the closures)
 * sees the mock.
 */
const projectApi = {
  create: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
  getRecent: vi.fn(),
};

if (typeof (globalThis as { window?: unknown }).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { evidexAPI: { project: projectApi } },
    writable: true,
    configurable: true,
  });
} else {
  (globalThis as { window: { evidexAPI: unknown } }).window.evidexAPI = {
    project: projectApi,
  };
}

const { useProjectStore } = await import('../src/renderer/stores/project.store');

const stubProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj_TEST',
  name: 'Week 8 Gate Project',
  clientName: 'ACME',
  startDate: '2026-05-05',
  templateId: 'tpl-default-tsr',
  brandingProfileId: 'brand-default',
  storagePath: '/tmp/proj.evidex',
  namingPattern: '{ProjectCode}_{TestID}_{Date}_{Time}_{Seq}',
  status: 'active',
  createdAt: '2026-05-05T10:00:00.000Z',
  updatedAt: '2026-05-05T10:00:00.000Z',
  ...overrides,
});

const stubRecent = (overrides: Partial<RecentProject> = {}): RecentProject => ({
  projectId: 'proj_TEST',
  name: 'Week 8 Gate Project',
  filePath: '/tmp/proj.evidex',
  lastOpenedAt: '2026-05-05T10:00:00.000Z',
  ...overrides,
});

const stubIntake = () => ({
  name: 'Week 8 Gate Project',
  clientName: 'ACME',
  startDate: '2026-05-05',
  templateId: 'tpl-default-tsr',
  brandingProfileId: 'brand-default',
  storagePath: '/tmp',
  namingPattern: '{ProjectCode}_{TestID}_{Date}_{Time}_{Seq}',
});

beforeEach(() => {
  useProjectStore.setState({ activeProject: null, recentProjects: [], isLoading: false });
  vi.clearAllMocks();
});

describe('useProjectStore', () => {

  describe('createProject()', () => {
    it('sets activeProject when project.create returns ok:true', async () => {
      const project = stubProject();
      projectApi.create.mockResolvedValueOnce({ ok: true, data: project });
      projectApi.getRecent.mockResolvedValueOnce({ ok: true, data: [stubRecent()] });

      await useProjectStore.getState().createProject(stubIntake());
      expect(useProjectStore.getState().activeProject?.id).toBe('proj_TEST');
    });

    it('refreshes recentProjects after a successful create', async () => {
      projectApi.create.mockResolvedValueOnce({ ok: true, data: stubProject() });
      projectApi.getRecent.mockResolvedValueOnce({
        ok: true, data: [stubRecent({ projectId: 'proj_TEST', name: 'Week 8 Gate Project' })],
      });

      await useProjectStore.getState().createProject(stubIntake());
      const recent = useProjectStore.getState().recentProjects;
      expect(recent).toHaveLength(1);
      expect(recent[0]?.projectId).toBe('proj_TEST');
    });

    it('throws when project.create returns ok:false (page can showToast)', async () => {
      projectApi.create.mockResolvedValueOnce({
        ok: false, error: { code: 'STORAGE_PATH_NOT_WRITABLE', message: 'no perms' },
      });
      await expect(useProjectStore.getState().createProject(stubIntake())).rejects.toThrow();
      // activeProject stays null on failure.
      expect(useProjectStore.getState().activeProject).toBeNull();
    });
  });

  describe('openProject()', () => {
    it('unwraps the {project, handle} envelope and stores just the project', async () => {
      const project = stubProject({ id: 'proj_REOPEN' });
      projectApi.open.mockResolvedValueOnce({
        ok: true,
        data: { project, handle: { containerId: 'cont_X', projectId: project.id, filePath: '/x', openedAt: '' } },
      });
      projectApi.getRecent.mockResolvedValueOnce({ ok: true, data: [] });

      const returned = await useProjectStore.getState().openProject('/some.evidex');
      expect(returned.id).toBe('proj_REOPEN');
      expect(useProjectStore.getState().activeProject?.id).toBe('proj_REOPEN');
    });

    it('throws when project.open IPC returns ok:false', async () => {
      projectApi.open.mockResolvedValueOnce({
        ok: false, error: { code: 'CONTAINER_DECRYPT_FAILED', message: 'wrong machine' },
      });
      await expect(useProjectStore.getState().openProject('/some.evidex')).rejects.toThrow();
    });
  });

  describe('closeProject()', () => {
    it('clears activeProject when close returns ok:true', async () => {
      useProjectStore.setState({ activeProject: stubProject() });
      projectApi.close.mockResolvedValueOnce({ ok: true, data: undefined });
      projectApi.getRecent.mockResolvedValueOnce({ ok: true, data: [] });
      await useProjectStore.getState().closeProject();
      expect(useProjectStore.getState().activeProject).toBeNull();
    });

    it('is a no-op when no project is active (does NOT call IPC)', async () => {
      await useProjectStore.getState().closeProject();
      expect(projectApi.close).not.toHaveBeenCalled();
    });
  });

  describe('loadRecent()', () => {
    it('populates recentProjects from the IPC response', async () => {
      projectApi.getRecent.mockResolvedValueOnce({
        ok: true,
        data: [stubRecent({ projectId: 'a' }), stubRecent({ projectId: 'b' })],
      });
      await useProjectStore.getState().loadRecent();
      expect(useProjectStore.getState().recentProjects).toHaveLength(2);
    });

    it('handles empty array gracefully', async () => {
      projectApi.getRecent.mockResolvedValueOnce({ ok: true, data: [] });
      await useProjectStore.getState().loadRecent();
      expect(useProjectStore.getState().recentProjects).toEqual([]);
    });

    it('keeps prior recentProjects on ok:false (non-fatal failure)', async () => {
      useProjectStore.setState({ recentProjects: [stubRecent({ projectId: 'prior' })] });
      projectApi.getRecent.mockResolvedValueOnce({
        ok: false, error: { code: 'UNKNOWN_ERROR', message: 'oops' },
      });
      await useProjectStore.getState().loadRecent();
      expect(useProjectStore.getState().recentProjects[0]?.projectId).toBe('prior');
    });
  });
});
