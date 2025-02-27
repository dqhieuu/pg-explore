/* eslint-disable @typescript-eslint/no-empty-function */
import { create } from "zustand";

interface AnimationStore {
  highlightSqlScratchpad: () => void;
  setHighlightSqlScratchpad: (delegate: () => void) => void;
}

export const useAnimationStore = create<AnimationStore>((set) => ({
  highlightSqlScratchpad: () => {},
  setHighlightSqlScratchpad: (delegate) =>
    set({ highlightSqlScratchpad: delegate }),
}));
