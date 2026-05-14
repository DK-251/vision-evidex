// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { useNavStore } from '../src/renderer/stores/nav-store';

/**
 * Pure Zustand store — no rendering, no IPC.
 *
 * Updated pre-Phase 3 audit pass (NAV-NEW-01):
 *   - navigate to 'project-overview' no longer clears currentSessionId.
 *     Only pages completely outside the project tree (dashboard, settings)
 *     should clear it.
 *   - The existing tests are unchanged in intent; one new describe block
 *     covers the NAV-NEW-01 behaviour.
 */

beforeEach(() => {
  useNavStore.setState({
    page: 'project-list',
    currentProjectId: null,
    currentSessionId: null,
    history: [],
    sidebarCollapsed: false,
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
      expect(useNavStore.getState().history).toContain('project-list');
    });

    it('caps history at 10 entries — oldest dropped', () => {
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
      useNavStore.getState().navigate('session-intake', { projectId: 'proj_C' });
      expect(useNavStore.getState().currentProjectId).toBe('proj_C');
      // sessionId preserved because session-intake is a session page
      expect(useNavStore.getState().currentSessionId).toBe('sess_B');
    });

    it('navigating to a top-level page clears both projectId and sessionId', () => {
      useNavStore.getState().navigate('session-gallery', {
        projectId: 'proj_A', sessionId: 'sess_B',
      });
      // 'settings' is outside the project tree — clears everything
      useNavStore.getState().navigate('settings');
      expect(useNavStore.getState().currentProjectId).toBeNull();
      expect(useNavStore.getState().currentSessionId).toBeNull();
    });
  });

  // NAV-NEW-01: project-overview must NOT clear currentSessionId.
  describe('NAV-NEW-01 — project-overview preserves currentSessionId', () => {
    it('navigating from session-gallery to project-overview keeps sessionId', () => {
      useNavStore.getState().navigate('session-gallery', {
        projectId: 'proj_A', sessionId: 'sess_B',
      });
      // User clicks the Sessions sidebar item → navigates to project-overview
      useNavStore.getState().navigate('project-overview', { projectId: 'proj_A' });

      expect(useNavStore.getState().currentProjectId).toBe('proj_A');
      // sessionId must NOT have been wiped
      expect(useNavStore.getState().currentSessionId).toBe('sess_B');
    });

    it('navigating through project-overview then back to gallery still has sessionId', () => {
      useNavStore.getState().navigate('session-gallery', {
        projectId: 'proj_A', sessionId: 'sess_B',
      });
      useNavStore.getState().navigate('project-overview', { projectId: 'proj_A' });
      useNavStore.getState().navigate('session-gallery', { projectId: 'proj_A' });

      expect(useNavStore.getState().currentSessionId).toBe('sess_B');
    });

    it('project-level pages (project-settings, session-list) also preserve sessionId', () => {
      useNavStore.getState().navigate('session-gallery', {
        projectId: 'proj_A', sessionId: 'sess_B',
      });
      useNavStore.getState().navigate('project-settings', { projectId: 'proj_A' });
      expect(useNavStore.getState().currentSessionId).toBe('sess_B');

      useNavStore.getState().navigate('session-list', { projectId: 'proj_A' });
      expect(useNavStore.getState().currentSessionId).toBe('sess_B');
    });

    it('only dashboard and settings clear sessionId', () => {
      useNavStore.getState().navigate('session-gallery', {
        projectId: 'proj_A', sessionId: 'sess_B',
      });

      // dashboard clears
      useNavStore.getState().navigate('dashboard');
      expect(useNavStore.getState().currentSessionId).toBeNull();

      // go back to a session
      useNavStore.getState().navigate('session-gallery', {
        projectId: 'proj_A', sessionId: 'sess_B',
      });

      // settings clears
      useNavStore.getState().navigate('settings');
      expect(useNavStore.getState().currentSessionId).toBeNull();
    });
  });

  describe('goBack()', () => {
    it('restores the previous page from history', () => {
      useNavStore.getState().navigate('settings');
      useNavStore.getState().goBack();
      expect(useNavStore.getState().page).toBe('project-list');
    });

    it('reduces history length by 1 on each call', () => {
      useNavStore.getState().navigate('settings');
      useNavStore.getState().navigate('session-intake', { projectId: 'proj_01TEST' });
      const lenBefore = useNavStore.getState().history.length;
      useNavStore.getState().goBack();
      expect(useNavStore.getState().history.length).toBe(lenBefore - 1);
    });

    it('navigates to project-list when history is empty', () => {
      useNavStore.getState().goBack();
      expect(useNavStore.getState().page).toBe('project-list');
      expect(useNavStore.getState().history).toEqual([]);
    });

    it('repeated goBack drains history without throwing', () => {
      useNavStore.getState().navigate('settings');
      useNavStore.getState().goBack();
      useNavStore.getState().goBack();
      useNavStore.getState().goBack();
      expect(useNavStore.getState().page).toBe('project-list');
    });
  });

  describe('back-compat ShellPage alias', () => {
    it('dashboard is reachable as a Page value', () => {
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

  describe('sidebar collapse state', () => {
    it('toggleSidebar flips sidebarCollapsed', () => {
      const before = useNavStore.getState().sidebarCollapsed;
      useNavStore.getState().toggleSidebar();
      expect(useNavStore.getState().sidebarCollapsed).toBe(!before);
    });
  });
});
