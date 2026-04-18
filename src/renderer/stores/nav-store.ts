import { create } from 'zustand';

export type ShellPage = 'dashboard' | 'settings';

interface NavState {
  page: ShellPage;
  sidebarCollapsed: boolean;
  goTo: (page: ShellPage) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useNavStore = create<NavState>()((set) => ({
  page: 'dashboard',
  sidebarCollapsed: false,
  goTo: (page) => set({ page }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}));
