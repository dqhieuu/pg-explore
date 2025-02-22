import { produce } from "immer";
import { create } from "zustand";

export interface QueryResult {
  fields: { name: string; dataTypeId: number }[];
  rows: object[];
  affectedRows: number;
}

interface QueryStore {
  queryResults: Record<string, QueryResult[]>;
  queryResultLots: Record<string, boolean[]>;

  queryEditors: Record<string, string>;
  setQueryResult: (contextId: string, result: (QueryResult | string)[]) => void;
  setQueryEditor: (contextId: string, editor: string) => void;
  allotQueryResult: (contextId: string, lotNumber: number) => void;
  unallotQueryResult: (contextId: string, lotNumber: number) => void;
}

export const useQueryStore = create<QueryStore>((set) => ({
  queryResults: {},
  queryEditors: {},
  queryResultLots: {},
  setQueryResult: (contextId, result) =>
    set(
      produce((state) => {
        state.queryResults[contextId] = result;
      }),
    ),

  allotQueryResult: (contextId, lotNumber) =>
    set(
      produce((state) => {
        if (state.queryResultLots[contextId] == null) {
          state.queryResultLots[contextId] = [];
        }

        state.queryResultLots[contextId][lotNumber] = true;
      }),
    ),

  unallotQueryResult: (contextId, lotNumber) =>
    set(
      produce((state) => {
        state.queryResultLots[contextId][lotNumber] = false;
      }),
    ),

  setQueryEditor: (contextId, editor) =>
    set(
      produce((state) => {
        state.queryEditors[contextId] = editor;
      }),
    ),
}));
