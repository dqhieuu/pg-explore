import { deleteDatabase } from "@/lib/dexie/dexie-utils.ts";
import { Modify } from "@/lib/ts-utils";
import { compareVersions } from "@/lib/utils.ts";
import Dexie, { Table } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";

export interface PGDatabase {
  id: string;
  name: string;
  createdAt: Date;
  lastOpened: Date;
  workflowState?: WorkflowState;
  enabledExtensions: string[];
  version: string;
}

export interface StepExecutionResult {
  type: string;
  index: number;
  result: "success" | "error" | "noop";
  error?: string;
}

export interface WorkflowState {
  schemaWorkflowId: string;
  dataWorkflowId: string;
  currentProgress: "dirty" | "schema-error" | "data-error" | "schema" | "data";
  stepsDone: number;
  stepResults: StepExecutionResult[];
}

export interface FileEntry {
  id: string;
  databaseId: string;
  type: "sql" | "dbml" | "table";
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

export type DbmlStep = Modify<
  CommonWorkflowStep,
  {
    type: "dbml";
    options: Record<string, never>;
  }
>;

export type DataTableStep = Modify<
  CommonWorkflowStep,
  {
    type: "table";
    options: {
      tableName: string;
    };
  }
>;

export type WorkflowStep = SqlQueryStep | DbmlStep | DataTableStep;

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

// New `enabledExtensions` field added in `databases`
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

// New `version` field added in `databases`
appDb.version(3).upgrade((tx) => {
  return tx
    .table("databases")
    .toCollection()
    .modify((db) => {
      if (db.version == null) {
        db.version = "16.4"; // Everything starts at 16.4
      }
    });
});

// New `stepResults` field added in `databases.workflowState`
appDb.version(4).upgrade((tx) => {
  return tx
    .table("databases")
    .toCollection()
    .modify((db) => {
      if (db.workflowState != null && db.workflowState.stepResults == null) {
        db.workflowState.stepResults = [];
      }
    });
});

// Upgrade Postgres 16.4 to 17.4
appDb.version(5).upgrade((tx) => {
  return tx
    .table("databases")
    .toCollection()
    .modify((db) => {
      if (compareVersions(db.version, "17.4") >= 0) return;

      db.version = "17.4";
      // Postgres breaks compatibility between major versions, so we just
      // casually delete all databases whose versions are < 17.4 for an easy upgrade path. ඞ
      // Actual reason: To migrate the pglite database from 16.4 to 17.4,
      // both npm packages v16.4 and v17.4 must be kept to make pg_dump usable.
      // (see https://web.archive.org/web/20250528185537/https://pglite.dev/docs/upgrade)
      // This makes our bundle size unreasonably larger (15MBx2).
      // Since we're in the early stages of development, we can afford to delete all incompatible databases
      // and start fresh so that we don't have to keep both versions of the package.
      deleteDatabase(db.id);
    });
});
