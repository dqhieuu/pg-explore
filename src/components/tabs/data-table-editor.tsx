import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useDockviewStore } from "@/hooks/stores/use-dockview-store.ts";
import { useQueryStore } from "@/hooks/stores/use-query-store.ts";
import { useSettingsStore } from "@/hooks/stores/use-settings-store.ts";
import { appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db.ts";
import { nextIncrementedNames } from "@/lib/utils.ts";
import { HotTable, HotTableRef } from "@handsontable/react-wrapper";
import { MenuItemConfig } from "handsontable/plugins/contextMenu";
import { produce } from "immer";
import { ChevronDown, GripHorizontal, SaveIcon, Undo2 } from "lucide-react";
import Papa from "papaparse";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface DataTableEditorProps {
  contextId: string;
  fileId: string;
}
export function DataTableEditor({ contextId, fileId }: DataTableEditorProps) {
  // region Hooks
  const associatedFile = useAppDbLiveQuery(() => appDb.files.get(fileId));
  const prevAssociatedFile = useRef(associatedFile);

  const dockviewApi = useDockviewStore((state) => state.dockviewApi);

  const queryEditorValue =
    useQueryStore((state) => state.queryEditors[contextId]) ?? "";
  const setQueryEditorValue = useQueryStore(
    (state) => state.setQueryEditorValue,
  );

  const isSaved =
    useQueryStore((state) => state.queryEditorsSaved[contextId]) ?? true;

  const setIsSaved = useQueryStore((state) => state.setQueryEditorSaved);

  const isAutoSaveEnabled = useSettingsStore(
    (state) => state.dataTableAutoSave,
  );
  const setIsAutoSaveEnabled = useSettingsStore(
    (state) => state.setDataTableAutoSave,
  );
  // endregion

  const dataTableRef = useRef<HotTableRef>(null);
  const columnsActionsRef = useRef<HTMLButtonElement>(null);

  const parsedCsv = Papa.parse(queryEditorValue, {
    header: true,
  });
  const headers = parsedCsv.meta.fields;
  const data = parsedCsv.data as Record<string, string>[];

  const [columnMetadata, setColumnMetadata] = useState<
    Record<string, string>[]
  >([]);

  const [numEntriesToAdd, setNumEntriesToAdd] = useState(1);

  const saveEditorValue = async (value: string) => {
    await appDb.files.update(fileId, {
      content: value,
    });

    setIsSaved(contextId, true);
  };

  const rollbackEditorValue = async () => {
    const file = await appDb.files.get(fileId);
    if (file == null) return;

    setQueryEditorValue(contextId, file.content ?? "", true);
    setIsSaved(contextId, true);
  };

  const addRows = (count: number) => {
    if (headers == null || headers.length === 0) {
      console.warn("No headers found, cannot add rows.");
      return;
    }

    const updatedTable = produce(
      parsedCsv.data as Record<string, string>[],
      (draft) => {
        for (let i = 0; i < count; i++) {
          draft.push({});
        }
      },
    );

    const updatedCsv = Papa.unparse(updatedTable, {
      header: true,
      columns: headers,
    });

    setQueryEditorValue(contextId, updatedCsv, true);
  };
  const addColumns = (count: number) => {
    const oldHeaders = headers ?? [];
    const newHeaders = [
      ...oldHeaders,
      ...nextIncrementedNames("column_", oldHeaders, count),
    ];

    const newData = produce(data, (draft) => {
      if (draft.length === 0) {
        draft.push({});
        for (const header of newHeaders) {
          draft[0][header] = "";
        }
        return;
      }
    });

    const updatedCsv = Papa.unparse(newData, {
      header: true,
      columns: newHeaders,
    });

    setQueryEditorValue(contextId, updatedCsv, true);
  };

  const addNamedColumn = (name: string, index: number) => {
    if (headers == null || headers.length === 0) {
      console.warn("No headers found, cannot add named column.");
      return;
    }

    if (headers.includes(name)) {
      toast.error("Name already exists!");
      return;
    }

    const updatedHeaders = produce(headers, (draft) => {
      draft.splice(index, 0, name);
    });

    const updatedData = produce(data, (draft) => {
      for (const row of draft) {
        row[name] = ""; // Initialize new column with empty string
      }
    });

    const updatedCsv = Papa.unparse(updatedData, {
      header: true,
      columns: updatedHeaders,
    });

    setQueryEditorValue(contextId, updatedCsv, true);
  };

  const saveCurrentTable = () => {
    if (dataTableRef.current?.hotInstance == null) return;
    const exportPlugin =
      dataTableRef.current.hotInstance.getPlugin("exportFile");

    const exportedData = exportPlugin.exportAsString("csv", {
      columnHeaders: true,
    });

    if (exportedData === queryEditorValue) return;

    if (isAutoSaveEnabled) {
      saveEditorValue(exportedData);
    } else {
      setQueryEditorValue(contextId, exportedData, false);
    }
  };

  // region Handlers
  const insertColumnLeft: MenuItemConfig = {
    name() {
      return "Insert column left";
    },
    callback: (_, selection) => {
      const column = selection[0].start.col;
      const newName = prompt("Enter new column name:");
      if (newName != null && newName.trim() !== "") {
        addNamedColumn(newName, column);
      }
    },
  };

  const insertColumnRight: MenuItemConfig = {
    name() {
      return "Insert column right";
    },
    callback: (_, selection) => {
      const column = selection[0].end.col + 1;
      const newName = prompt("Enter new column name:");
      if (newName != null && newName.trim() !== "") {
        addNamedColumn(newName, column);
      }
    },
  };

  const removeColumns: MenuItemConfig = {
    name() {
      return "Remove column(s)";
    },
    disabled() {
      const rangeSelected = this.getSelectedLast();
      const headers = this.getColHeader();

      if (
        headers == null ||
        headers.length === 0 ||
        rangeSelected == null ||
        rangeSelected.length === 0
      )
        return true;

      return (
        Math.abs(rangeSelected[1] - rangeSelected[3]) + 1 >= headers.length // [1] is start col, [3] is end col
      );
    },
    callback: (_, selection) => {
      if (headers == null) return;

      const columnStart = selection[0].start.col;
      const columnEnd = selection[0].end.col;

      const updatedHeaders = produce(headers, (draft) => {
        draft.splice(columnStart, columnEnd - columnStart + 1);
      });

      const updatedData = produce(data, (draft) => {
        for (const row of draft) {
          for (let i = columnStart; i <= columnEnd; i++) {
            const headerToRemove = headers![i];
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete row[headerToRemove];
          }
        }
      });

      const updatedCsv = Papa.unparse(updatedData, {
        header: true,
        columns: updatedHeaders,
      });
      setQueryEditorValue(contextId, updatedCsv, true);
    },
  };
  // endregion

  // Component first mount, set the query editor value
  useEffect(() => {
    if (associatedFile == null) {
      // Nothing is loaded yet. Do nothing
      if (prevAssociatedFile.current == null) return;

      // File state changed from valued to null -> close the panel
      dockviewApi?.getPanel(fileId)?.api?.close();
      return;
    }

    prevAssociatedFile.current = associatedFile;

    setQueryEditorValue(contextId, associatedFile.content ?? "", true);
    setIsSaved(contextId, true);
  }, [
    contextId,
    fileId,
    associatedFile,
    dockviewApi,
    setQueryEditorValue,
    setIsSaved,
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b p-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              className="data-table-editor-columns-actions h-7"
              variant="ghost"
              ref={columnsActionsRef}
            >
              Columns & actions
              <ChevronDown />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="@container flex w-[min(45rem,100vw)] flex-col sm:flex-row">
            <div className="flex flex-1 flex-col gap-2">
              <div className="text-sm font-semibold">Columns</div>
              {headers == null || headers.length === 0 ? (
                <div className="text-muted-foreground text-sm">
                  No columns found
                </div>
              ) : (
                <div className="flex max-h-[8rem] flex-col overflow-y-auto">
                  {headers.map((header, index) => (
                    <div
                      key={index}
                      className="flex w-full shrink-0 items-center gap-1"
                    >
                      <GripHorizontal />
                      <span className="flex-1 rounded-md p-1 hover:bg-gray-100">
                        {header}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                Add{" "}
                <Input
                  type="number"
                  min={1}
                  className="w-[6rem]"
                  value={numEntriesToAdd}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (isNaN(value) || value < 1) {
                      setNumEntriesToAdd(1);
                    } else {
                      setNumEntriesToAdd(value);
                    }
                  }}
                />
                {headers != null && headers.length > 0 && (
                  <Button onClick={() => addRows(numEntriesToAdd)}>
                    {numEntriesToAdd != 1 ? "Rows" : "Row"}
                  </Button>
                )}
                <Button onClick={() => addColumns(numEntriesToAdd)}>
                  {numEntriesToAdd != 1 ? "Columns" : "Column"}
                </Button>
              </div>
              <div className="text-sm">Table has {data.length} rows.</div>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <div className="m-2">Select a column to edit its properties</div>
            </div>
          </PopoverContent>
        </Popover>
        <Separator orientation="vertical" className="h-6!" />
        <Button className="h-7">Import data</Button>

        <div className="ml-auto flex content-end items-center gap-1">
          {!isAutoSaveEnabled && (
            <>
              <Tooltip delayDuration={300}>
                <TooltipContent>Rollback pending changes</TooltipContent>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-6 w-4"
                    disabled={isSaved}
                    onClick={rollbackEditorValue}
                  >
                    <Undo2 />
                  </Button>
                </TooltipTrigger>
              </Tooltip>
              <Tooltip delayDuration={300}>
                <TooltipContent>Save</TooltipContent>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-6 w-4"
                    disabled={isSaved}
                    onClick={() => saveEditorValue(queryEditorValue)}
                  >
                    <SaveIcon />
                  </Button>
                </TooltipTrigger>
              </Tooltip>
            </>
          )}
          <Label className="pr-1">
            <Switch
              checked={isAutoSaveEnabled}
              onCheckedChange={setIsAutoSaveEnabled}
            />
            Auto-save
          </Label>
        </div>
      </div>
      <div className="ht-theme-main-dark-auto flex w-full flex-1">
        <div className="flex flex-1 flex-col">
          {headers == null || headers.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <div>No data found. You can either:</div>
              <div>
                <Button
                  variant="link"
                  onClick={() => {
                    columnsActionsRef.current?.click();
                  }}
                >
                  Add more columns
                </Button>
                or
                <Button variant="link">Import data from file</Button>
              </div>
            </div>
          ) : (
            <HotTable
              ref={dataTableRef}
              height="100%"
              style={{ maxHeight: "100%" }}
              data={data}
              rowHeaders={true}
              colHeaders={headers}
              contextMenu={{
                items: {
                  col_left: insertColumnLeft,
                  col_right: insertColumnRight,
                  row_above: "row_above",
                  row_below: "row_below",
                  sep: "---------",
                  remove_col: removeColumns,
                  remove_row: "remove_row",
                },
              }}
              dropdownMenu={{
                items: {
                  rename_col: {
                    name() {
                      return "Rename column";
                    },
                    callback: (_, selection) => {
                      const column = selection[0].start.col;
                      const oldName = headers[column];
                      const newName = prompt(
                        "Enter new column name:",
                        headers[column],
                      );
                      if (newName != null && newName.trim() !== "") {
                        if (newName === oldName) return;
                        if (headers.includes(newName)) {
                          toast.error("Name already exists!");
                          return;
                        }

                        const hotInstance = dataTableRef.current?.hotInstance;
                        if (hotInstance == null) return;

                        hotInstance.updateSettings({
                          colHeaders: produce(
                            hotInstance.getColHeader() as string[],
                            (draft) => {
                              draft[column] = newName;
                            },
                          ),
                        });
                        saveCurrentTable();
                      }
                    },
                  },
                  insertColumnLeft,
                  insertColumnRight,
                  removeColumn: removeColumns,
                },
              }}
              afterChange={(_, source) => {
                if (source === "loadData") return;
                saveCurrentTable();
              }}
              licenseKey="non-commercial-and-evaluation"
            />
          )}
        </div>
      </div>
    </div>
  );
}
