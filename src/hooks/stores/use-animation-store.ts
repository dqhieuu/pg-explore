/* eslint-disable @typescript-eslint/no-empty-function */
import { create } from "zustand";

interface AnimationStore {
  highlightSqlScratchpad: () => void;
  setHighlightSqlScratchpad: (delegate: () => void) => void;

  settingsDialogOpen: boolean;
  setSettingsDialogOpen: (open: boolean) => void;

  extensionsDialogOpen: boolean;
  setExtensionsDialogOpen: (open: boolean) => void;

  dropImportFileDialogOpen: boolean;
  setDropImportFileDialogOpen: (
    open: boolean,
    associatedFileId?: string,
  ) => void;

  fileIdToBeImportedTo?: string;
}

export const useAnimationStore = create<AnimationStore>((set) => ({
  highlightSqlScratchpad: () => {},
  setHighlightSqlScratchpad: (delegate) =>
    set({ highlightSqlScratchpad: delegate }),

  settingsDialogOpen: false,
  setSettingsDialogOpen: (open) => set({ settingsDialogOpen: open }),

  extensionsDialogOpen: false,
  setExtensionsDialogOpen: (open) => set({ extensionsDialogOpen: open }),

  dropImportFileDialogOpen: false,
  setDropImportFileDialogOpen: (open, associatedFileId) =>
    set({
      dropImportFileDialogOpen: open,
      fileIdToBeImportedTo: associatedFileId,
    }),
}));
