import { create } from "zustand";

interface UIState {
  theme: "dark" | "light";
  sidebarCollapsed: boolean;

  // Stored as string[] | null — Sets are not safely serialisable in Zustand
  execSelectedCustIds: string[] | null; // null = all
  dashSelectedBuIds: string[] | null;
  dashSelectedGroupIds: string[] | null;
  dashSelectedTechIds: string[] | null;

  setTheme: (t: "dark" | "light") => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setExecSelectedCustIds: (ids: string[] | null) => void;
  setDashSelectedBuIds: (ids: string[] | null) => void;
  setDashSelectedGroupIds: (ids: string[] | null) => void;
  setDashSelectedTechIds: (ids: string[] | null) => void;
  resetDashFilters: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "dark",
  sidebarCollapsed: false,
  execSelectedCustIds: null,
  dashSelectedBuIds: null,
  dashSelectedGroupIds: null,
  dashSelectedTechIds: null,

  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setExecSelectedCustIds: (ids) => set({ execSelectedCustIds: ids }),
  setDashSelectedBuIds: (ids) => set({ dashSelectedBuIds: ids }),
  setDashSelectedGroupIds: (ids) => set({ dashSelectedGroupIds: ids }),
  setDashSelectedTechIds: (ids) => set({ dashSelectedTechIds: ids }),

  resetDashFilters: () =>
    set({
      dashSelectedBuIds: null,
      dashSelectedGroupIds: null,
      dashSelectedTechIds: null,
    }),
}));
