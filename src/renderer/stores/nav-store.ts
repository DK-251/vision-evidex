import { create } from 'zustand';

/**
 * Minimal renderer navigation store.
 *
 * Phase 1 Wk5 D24: the shell has three destinations — the onboarding
 * wizard, the dashboard, and the app-settings page. Full React-Router
 * infrastructure lands in Phase 2 when deeper navigation arrives. For
 * now an enum-style current-page state + goTo action is enough.
 */

export type ShellPage = 'dashboard' | 'settings';

interface NavState {
  page: ShellPage;
  goTo: (page: ShellPage) => void;
}

export const useNavStore = create<NavState>()((set) => ({
  page: 'dashboard',
  goTo: (page) => set({ page }),
}));
