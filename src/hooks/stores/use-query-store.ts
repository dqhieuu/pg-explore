import { produce } from "immer";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface QueryResult {
  fields: { name: string; dataTypeId: number }[];
  rows: Record<string, unknown>[];
  affectedRows: number;
}

type ContextId = string;
type EditorValue = string;
interface QueryStore {
  queryEditors: Record<ContextId, EditorValue>;
  queryEditorsSaved: Record<ContextId, boolean>;
  queryEditorsShouldSave: Record<ContextId, boolean>;

  queryResults: Record<ContextId, (string | QueryResult)[]>;
  setQueryResult: (contextId: string, result: (QueryResult | string)[]) => void;

  setQueryEditorValue: (
    contextId: string,
    value: string,
    isSaved?: boolean,
  ) => void;

  setQueryEditorShouldSave: (contextId: string, shouldSave: boolean) => void;

  // Unlike other stores, saving query editors value to the database is resource intensive.
  // Therefore, we signal saving asynchrnously instead of syncing browser state with the database.
  signalSaveQueryEditors: (contextIds?: string[]) => void;
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
        }),
      ),

    setQueryEditorShouldSave: (contextId, shouldSave) =>
      set(
        produce((state) => {
          state.queryEditorsShouldSave[contextId] = shouldSave;
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
