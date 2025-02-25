import { produce } from "immer";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface QueryResult {
  fields: { name: string; dataTypeId: number }[];
  rows: Record<string, unknown>[];
  affectedRows: number;
}

interface QueryStore {
  queryEditors: Record<string, string>;
  queryEditorsSaved: Record<string, boolean>;
  queryEditorsShouldSave: Record<string, boolean>;

  queryResults: Record<string, (string | QueryResult)[]>;

  signalSaveQueryEditors: (contextIds?: string[]) => void;
  setQueryResult: (contextId: string, result: (QueryResult | string)[]) => void;
  setQueryEditorValue: (
    contextId: string,
    value: string,
    isSaved?: boolean,
  ) => void;
}

export const useQueryStore = create<QueryStore>()(
  devtools((set) => ({
    queryEditors: {},
    queryEditorsSaved: {},
    queryEditorsShouldSave: {},

    queryResults: {},

    setQueryResult: (contextId, result) =>
      set(
        produce<QueryStore>((state) => {
          state.queryResults[contextId] = result;
        }),
      ),

    setQueryEditorValue: (contextId, value, isSaved = false) =>
      set(
        produce<QueryStore>((state) => {
          state.queryEditors[contextId] = value;
          state.queryEditorsSaved[contextId] = isSaved;
          state.queryEditorsShouldSave[contextId] = false;
        }),
      ),

    signalSaveQueryEditors: (contextIds) =>
      set(
        produce((state) => {
          if (contextIds == null) {
            contextIds = Object.entries(state.queryEditorsSaved)
              .filter(([, isSaved]) => !isSaved)
              .map(([contextId]) => contextId);
          }

          contextIds.forEach((contextId) => {
            state.queryEditorsShouldSave[contextId] = true;
          });
        }),
      ),
  })),
);
