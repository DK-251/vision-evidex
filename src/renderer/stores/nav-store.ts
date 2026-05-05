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
  | 'create-project';

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
      return {
        page,
        history: nextHistory,
        // Sticky params: caller must pass null explicitly to clear. Most
        // navigations only set one of the two, so leaving the other in
        // place lets the gallery page survive a "settings" detour.
        ...(params?.projectId !== undefined ? { currentProjectId: params.projectId } : {}),
        ...(params?.sessionId !== undefined ? { currentSessionId: params.sessionId } : {}),
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
