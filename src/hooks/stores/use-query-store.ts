import { produce } from "immer";
import { create } from "zustand";

export interface QueryResult {
  fields: { name: string; dataTypeId: number }[];
  rows: object[];
  affectedRows: number;
}

interface QueryStore {
  queryResults: Record<string, QueryResult[]>;
  queryResultPanelLots: Record<string, boolean[]>;

  queryEditors: Record<string, string>;
  setQueryResult: (contextId: string, result: (QueryResult | string)[]) => void;
  setQueryEditor: (contextId: string, editor: string) => void;
  allotQueryResultPanel: (contextId: string, lotNumber: number) => void;
  unallotQueryResultPanel: (contextId: string, lotNumber: number) => void;
}

export const useQueryStore = create<QueryStore>((set) => ({
  queryResults: {},
  queryEditors: {},
  queryResultPanelLots: {},
  setQueryResult: (contextId, result) =>
    set(
      produce((state) => {
        state.queryResults[contextId] = result;
      }),
    ),

  allotQueryResultPanel: (contextId, lotNumber) =>
    set(
      produce((state) => {
        if (state.queryResultPanelLots[contextId] == null) {
          state.queryResultPanelLots[contextId] = [];
        }

        state.queryResultPanelLots[contextId][lotNumber] = true;
      }),
    ),

  unallotQueryResultPanel: (contextId, lotNumber) =>
    set(
      produce((state) => {
        state.queryResultPanelLots[contextId][lotNumber] = false;
      }),
    ),

  setQueryEditor: (contextId, editor) =>
    set(
      produce((state) => {
        state.queryEditors[contextId] = editor;
      }),
    ),
}));
