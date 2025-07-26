import { Sortable } from "@/components/headless/sortable.tsx";
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
import { useAnimationStore } from "@/hooks/stores/use-animation-store.ts";
import { useDockviewStore } from "@/hooks/stores/use-dockview-store.ts";
import { useQueryStore } from "@/hooks/stores/use-query-store.ts";
import { useSettingsStore } from "@/hooks/stores/use-settings-store.ts";
import {
  TableFileEntry,
  appDb,
  useAppDbLiveQuery,
} from "@/lib/dexie/app-db.ts";
import { getColumnToDataTypeMap } from "@/lib/pglite/pg-utils.ts";
import { useWorkflowMonitor } from "@/lib/pglite/use-workflow-monitor.ts";
import { cn, guid, nextIncrementedNames } from "@/lib/utils.ts";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { HotTable, HotTableRef } from "@handsontable/react-wrapper";
import { MenuItemConfig } from "handsontable/plugins/contextMenu";
import { produce } from "immer";
import {
  ChevronDown,
  Columns3,
  GripHorizontal,
  Rows3,
  SaveIcon,
  TrashIcon,
  Undo2,
} from "lucide-react";
import Papa from "papaparse";
import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

export interface DataTableEditorProps {
  contextId: string;
  fileId: string;
}

function ColumnsActionsPopoverContent({
  headers,
  tableData,
  contextId,
  fileId,
  renameColumn,
  removeColumns,
  columnToDataType,
  setColumnToDataType,
}: {
  contextId: string;
  fileId: string;
  headers?: string[];
  tableData: Record<string, string>[];
  renameColumn?: (columnIndex: number, newName?: string) => boolean;
  removeColumns?: (columnIndexFrom: number, columnIndexTo?: number) => void;
  columnToDataType?: Record<string, string>;
  setColumnToDataType?: (columnToDataType: Record<string, string>) => void;
}) {
  const setQueryEditorValue = useQueryStore(
    (state) => state.setQueryEditorValue,
  );

  const setIsSaved = useQueryStore((state) => state.setQueryEditorSaved);

  const isAutoSaveEnabled = useSettingsStore(
    (state) => state.dataTableAutoSave,
  );

  const { notifyUpdateWorkflow } = useWorkflowMonitor();

  const dataTypeByHeader =
    headers != null
      ? getColumnToDataTypeMap(headers, tableData, columnToDataType)
      : {};

  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(
    null,
  );

  const [selectedColumnName, setSelectedColumnName] = useState<string>("");
  const [selectedColumnDataType, setSelectedColumnDataType] =
    useState<string>("");

  const isSelectedColumnMetadataChanged =
    selectedColumnIndex != null &&
    headers != null &&
    (headers[selectedColumnIndex] !== selectedColumnName ||
      (columnToDataType?.[headers[selectedColumnIndex]] ?? "").trim() !==
        selectedColumnDataType);

  const [draggingColumn, setDraggingColumn] = useState<string | null>(null);
  const [numEntriesToAdd, setNumEntriesToAdd] = useState(1);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingColumn(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over?.id == null || headers == null) return;

    const oldIndex = headers.indexOf(active.id as string);
    const newIndex = headers.indexOf(over.id as string);
    const reorderedHeaders = arrayMove(headers, oldIndex, newIndex);

    const updatedCsv = Papa.unparse(tableData, {
      header: true,
      columns: reorderedHeaders,
    });

    setQueryEditorValue(contextId, updatedCsv);
    setSelectedColumnIndex(newIndex);
    setSelectedColumnName(reorderedHeaders[newIndex]);
    setSelectedColumnDataType(
      columnToDataType?.[reorderedHeaders[newIndex]] ?? "",
    );

    setDraggingColumn(null);
  };

  const addRows = (count: number) => {
    if (headers == null || headers.length === 0) {
      console.warn("No headers found, cannot add rows.");
      return;
    }

    const updatedTable = produce(tableData, (draft) => {
      for (let i = 0; i < count; i++) {
        draft.push({});
        if (draft.length > 1) continue;
        for (const header of headers) {
          draft[0][header] = "";
        }
      }
    });

    const updatedCsv = Papa.unparse(updatedTable, {
      header: true,
      columns: headers,
    });

    setQueryEditorValue(contextId, updatedCsv);
  };

  const addColumns = (count: number) => {
    const oldHeaders = headers ?? [];
    const newHeaders = [
      ...oldHeaders,
      ...nextIncrementedNames("column_", oldHeaders, count),
    ];

    const newData = produce(tableData, (draft) => {
      if (draft.length > 0) return;

      draft.push({});
      for (const header of newHeaders) {
        draft[0][header] = "";
      }
    });

    const updatedCsv = Papa.unparse(newData, {
      header: true,
      columns: newHeaders,
    });

    setQueryEditorValue(contextId, updatedCsv);
  };

  return (
    <PopoverContent className="@container flex w-[min(42rem,100vw)] flex-col gap-2 sm:flex-row">
      <div className="flex flex-3 flex-col gap-2">
        <div className="flex justify-between">
          <div className="text-sm font-semibold">Columns</div>
          {headers != null && headers.length > 0 && (
            <div className="flex gap-2 text-sm">
              <div className="flex items-center gap-1">
                <strong className="font-medium">{tableData.length}</strong>
                <Rows3 strokeWidth={1.5} />
              </div>
              <div className="flex items-center gap-1">
                <strong className="font-medium">{headers.length}</strong>
                <Columns3 strokeWidth={1.5} />
              </div>
            </div>
          )}
        </div>
        {headers == null || headers.length === 0 ? (
          <div className="text-muted-foreground text-sm">No columns found</div>
        ) : (
          <div className="flex max-h-[12rem] flex-col overflow-y-auto">
            <DndContext
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              sensors={sensors}
            >
              <SortableContext items={headers}>
                {headers.map((header, index) => (
                  <div
                    className="mr-2 flex shrink-0 items-center gap-2"
                    key={header}
                  >
                    <Sortable
                      id={header}
                      className={cn(
                        "flex-1",
                        draggingColumn === header ? "invisible" : "",
                      )}
                      onClick={() => {
                        setSelectedColumnIndex(index);
                        setSelectedColumnName(header);
                        setSelectedColumnDataType(
                          columnToDataType?.[header] ?? "",
                        );
                      }}
                    >
                      <Column
                        key={header}
                        focused={index === selectedColumnIndex}
                        dataType={dataTypeByHeader?.[header]}
                      >
                        {header}
                      </Column>
                    </Sortable>
                    <Button
                      variant="ghost"
                      className="hover:text-destructive h-8 w-8 duration-0"
                      onClick={() => {
                        removeColumns?.(index);
                        setSelectedColumnIndex(null);
                      }}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                ))}
              </SortableContext>
              {createPortal(
                <DragOverlay>
                  {draggingColumn ? (
                    <Column dataType={dataTypeByHeader?.[draggingColumn]}>
                      {draggingColumn}
                    </Column>
                  ) : null}
                </DragOverlay>,
                document.body,
              )}
            </DndContext>
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
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
      </div>
      <div
        className={cn(
          "flex flex-2 border p-2",
          selectedColumnIndex == null &&
            "items-center justify-center bg-gray-100",
        )}
      >
        {selectedColumnIndex != null &&
        headers != null &&
        selectedColumnIndex < headers.length ? (
          <div className="flex w-full flex-col items-start gap-1">
            <label className="w-full">
              <div className="mb-0.5 text-sm font-medium">Column name</div>
              <Input
                value={selectedColumnName}
                onChange={(e) => setSelectedColumnName(e.target.value)}
              />
            </label>
            <label className="w-full">
              <div className="mb-0.5 text-sm font-medium">Data type</div>
              <Input
                placeholder="<auto>"
                value={selectedColumnDataType}
                onChange={(e) => setSelectedColumnDataType(e.target.value)}
              />
            </label>
            <div className="mt-3 flex gap-1">
              <Button
                disabled={!isSelectedColumnMetadataChanged}
                onClick={() => {
                  if (!renameColumn?.(selectedColumnIndex, selectedColumnName))
                    return;
                  if (
                    columnToDataType != null &&
                    setColumnToDataType != null &&
                    selectedColumnIndex != null
                  ) {
                    const updatedColumnToDataType = produce(
                      columnToDataType,
                      (draft) => {
                        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                        delete draft[headers[selectedColumnIndex]];
                        draft[selectedColumnName] =
                          selectedColumnDataType.trim();
                      },
                    );

                    if (isAutoSaveEnabled) {
                      appDb.files.update(fileId, {
                        metadata: {
                          columnToDataType: updatedColumnToDataType,
                        },
                      });
                    }
                    setColumnToDataType(updatedColumnToDataType);
                    notifyUpdateWorkflow();
                  }
                  setIsSaved(contextId, false);
                }}
              >
                Save
              </Button>
              <Button
                variant="secondary"
                disabled={!isSelectedColumnMetadataChanged}
                onClick={() => {
                  setSelectedColumnName(headers[selectedColumnIndex]);
                  setSelectedColumnDataType(
                    columnToDataType?.[headers[selectedColumnIndex]] ?? "",
                  );
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          "Select a column"
        )}
      </div>
    </PopoverContent>
  );
}

export function Column({
  children,
  dataType,
  focused,
}: {
  children: ReactNode;
  dataType?: string;
  focused?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 cursor-grab items-center gap-1 truncate rounded-md p-1 hover:bg-gray-100",
        focused && "bg-primary/10",
      )}
    >
      <GripHorizontal width={18} className="shrink-0" />
      <div className="shrink-1 self-baseline truncate">{children}</div>
      <div className="text-muted-foreground max-w-[8rem] shrink-0 self-baseline truncate text-sm italic">
        {dataType}
      </div>
    </div>
  );
}

export function DataTableEditor({ contextId, fileId }: DataTableEditorProps) {
  // region Hooks
  const associatedFile = useAppDbLiveQuery(() => appDb.files.get(fileId)) as
    | TableFileEntry
    | undefined;
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

  const { notifyUpdateWorkflow } = useWorkflowMonitor();

  const setDropImportFileDialogOpen = useAnimationStore(
    (state) => state.setDropImportFileDialogOpen,
  );
  // endregion

  const dataTableRef = useRef<HotTableRef>(null);
  const columnsActionsRef = useRef<HTMLButtonElement>(null);

  const parsedCsv = Papa.parse(queryEditorValue, {
    header: true,
  });
  const headers = parsedCsv.meta.fields;
  const tableData = parsedCsv.data as Record<string, string>[];

  const [columnToDataType, setColumnToDataType] = useState<
    Record<string, string>
  >({});

  const [popupRefreshKey, setPopupRefreshKey] = useState(guid());

  const isFirstLoad = useRef(true);

  const saveEditorValue = async (value: string) => {
    await appDb.files.update(fileId, {
      content: value,
      metadata: {
        columnToDataType,
      },
    });

    setIsSaved(contextId, true);
  };

  const rollbackEditorValue = async () => {
    if (associatedFile == null) return;

    setQueryEditorValue(contextId, associatedFile.content ?? "", true);
    setColumnToDataType(associatedFile.metadata?.columnToDataType ?? {});
    setIsSaved(contextId, true);
  };

  const addNamedColumn = (name: string, position: number) => {
    if (headers == null || headers.length === 0) {
      console.warn("No headers found, cannot add named column.");
      return;
    }

    if (headers.includes(name)) {
      toast.error("Name already exists!");
      return;
    }

    const updatedHeaders = produce(headers, (draft) => {
      draft.splice(position, 0, name);
    });

    const updatedData = produce(tableData, (draft) => {
      for (const row of draft) {
        row[name] = ""; // Initialize new column with empty string
      }
    });

    const updatedCsv = Papa.unparse(updatedData, {
      header: true,
      columns: updatedHeaders,
    });

    setQueryEditorValue(contextId, updatedCsv);
  };

  const syncCurrentTableStateToDatabase = async () => {
    if (dataTableRef.current?.hotInstance == null) return;
    const exportPlugin =
      dataTableRef.current.hotInstance.getPlugin("exportFile");

    const exportedData = exportPlugin.exportAsString("csv", {
      columnHeaders: true,
    });

    if (exportedData === queryEditorValue) return;

    if (isAutoSaveEnabled) {
      await saveEditorValue(exportedData);
      await notifyUpdateWorkflow();
    } else {
      setQueryEditorValue(contextId, exportedData);
    }
  };

  // region Handlers
  const insertColumnLeftMenuItem: MenuItemConfig = {
    name() {
      return "Insert column left";
    },
    callback: (_, selection) => {
      const position = selection[0].start.col;
      const newName = prompt("Enter new column name:");
      if (newName != null && newName.trim() !== "") {
        addNamedColumn(newName, position);
      }
    },
  };

  const insertColumnRightMenuItem: MenuItemConfig = {
    name() {
      return "Insert column right";
    },
    callback: (_, selection) => {
      const position = selection[0].end.col + 1;
      const newName = prompt("Enter new column name:");
      if (newName != null && newName.trim() !== "") {
        addNamedColumn(newName, position);
      }
    },
  };

  const removeColumnsMenuItem: MenuItemConfig = {
    name() {
      const rangeSelected = this.getSelectedLast();
      const selectedMultipleColumns =
        rangeSelected != null &&
        Math.abs(rangeSelected[1] - rangeSelected[3]) > 0;

      return `Remove column${selectedMultipleColumns ? "s" : ""}`;
    },

    callback: (_, selection) => {
      if (headers == null) return;

      removeColumns(selection[0].start.col, selection[0].end.col);
    },
  };

  // endregion

  const removeColumns = (columnIndexFrom: number, columnIndexTo?: number) => {
    if (headers == null || headers.length === 0) return;

    if (columnIndexTo == null) {
      columnIndexTo = columnIndexFrom;
    }

    const updatedHeaders = produce(headers, (draft) => {
      draft.splice(
        columnIndexFrom,
        columnIndexTo == null ? 1 : columnIndexTo - columnIndexFrom + 1,
      );
    });

    if (updatedHeaders.length === 0) {
      setQueryEditorValue(contextId, "");
      // We must save manually as the syncCurrentTableStateToDatabase() is not called
      // because we do not render the table.
      if (isAutoSaveEnabled) {
        appDb.files.update(fileId, {
          content: "",
          metadata: {},
        });
      }
      return;
    }

    const updatedData = produce(tableData, (draft) => {
      for (const row of draft) {
        for (let i = columnIndexFrom; i <= columnIndexTo; i++) {
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
    setQueryEditorValue(contextId, updatedCsv);
  };

  const renameColumn = (columnIndex: number, newName?: string | null) => {
    if (headers == null || newName == null || newName.trim() === "")
      return false;

    const oldName = headers[columnIndex];
    if (newName === oldName) return true;

    if (headers.includes(newName)) {
      toast.error("Name already exists!");
      return false;
    }

    const hotInstance = dataTableRef.current?.hotInstance;
    if (hotInstance == null) return false;

    hotInstance.updateSettings({
      colHeaders: produce(hotInstance.getColHeader() as string[], (draft) => {
        draft[columnIndex] = newName;
      }),
    });
    syncCurrentTableStateToDatabase();
    return true;
  };

  // Component first mount, set the query editor value
  useEffect(() => {
    if (associatedFile == null) {
      // Nothing is loaded yet. Do nothing
      if (prevAssociatedFile.current == null) return;

      // File state changed from valued to null -> close the panel
      dockviewApi?.getPanel(fileId)?.api?.close();
      return;
    }

    if (associatedFile.metadata == null) {
      appDb.files.update(fileId, {
        metadata: {},
      });
    } else if (isFirstLoad.current) {
      setColumnToDataType(associatedFile.metadata.columnToDataType ?? {});
    }

    prevAssociatedFile.current = associatedFile;

    setQueryEditorValue(contextId, associatedFile.content ?? "", true);
    setIsSaved(contextId, true);

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
    }
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
        <Popover
          onOpenChange={(open) => {
            if (!open) setPopupRefreshKey(guid());
          }}
        >
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
          <ColumnsActionsPopoverContent
            contextId={contextId}
            fileId={fileId}
            headers={headers}
            tableData={tableData}
            renameColumn={renameColumn}
            removeColumns={removeColumns}
            columnToDataType={columnToDataType}
            setColumnToDataType={setColumnToDataType}
            key={popupRefreshKey}
          />
        </Popover>
        <Separator orientation="vertical" className="h-6!" />
        <Button
          className="h-7"
          onClick={() => setDropImportFileDialogOpen(true, fileId)}
        >
          Import data
        </Button>

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
                <Button
                  variant="link"
                  onClick={() => {
                    setDropImportFileDialogOpen(true, fileId);
                  }}
                >
                  Import data from file
                </Button>
              </div>
            </div>
          ) : (
            <HotTable
              ref={dataTableRef}
              className="w-full"
              height={"100%"}
              data={tableData}
              rowHeaders={true}
              colHeaders={headers}
              // Needed to make the column name "1", "2" not auto converted to column index
              columns={(column) => ({ data: headers[column] })}
              contextMenu={{
                items: {
                  insertColumnLeftMenuItem,
                  insertColumnRightMenuItem,
                  row_above: "row_above",
                  row_below: "row_below",
                  sep: "---------",
                  removeColumnsMenuItem,
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
                      const idx = selection[0].start.col;
                      const newName = prompt(
                        "Enter new column name:",
                        headers[idx],
                      );

                      renameColumn(idx, newName);
                    },
                  },
                  insertColumnLeftMenuItem,
                  insertColumnRightMenuItem,
                  removeColumnsMenuItem,
                },
              }}
              afterChange={(_, source) => {
                if (source === "loadData") return;
                syncCurrentTableStateToDatabase();
              }}
              afterRemoveRow={() => syncCurrentTableStateToDatabase()}
              afterRemoveCol={() => syncCurrentTableStateToDatabase()}
              afterCreateRow={() => syncCurrentTableStateToDatabase()}
              afterCreateCol={() => syncCurrentTableStateToDatabase()}
              licenseKey="non-commercial-and-evaluation"
            />
          )}
        </div>
      </div>
    </div>
  );
}
