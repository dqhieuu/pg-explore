import { DockviewApi } from "dockview";
import { create } from "zustand";

interface DockviewStore {
  dockviewApi: null | DockviewApi;
  setDockviewApi: (api: DockviewApi) => void;
}

export const useDockviewStore = create<DockviewStore>((set) => ({
  dockviewApi: null,
  setDockviewApi: (api: DockviewApi) => set({ dockviewApi: api }),
}));
