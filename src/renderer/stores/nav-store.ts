import { create } from 'zustand';

/**
 * Page-dispatch nav store. The session-route values land in Phase 2 Wk 7
 * D34 alongside SessionIntakePage / SessionGalleryPage. URL-based routing
 * (HashRouter + react-router) is tracked in BACKLOG.md as PH2-ROUTING and
 * lands before Phase 3 — component contracts already take projectId /
 * sessionId as inputs, so the migration is mechanical.
 */

export type Page =
  | 'dashboard'
  | 'settings'
  | 'session-intake'
  | 'session-gallery'
  | 'project-list'
  | 'create-project'
  | 'project-overview'   // W9 — project detail with session cards
  | 'session-list'       // W9 — full session history for a project
  | 'session-detail';    // W9 — historical session with all captures

/** Back-compat alias — older imports may still reference this name. */
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
  // Wk 8 (AQ5) — post-onboarding home is the project list, not the
  // dashboard. Dashboard is still reachable via the sidebar but it's
  // a metrics overview, not the right landing for "open / create a
  // project to start capturing".
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

      // Clear session context when navigating away from session pages.
      // Clear project context when navigating to top-level pages.
      const isSessionPage = page === 'session-intake' || page === 'session-gallery' || page === 'session-detail';
      const isProjectPage = isSessionPage || page === 'create-project' || page === 'project-list' || page === 'project-overview' || page === 'session-list';

      return {
        page,
        history: nextHistory,
        currentProjectId: isProjectPage
          ? (params?.projectId !== undefined ? params.projectId : s.currentProjectId)
          : null,
        currentSessionId: isSessionPage
          ? (params?.sessionId !== undefined ? params.sessionId : s.currentSessionId)
          : null,
      };
    }),

  goBack: () =>
    set((s) => {
      // TODO PH2-ROUTING: history doesn't restore params (projectId/sessionId).
      // Navigating back from a top-level page to a session page will lose context.
      // Fix requires storing params in the history stack — deferred to HashRouter migration.
      if (s.history.length === 0) {
        return { page: 'project-list', history: [] };
      }
      const previous = s.history[s.history.length - 1]!;
      return { page: previous, history: s.history.slice(0, -1) };
    }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}));
