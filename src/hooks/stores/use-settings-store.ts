import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
  theme: "auto" | "dark" | "light";
  setTheme: (theme: "auto" | "dark" | "light") => void;

  editorShowAccurateSQLError: boolean;
  setEditorShowAccurateSQLError: (show: boolean) => void;

  useCustomAIEndpoint: boolean;
  setUseCustomAIEndpoint: (show: boolean) => void;
  customAIEndpointUrl: string;
  setCustomAIEndpointUrl: (url: string) => void;
  customAIEndpointKey: string;
  setCustomAIEndpointKey: (key: string) => void;
  customAIEndpointModel: string;
  setCustomAIEndpointModel: (model: string) => void;

  debugMode: boolean;
  setDebugMode: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),

      editorShowAccurateSQLError: false,
      setEditorShowAccurateSQLError: (show) =>
        set({ editorShowAccurateSQLError: show }),

      useCustomAIEndpoint: false,
      setUseCustomAIEndpoint: (show) => set({ useCustomAIEndpoint: show }),
      customAIEndpointUrl: "",
      setCustomAIEndpointUrl: (url) => set({ customAIEndpointUrl: url }),
      customAIEndpointKey: "",
      setCustomAIEndpointKey: (key) => set({ customAIEndpointKey: key }),
      customAIEndpointModel: "",
      setCustomAIEndpointModel: (model) =>
        set({ customAIEndpointModel: model }),

      debugMode: false,
      setDebugMode: (show) => set({ debugMode: show }),
    }),
    {
      name: "settings-storage",
    },
  ),
);
