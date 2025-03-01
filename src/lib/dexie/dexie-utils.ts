import { guid, nextIncrementedFilename } from "../utils";
import { appDb } from "./app-db";

interface PrefixOption {
  existingFileNames?: string[];
  prefix: string;
}

interface FilenameOption {
  filename: string;
}

interface FileContent {
  content?: string;
}

/**
 * Create a new file for the given database
 * @param databaseId
 * @param option Filename or prefix
 * @returns Promise of the new file id
 */
export function createNewFile(
  databaseId: string,
  option: (PrefixOption | FilenameOption) & FileContent,
) {
  let filename;
  if ("filename" in option) {
    filename = option.filename;
  } else if ("prefix" in option) {
    const existingFileNames = option.existingFileNames ?? [];
    filename = nextIncrementedFilename(option.prefix, existingFileNames);
  }

  filename ??= "Untitled file";

  return appDb.files.add({
    id: guid(),
    databaseId,
    type: "sql",
    name: filename,
    content: option.content,
  }) as Promise<string>;
}
