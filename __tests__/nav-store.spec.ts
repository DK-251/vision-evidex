// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { useNavStore } from '../src/renderer/stores/nav-store';

/**
 * Pure Zustand store — no rendering, no IPC. The store extension landed
 * in Phase 2 Wk 7 D34 (session-intake / session-gallery + history stack).
 * The PH2-ROUTING migration to react-router will replace this file's
 * concerns; until then these tests lock the dispatch model behaviour.
 */

beforeEach(() => {
  // Wk 8 (AQ5) — post-onboarding home is now the project list. The
  // tests below that exercise navigate / goBack against 'dashboard'
  // are unchanged in shape; the reset target moves with the home.
  useNavStore.setState({
    page: 'project-list',
    currentProjectId: null,
    currentSessionId: null,
    history: [],
  });
});

describe('useNavStore', () => {

  describe('navigate()', () => {
    it('changes page to the target page', () => {
      useNavStore.getState().navigate('settings');
      expect(useNavStore.getState().page).toBe('settings');
    });

    it('sets currentProjectId when projectId param is provided', () => {
      useNavStore.getState().navigate('session-intake', { projectId: 'proj_01TEST' });
      expect(useNavStore.getState().currentProjectId).toBe('proj_01TEST');
    });

    it('sets currentSessionId when sessionId param is provided', () => {
      useNavStore.getState().navigate('session-gallery', {
        projectId: 'proj_01TEST', sessionId: 'sess_01TEST',
      });
      expect(useNavStore.getState().currentSessionId).toBe('sess_01TEST');
    });

    it('navigating to session-gallery sets BOTH projectId and sessionId', () => {
      useNavStore.getState().navigate('session-gallery', {
        projectId: 'proj_A', sessionId: 'sess_B',
      });
      const s = useNavStore.getState();
      expect(s.currentProjectId).toBe('proj_A');
      expect(s.currentSessionId).toBe('sess_B');
    });

    it('pushes the previous page onto the history stack', () => {
      useNavStore.getState().navigate('settings');
      // beforeEach seeds 'project-list' as the current page; navigate
      // pushes that onto history before flipping to 'settings'.
      expect(useNavStore.getState().history).toContain('project-list');
    });

    it('caps history at 10 entries — oldest dropped', () => {
      // 12 navigations should leave history at length 10
      const pages: ('settings' | 'dashboard')[] =
        ['settings','dashboard','settings','dashboard','settings','dashboard',
         'settings','dashboard','settings','dashboard','settings','dashboard'];
      pages.forEach((p) => useNavStore.getState().navigate(p));
      expect(useNavStore.getState().history.length).toBeLessThanOrEqual(10);
    });

    it('preserves previous params when only one is provided', () => {
      useNavStore.getState().navigate('session-gallery', {
        projectId: 'proj_A', sessionId: 'sess_B',
      });
      // Navigating with only projectId leaves sessionId in place (sticky).
      useNavStore.getState().navigate('session-intake', { projectId: 'proj_C' });
      expect(useNavStore.getState().currentProjectId).toBe('proj_C');
      expect(useNavStore.getState().currentSessionId).toBe('sess_B');
    });
  });

  describe('goBack()', () => {
    it('restores the previous page from history', () => {
      useNavStore.getState().navigate('settings');
      useNavStore.getState().goBack();
      // Wk 8 home (AQ5) is the seed page in beforeEach.
      expect(useNavStore.getState().page).toBe('project-list');
    });

    it('reduces history length by 1 on each call', () => {
      useNavStore.getState().navigate('settings');
      useNavStore.getState().navigate('session-intake', { projectId: 'proj_01TEST' });
      const lenBefore = useNavStore.getState().history.length;
      useNavStore.getState().goBack();
      expect(useNavStore.getState().history.length).toBe(lenBefore - 1);
    });

    it('navigates to project-list (Wk 8 home) when history is empty', () => {
      // history empty from beforeEach
      useNavStore.getState().goBack();
      expect(useNavStore.getState().page).toBe('project-list');
      expect(useNavStore.getState().history).toEqual([]);
    });

    it('repeated goBack drains history without throwing', () => {
      useNavStore.getState().navigate('settings');
      useNavStore.getState().goBack();
      useNavStore.getState().goBack(); // already at project-list, history empty
      useNavStore.getState().goBack();
      expect(useNavStore.getState().page).toBe('project-list');
    });
  });

  describe('back-compat ShellPage alias', () => {
    it('dashboard is reachable as a Page value', () => {
      useNavStore.getState().navigate('settings');
      useNavStore.getState().navigate('dashboard');
      expect(useNavStore.getState().page).toBe('dashboard');
    });
    it('settings is reachable as a Page value', () => {
      useNavStore.getState().navigate('settings');
      expect(useNavStore.getState().page).toBe('settings');
    });
    it('session-intake and session-gallery are reachable Page values', () => {
      useNavStore.getState().navigate('session-intake', { projectId: 'proj_X' });
      expect(useNavStore.getState().page).toBe('session-intake');
      useNavStore.getState().navigate('session-gallery', {
        projectId: 'proj_X', sessionId: 'sess_Y',
      });
      expect(useNavStore.getState().page).toBe('session-gallery');
    });
  });

  describe('sidebar collapse state (existing field — back-compat sanity)', () => {
    it('toggleSidebar flips sidebarCollapsed', () => {
      const before = useNavStore.getState().sidebarCollapsed;
      useNavStore.getState().toggleSidebar();
      expect(useNavStore.getState().sidebarCollapsed).toBe(!before);
    });
  });
});
