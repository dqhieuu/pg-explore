import Dexie from "dexie";

import { MEM_DB_PREFIX, guid, nextIncrementedFilename } from "../utils";
import { FileEntry, appDb } from "./app-db";

interface PrefixOption {
  existingFileNames?: string[];
  prefix: string;
}

interface FilenameOption {
  filename: string;
}

interface FileInfo {
  type: FileEntry["type"];
  content?: string;
}

/**
 * Create a new file for the given database
 * @param databaseId
 * @param options Filename or prefix
 * @returns Promise of the new file id
 */
export function createNewFile(
  databaseId: string,
  options: FileInfo & (PrefixOption | FilenameOption),
) {
  let filename;
  if ("filename" in options) {
    filename = options.filename;
  } else if ("prefix" in options) {
    const existingFileNames = options.existingFileNames ?? [];
    filename = nextIncrementedFilename(options.prefix, existingFileNames);
  }

  filename ??= "Untitled file";

  return appDb.files.add({
    id: guid(),
    databaseId,
    type: options.type,
    name: filename,
    content: options.content,
  }) as Promise<string>;
}

export const getNonMemoryDatabases = () =>
  appDb.databases.filter((db) => !db.id.startsWith(MEM_DB_PREFIX)).toArray();

export const getWorkflow = (dbId: string, type: "schema" | "data") =>
  appDb.workflows
    .where("databaseId")
    .equals(dbId)
    .and((wf) => wf.type === type)
    .first();

export const getDatabaseFiles = (dbId: string) =>
  appDb.files.where("databaseId").equals(dbId).toArray();

/**
 * Deletes the internal database files stored in IndexedDB.
 * @param dbId
 */
export const deleteDatabase = (dbId: string) => {
  return Dexie.delete(`/pglite/pg_${dbId}`);
};
