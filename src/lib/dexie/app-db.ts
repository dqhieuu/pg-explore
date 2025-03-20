import { Modify } from "@/lib/ts-utils";
import Dexie, { Table } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";

interface PGDatabase {
  id: string;
  name: string;
  createdAt: Date;
  lastOpened: Date;
  workflowState?: WorkflowState;
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
  type: "sql" | "data";
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

export type SQLQueryStep = Modify<
  CommonWorkflowStep,
  {
    type: "sql-query";
    options: Record<string, never>;
  }
>;

// @ts-expect-error TODO: Implement this
type DbmlDataStep = Modify<
  CommonWorkflowStep,
  {
    type: "dbml-data";
    options: Record<string, never>;
  }
>;

// @ts-expect-error TODO: Implement this
type DrawDbDataStep = Modify<
  CommonWorkflowStep,
  {
    type: "drawdb-data";
    options: Record<string, never>;
  }
>;

// @ts-expect-error TODO: Implement this
type JsonDataStep = Modify<
  CommonWorkflowStep,
  {
    type: "json-data";
    options: Record<string, never>;
  }
>;

// @ts-expect-error TODO: Implement this
type CsvDataStep = Modify<
  CommonWorkflowStep,
  {
    type: "csv-data";
    options: Record<string, never>;
  }
>;

export type WorkflowStep = SQLQueryStep;

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
