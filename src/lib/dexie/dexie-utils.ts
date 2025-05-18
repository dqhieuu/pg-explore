import { guid, nextIncrementedFilename } from "../utils";
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
