import { create } from 'zustand';

interface AppState {
  colorMode: 'light' | 'dark';
  setColorMode: (mode: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>((set) => ({
  colorMode: (localStorage.getItem('kibana-proto-color-mode') as 'light' | 'dark') || 'light',
  setColorMode: (mode) => {
    localStorage.setItem('kibana-proto-color-mode', mode);
    set({ colorMode: mode });
  },
}));
