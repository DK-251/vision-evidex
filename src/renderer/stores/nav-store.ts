import { create } from 'zustand';

export type ShellPage = 'dashboard' | 'settings';

interface NavState {
  page: ShellPage;
  goTo: (page: ShellPage) => void;
}

export const useNavStore = create<NavState>()((set) => ({
  page: 'dashboard',
  goTo: (page) => set({ page }),
}));
