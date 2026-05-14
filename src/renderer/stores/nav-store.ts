import { create } from 'zustand';

/**
 * Page-dispatch nav store.
 *
 * NAV-02 fix: Sessions sidebar item is disabled (page=null) when no
 *             project is open. Sidebar.tsx checks currentProjectId.
 * NAV-NEW-01 fix: navigate to 'project-overview' no longer clears
 *             currentSessionId — only truly top-level pages reset it.
 */

export type Page =
  | 'dashboard'
  | 'settings'
  | 'session-intake'
  | 'session-gallery'
  | 'project-list'
  | 'create-project'
  | 'project-overview'
  | 'session-list'
  | 'session-detail'
  | 'project-settings';

export type ShellPage = Page;

export interface NavParams {
  projectId?: string;
  sessionId?: string;
}

const HISTORY_MAX = 10;

interface NavState {
  page: Page;
  currentProjectId: string | null;
  currentSessionId: string | null;
  history: Page[];
  sidebarCollapsed: boolean;
  navigate: (page: Page, params?: NavParams) => void;
  goBack: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useNavStore = create<NavState>()((set) => ({
  page: 'project-list',
  currentProjectId: null,
  currentSessionId: null,
  history: [],
  sidebarCollapsed: false,

  navigate: (page, params) =>
    set((s) => {
      const nextHistory =
        s.history.length >= HISTORY_MAX
          ? [...s.history.slice(-(HISTORY_MAX - 1)), s.page]
          : [...s.history, s.page];

      // Pages that carry session context.
      const isSessionPage =
        page === 'session-intake' ||
        page === 'session-gallery' ||
        page === 'session-detail';

      // Pages that carry project context (session pages implicitly do too).
      const isProjectPage =
        isSessionPage ||
        page === 'create-project' ||
        page === 'project-list' ||
        page === 'project-overview' ||
        page === 'session-list' ||
        page === 'project-settings';

      // NAV-NEW-01: 'project-overview' is a project page but NOT a session-
      // clearing page. Only pages completely outside the project context
      // (dashboard, settings, project-list without a projectId param) should
      // clear currentSessionId.
      const clearsSession = !isProjectPage;

      return {
        page,
        history: nextHistory,
        currentProjectId: isProjectPage
          ? (params?.projectId !== undefined ? params.projectId : s.currentProjectId)
          : null,
        // NAV-NEW-01: keep currentSessionId when navigating within the project
        // tree so gallery → project-overview → gallery back still works.
        currentSessionId: clearsSession
          ? null
          : isSessionPage
            ? (params?.sessionId !== undefined ? params.sessionId : s.currentSessionId)
            : s.currentSessionId,   // project-level pages preserve the session ID
      };
    }),

  goBack: () =>
    set((s) => {
      if (s.history.length === 0) {
        return { page: 'project-list', history: [] };
      }
      const previous = s.history[s.history.length - 1]!;
      return { page: previous, history: s.history.slice(0, -1) };
    }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}));
