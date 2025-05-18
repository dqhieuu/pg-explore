import { Modify } from "@/lib/ts-utils";
import { MEM_DB_PREFIX } from "@/lib/utils.ts";
import Dexie, { Table } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";

export interface PGDatabase {
  id: string;
  name: string;
  createdAt: Date;
  lastOpened: Date;
  workflowState?: WorkflowState;
  enabledExtensions: string[];
}

export interface WorkflowState {
  schemaWorkflowId: string;
  dataWorkflowId: string;
  currentProgress: "dirty" | "schema-error" | "data-error" | "schema" | "data";
  stepsDone: number;
}

export interface FileEntry {
  id: string;
  databaseId: string;
  type: "sql" | "dbml";
  name: string;
  content?: string;
  blob?: Blob;
}

export interface WorkflowSection {
  id: string;
  databaseId: string;
  type: "schema" | "data";
  name: string;
  workflowSteps: WorkflowStep[];
}

interface CommonWorkflowStep {
  type: string;
  fileId?: string;
  options: Record<string, unknown>;
}

export type SqlQueryStep = Modify<
  CommonWorkflowStep,
  {
    type: "sql-query";
    options: Record<string, never>;
  }
>;

type DbmlStep = Modify<
  CommonWorkflowStep,
  {
    type: "dbml";
    options: Record<string, never>;
  }
>;

export type WorkflowStep = SqlQueryStep | DbmlStep;

interface AppSession {
  id: string;
  expirationDate: Date;
}

export const useAppDbLiveQuery = useLiveQuery;

export const appDb = new Dexie("pg-explore") as Dexie & {
  databases: Table<PGDatabase>;
  files: Table<FileEntry>;
  workflows: Table<WorkflowSection>;
  sessions: Table<AppSession>;
};

appDb.version(1).stores({
  databases: "id",
  files: "id, databaseId",
  workflows: "id, databaseId",
  sessions: "id, expirationDate",
});

// New `enabledExtensions` field added `databases`
appDb.version(2).upgrade((tx) => {
  return tx
    .table("databases")
    .toCollection()
    .modify((db) => {
      if (db.enabledExtensions == null) {
        db.enabledExtensions = [];
      }
    });
});

export const getNonMemoryDatabases = () =>
  appDb.databases.filter((db) => !db.id.startsWith(MEM_DB_PREFIX)).toArray();
