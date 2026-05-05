import { create } from 'zustand';
import type { Project, RecentProject } from '@shared/types/entities';
import type { ProjectCreateInput } from '@shared/schemas';

/**
 * In-memory project state for the renderer (Phase 2 Wk 8). Mirrors only
 * the slice the UI needs — the main process owns the .evidex container
 * and per-container project DB lifecycle.
 *
 * No persistence — on app restart the user re-opens via the recent
 * projects list (recent_projects in app.db, hydrated by `loadRecent`).
 */

interface ProjectStore {
  activeProject:  Project | null;
  recentProjects: RecentProject[];
  isLoading:      boolean;
  createProject:  (input: ProjectCreateInput) => Promise<Project>;
  openProject:    (filePath: string) => Promise<Project>;
  closeProject:   () => Promise<void>;
  loadRecent:     () => Promise<void>;
  /** Reset everything — used on logout or window-all-closed scenarios. */
  clear: () => void;
}

export const useProjectStore = create<ProjectStore>()((set, get) => ({
  activeProject:  null,
  recentProjects: [],
  isLoading:      false,

  async createProject(input) {
    set({ isLoading: true });
    try {
      const result = await window.evidexAPI.project.create(input);
      if (!result.ok) {
        throw Object.assign(new Error(result.error.message), {
          code: result.error.code,
          fields: result.error.fields,
        });
      }
      set({ activeProject: result.data });
      // Refresh recent so the just-created project appears at the top.
      await get().loadRecent();
      return result.data;
    } finally {
      set({ isLoading: false });
    }
  },

  async openProject(filePath) {
    set({ isLoading: true });
    try {
      const result = await window.evidexAPI.project.open(filePath);
      if (!result.ok) {
        throw Object.assign(new Error(result.error.message), {
          code: result.error.code,
          fields: result.error.fields,
        });
      }
      set({ activeProject: result.data.project });
      await get().loadRecent();
      return result.data.project;
    } finally {
      set({ isLoading: false });
    }
  },

  async closeProject() {
    const active = get().activeProject;
    if (!active) return;
    const result = await window.evidexAPI.project.close(active.id);
    if (!result.ok) {
      throw Object.assign(new Error(result.error.message), {
        code: result.error.code,
        fields: result.error.fields,
      });
    }
    set({ activeProject: null });
    await get().loadRecent();
  },

  async loadRecent() {
    const result = await window.evidexAPI.project.getRecent();
    if (!result.ok) {
      // Recent-list failures are non-fatal — keep whatever is already loaded.
      // eslint-disable-next-line no-console
      console.warn('[project-store] loadRecent failed', result.error);
      return;
    }
    set({ recentProjects: result.data });
  },

  clear() {
    set({ activeProject: null, recentProjects: [], isLoading: false });
  },
}));
