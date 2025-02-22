import Dexie, { EntityTable } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";

interface PGDatabase {
  id: string;
  name: string;
  createdAt: Date;
  lastOpened: Date;
}

interface FileEntry {
  id: string;
  databaseId: string;
  type: "sql" | "data";
  name: string;
  content?: string;
  blob?: Blob;
}

export const useAppDbLiveQuery = useLiveQuery;

export const appDb = new Dexie("pg-explore") as Dexie & {
  databases: EntityTable<PGDatabase, "id">;
  files: EntityTable<FileEntry, "id">;
};

appDb.version(1).stores({
  databases: "id",
  files: "id, databaseId",
});
