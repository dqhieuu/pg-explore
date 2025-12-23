import { Button } from "@/components/ui/button.tsx";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Toggle } from "@/components/ui/toggle.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useAnimationStore } from "@/hooks/stores/use-animation-store.ts";
import { useDockviewStore } from "@/hooks/stores/use-dockview-store.ts";
import { usePostgresStore } from "@/hooks/stores/use-postgres-store.ts";
import { useSettingsStore } from "@/hooks/stores/use-settings-store.ts";
import { appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db.ts";
import {
  createNewFile,
  getDatabaseFiles,
  getWorkflow,
} from "@/lib/dexie/dexie-utils.ts";
import { openWorkflowEditor } from "@/lib/dockview.ts";
import { cn, isEmptyOrSpaces, memDbId } from "@/lib/utils.ts";
import {
  indentMore,
  insertNewline,
  insertNewlineAndIndent,
  insertTab,
} from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { Prec } from "@codemirror/state";
import { EditorView, highlightWhitespace, keymap } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { produce } from "immer";
import { JSONPath } from "jsonpath-plus";
import {
  CircleAlert,
  CircleQuestionMark,
  PlusIcon,
  TrashIcon,
  WrapText,
  XIcon,
} from "lucide-react";
import Papa from "papaparse";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

function guessFileType(content: string) {
  content = content.trim();
  if (content.startsWith("{") || content.startsWith("[")) {
    return FileType.Json;
  } else if (content.includes("\t")) {
    return FileType.Tsv;
  }
  return FileType.Csv;
}

enum ImportStep {
  SelectFile,
  EnterData,
}

enum FileType {
  Csv = "csv",
  Tsv = "tsv",
  Json = "json",
}

interface ImportedFile {
  name: string;
  type: FileType;
  content: string;
  jsonPathQuery?: string;
}

interface FileImportResult {
  filename: string;
  success: boolean;
  message?: string;
  data: Record<string, string>[] | null;
}

interface FileImportError {
  filename: string;
  error: string;
}

export const DataTableFileImportDialogContent = () => {
  const dockviewApi = useDockviewStore((state) => state.dockviewApi);
  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;
  const theme = useSettingsStore((state) => state.resolvedTheme);
  const dataWorkflow = useAppDbLiveQuery(() =>
    getWorkflow(currentDbId, "data"),
  );
  const databaseFiles =
    useAppDbLiveQuery(() => getDatabaseFiles(currentDbId), [currentDbId]) ?? [];

  const setDropImportFileDialogOpen = useAnimationStore(
    (state) => state.setDropImportFileDialogOpen,
  );
  const associatedFileId = useAnimationStore(
    (state) => state.fileIdToBeImportedTo,
  );
  const associatedFile = useAppDbLiveQuery(
    () =>
      associatedFileId != null ? appDb.files.get(associatedFileId) : undefined,
    [associatedFileId],
  );

  const [currentImportStep, setCurrentImportStep] = useState<ImportStep>(
    ImportStep.SelectFile,
  );

  const dropZoneRef = useRef<HTMLLabelElement>(null);

  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [isWrapTextEnabled, setIsWrapTextEnabled] = useState(false);
  const [newTableName, setNewTableName] = useState("");

  const [importErrors, setImportErrors] = useState<FileImportError[]>([]);

  const currentFileContent = importedFiles[selectedFileIndex]?.content ?? "";
  const currentFileType =
    importedFiles[selectedFileIndex]?.type ?? FileType.Csv;

  const editorExtensions = [
    currentFileType === FileType.Json ? json() : null,
    isWrapTextEnabled ? EditorView.lineWrapping : null,
    currentFileType === FileType.Tsv ? highlightWhitespace() : null,
    Prec.highest(
      keymap.of([
        {
          key: "Enter",
          run: (view) => {
            if (currentFileType === FileType.Json) {
              insertNewlineAndIndent(view);
            } else {
              insertNewline(view);
            }
            return true;
          },
        },
        {
          key: "Tab",
          run: (view) => {
            if (currentFileType === FileType.Json) {
              indentMore(view);
            } else {
              insertTab(view);
            }
            return true;
          },
        },
      ]),
    ),
  ].filter((e) => e != null);

  const HiddenFileInput = () => (
    <input
      type="file"
      className="hidden"
      id="add-import-file"
      onChange={async (e) => {
        const files = e.target.files;
        if (files == null || files.length === 0) return;
        addFiles(files);
      }}
      multiple
    />
  );

  const addFiles = useCallback(
    async (files: FileList) => {
      const fileEntries = await Promise.all(
        [...files].map(async (file) => {
          const fileContent = await file.text();
          return {
            name: file.name,
            type: guessFileType(fileContent),
            content: fileContent,
          };
        }),
      );
      const updatedFiles = [...importedFiles, ...fileEntries];
      setImportedFiles(updatedFiles);
      if (currentImportStep === ImportStep.SelectFile) {
        setCurrentImportStep(ImportStep.EnterData);
      }
      setSelectedFileIndex(updatedFiles.length - 1);
    },
    [importedFiles, currentImportStep],
  );

  function addManualFile() {
    setImportedFiles([
      {
        name: "Manual input",
        type: FileType.Csv,
        content: "",
      },
    ]);
    setCurrentImportStep(ImportStep.EnterData);
  }

  async function importFiles() {
    if (dataWorkflow == null) return;

    const importResults = importedFiles.map((file) => {
      let data: Record<string, string>[] | null = null;
      let success = true;
      let message: string | undefined;

      try {
        switch (file.type) {
          case FileType.Csv:
            data = csvParseAsStringDictList(file.content);
            break;
          case FileType.Tsv:
            data = tsvParseAsStringDictList(file.content);
            break;
          case FileType.Json:
            data = jsonParseAsStringDictList(file.content, file.jsonPathQuery);
            break;
          default:
            success = false;
            message = "Unknown file type";
            break;
        }
      } catch (e) {
        success = false;
        message = (e as Error).message;
      }

      return {
        filename: file.name,
        success,
        message,
        data,
      } as FileImportResult;
    });

    const errorResults = importResults.filter((r) => !r.success);
    setImportErrors(
      errorResults.map((r) => ({
        filename: r.filename,
        error: r.message ?? "Unknown error",
      })),
    );

    if (errorResults.length > 0) return;
    const aggregatedRows = importResults
      .filter((r) => r.data != null)
      .flatMap((r) => r.data as Record<string, string>[]);
    if (associatedFile != null) {
      const currentFileRows = csvParseAsStringDictList(
        associatedFile.content ?? "",
      );
      const updatedFileContent = dictListToCsv([
        ...currentFileRows,
        ...aggregatedRows,
      ]);

      appDb.files.update(associatedFileId, {
        content: updatedFileContent,
      });
    } else {
      const newFileContent = dictListToCsv(aggregatedRows);

      const newFileId = await createNewFile(currentDbId, {
        type: "table",
        prefix: "Imported Data",
        existingFileNames: databaseFiles.map((f) => f.name),
        content: newFileContent,
      });

      await appDb.workflows.update(dataWorkflow.id, {
        workflowSteps: [
          ...dataWorkflow.workflowSteps,
          {
            type: "table",
            fileId: newFileId,
            options: {
              includeCreateTable: true,
              tableName: newTableName,
            },
          },
        ],
      });

      if (dockviewApi != null) {
        openWorkflowEditor(dockviewApi);
      }
    }

    setDropImportFileDialogOpen(false);
  }

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (dropZone === null) return;

    const dropHandler = (event: DragEvent) => {
      event.preventDefault();
      const files = event.dataTransfer?.files;
      if (files == null || files.length === 0) return;
      addFiles(files);
    };
    dropZone.addEventListener("drop", dropHandler);

    return () => {
      dropZone.removeEventListener("drop", dropHandler);
    };
  }, [addFiles]);

  return currentImportStep === ImportStep.SelectFile ? (
    <>
      <DialogHeader>
        <DialogTitle>Add your file to workflow</DialogTitle>
        <DialogDescription>
          Import your CSV/TSV/JSON data from a file into the workflow.
        </DialogDescription>
      </DialogHeader>

      <label
        className="text-muted-foreground hover:bg-muted/50 flex h-[min(15rem,calc(100vh-15rem))] w-[min(40rem,calc(100vw-5rem))] items-center justify-center rounded-2xl border-4 border-dashed text-center text-xl select-none"
        ref={dropZoneRef}
      >
        Drop your file here. Click to open file browser.
        <HiddenFileInput />
      </label>

      <div className="-mt-2 flex w-full flex-col items-center gap-2">
        <div className="text-muted-foreground">— OR —</div>
        <Button onClick={addManualFile}>Enter table data directly</Button>
      </div>
    </>
  ) : currentImportStep === ImportStep.EnterData ? (
    <>
      <DialogHeader>
        <DialogTitle>
          {associatedFile != null
            ? `Import data to file '${associatedFile.name}'`
            : "Import files as a new table"}
        </DialogTitle>
        <DialogDescription>
          Preview the contents of your file. You can edit the data here.
        </DialogDescription>
      </DialogHeader>
      <div className="@container w-[min(55rem,calc(100vw-5rem))]">
        <div className="flex h-[calc(100vh-10rem)] max-h-full flex-col gap-2 overflow-auto @xl:h-[min(30rem,calc(100vh-10rem))] @xl:flex-row">
          <div className="flex shrink-0 flex-col gap-3 @xl:w-[12rem]">
            <div className="mt-1 ml-2 font-medium">Files</div>
            <div className="overflow-y-auto">
              {importedFiles.map((file, index) => (
                <div
                  className={cn(
                    selectedFileIndex === index && "bg-primary/20",
                    "hover:bg-sidebar-accent flex w-full shrink-0 items-center justify-between gap-1 rounded-lg p-1 px-2 text-sm select-none",
                  )}
                  key={index}
                  onClick={() => setSelectedFileIndex(index)}
                  tabIndex={0}
                >
                  <div>{file.name}</div>
                  <button
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (importedFiles.length <= 1) {
                        setImportedFiles([]);
                        setCurrentImportStep(ImportStep.SelectFile);
                      } else {
                        if (index === selectedFileIndex) {
                          setSelectedFileIndex(index - 1);
                        }
                        setImportedFiles((prev) =>
                          prev.filter((_, i) => i !== index),
                        );
                      }
                    }}
                  >
                    <TrashIcon className="text-muted-foreground hover:text-destructive size-6 shrink-0 p-1" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              className="shrink-0 self-start"
              onClick={() =>
                document.getElementById("add-import-file")?.click()
              }
            >
              <PlusIcon /> Add files
            </Button>
            <HiddenFileInput />
          </div>
          <div className="flex flex-1 shrink-0 flex-col gap-2">
            <div className="flex shrink-0 items-center justify-between">
              <div className="flex items-center gap-2">
                <div>File type</div>
                <Select
                  value={currentFileType}
                  onValueChange={(value: FileType) => {
                    setImportedFiles((prev) =>
                      produce(prev, (draft) => {
                        draft[selectedFileIndex].type = value;
                      }),
                    );
                  }}
                >
                  <SelectTrigger className="w-[12rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (with header)</SelectItem>
                    <SelectItem value="tsv">TSV (with header)</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Toggle
                pressed={isWrapTextEnabled}
                onPressedChange={setIsWrapTextEnabled}
              >
                <WrapText />
              </Toggle>
            </div>
            <CodeMirror
              theme={theme}
              value={currentFileContent}
              onChange={(val) => {
                setImportedFiles((prev) =>
                  produce(prev, (draft) => {
                    draft[selectedFileIndex].content = val;
                  }),
                );
              }}
              extensions={[editorExtensions]}
              className="max-h-[30rem] min-h-[10rem] flex-1 overflow-auto"
              height="100%"
              width="100%"
            />
            {currentFileType === FileType.Json && (
              <div className="flex shrink-0 items-center gap-2">
                <div className="shrink-0">JSONPath selector</div>
                <Tooltip>
                  <TooltipContent>Example: $.items</TooltipContent>
                  <TooltipTrigger asChild>
                    <a
                      href="https://github.com/JSONPath-Plus/JSONPath?tab=readme-ov-file#syntax-through-examples"
                      target="_blank"
                      className="-ml-1"
                    >
                      <CircleQuestionMark size={14}></CircleQuestionMark>
                    </a>
                  </TooltipTrigger>
                </Tooltip>
                <Input
                  placeholder="Optional. Leave empty to import all objects."
                  value={importedFiles[selectedFileIndex].jsonPathQuery}
                  onChange={(e) => {
                    setImportedFiles((prev) =>
                      produce(prev, (draft) => {
                        draft[selectedFileIndex].jsonPathQuery = e.target.value;
                      }),
                    );
                  }}
                />
              </div>
            )}
            <div className="flex shrink-0 items-center justify-between gap-2">
              {associatedFile == null && (
                <>
                  <div className="shrink-0">New table name</div>
                  <Input
                    placeholder="Auto-generated if unfilled"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                  />
                </>
              )}
              <Button className="shrink-0" onClick={importFiles}>
                Import
              </Button>
            </div>
            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>Failed to import files!</AlertTitle>
                <Button
                  variant="ghost"
                  className="text-muted-foreground absolute top-1 right-2 size-6 hover:bg-transparent"
                  onClick={() => setImportErrors([])}
                >
                  <XIcon />
                </Button>
                <AlertDescription className="flex h-full max-h-[10rem] flex-col overflow-auto">
                  {importErrors.map((error, index) => (
                    <div key={index} className="shrink-0">
                      <span className="font-medium">{error.filename}</span>
                      <span> - {error.error}</span>
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </>
  ) : null;
};

type JsonValueType = object | number | string | boolean | null;
/**
 * Parse a valid JSON string into a Record<string, string>[].
 * @param text
 * @param jsonPathQuery
 */
function jsonParseAsStringDictList(text: string, jsonPathQuery?: string) {
  const parsed = JSON.parse(text);
  if (typeof parsed !== "object" || parsed == null) {
    throw new Error("JSON is not an object.");
  }
  let filteredByPath = parsed as JsonValueType;
  if (!isEmptyOrSpaces(jsonPathQuery)) {
    filteredByPath = JSONPath<JsonValueType>({
      path: jsonPathQuery!,
      json: parsed,
    });
  }

  if (typeof filteredByPath !== "object" || filteredByPath == null) {
    throw new Error("JSONPath query does not return an object.");
  }

  let result;
  if (!Array.isArray(filteredByPath)) {
    // If the parsed result is not an array, wrap it in an array.
    result = [filteredByPath] as Record<string, JsonValueType>[];
  } else {
    for (const item of filteredByPath) {
      if (typeof item !== "object") {
        throw new Error("JSON array contains non-object values.");
      }
    }
    result = filteredByPath as Record<string, JsonValueType>[];
  }

  for (const item of result) {
    if (Object.hasOwn(item, "")) {
      item["[EMPTY]"] = item[""];
      delete item[""];
    }
  }

  // For each dict in the array, convert each key to string.
  return result.map((dict) => {
    return Object.fromEntries(
      Object.entries(dict).map(([key, value]) => {
        let resultValue;
        if (value == null) {
          resultValue = "null";
        } else if (typeof value === "object") {
          resultValue = JSON.stringify(value);
        } else {
          resultValue = value.toString();
        }
        return [key, resultValue];
      }),
    );
  });
}

function csvParseAsStringDictList(
  text: string,
  delimiter = ",",
  trimText = true,
) {
  const parsed = Papa.parse(trimText ? text.trim() : text, {
    header: true,
    delimiter,
  });
  if (parsed.errors.length > 0) {
    const errorMsg = parsed.errors
      .map((e) => `${e.row != null ? `Row ${e.row + 1}:` : ""} ${e.message}`)
      .join("--");
    throw new Error(errorMsg);
  }
  if (parsed.meta.fields != null && parsed.meta.fields.includes("")) {
    throw new Error("Empty column names are not allowed.");
  }
  return parsed.data as Record<string, string>[];
}

function tsvParseAsStringDictList(text: string) {
  // Remove leading and trailing newlines.
  // Note that we don't use trim() here because it will also remove tabs, which we don't want.
  text = text.replace(/^[\r\n]+/, "").replace(/[\r\n]+$/, "");
  return csvParseAsStringDictList(text, "\t", false);
}

function dictListToCsv(dicts: Record<string, string>[]) {
  if (dicts.length === 0) return "";

  const dictsWithFirstObjectContainingAllKeys = produce(dicts, (draft) => {
    const allKeys = new Set<string>();
    for (const dict of draft) {
      for (const key in dict) {
        allKeys.add(key);
      }
    }
    for (const key of allKeys) {
      if (!Object.hasOwn(draft[0], key)) {
        draft[0][key] = "";
      }
    }
  });
  // Papa.unparse() determines the column names from the first object.
  return Papa.unparse(dictsWithFirstObjectContainingAllKeys);
}
