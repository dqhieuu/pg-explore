"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ReactJsonView from "@microlink/react-json-view";
import {
  ColumnDef,
  HeaderGroup,
  Row,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  VirtualItem,
  Virtualizer,
  useVirtualizer,
} from "@tanstack/react-virtual";
import { ReactNode, useMemo, useRef } from "react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filter?: string;
  onFilteredChange?: (result: Row<TData>[]) => void;
}

let gCanvasContext: CanvasRenderingContext2D | null = null;
const measureOneLineCellWidth = (content: string | object) => {
  if (typeof content === "object") {
    if (content == null) return 50;
    return 300;
  }

  if (!gCanvasContext) {
    gCanvasContext = document.createElement("canvas").getContext("2d");
    if (!gCanvasContext) return 0;

    gCanvasContext.font = "16px Inter";
  }

  const textWidth = gCanvasContext.measureText(content).width;
  return Math.ceil(textWidth) + 32; // Add some padding
};

function TableHeadRow<DataType>({
  rowVirtualizer,
  columnVirtualizer,
  headerGroup,
  virtualPaddingLeft,
  virtualPaddingRight,
}: {
  rowVirtualizer: Virtualizer<HTMLDivElement, HTMLTableRowElement>;
  columnVirtualizer: Virtualizer<HTMLDivElement, HTMLTableCellElement>;
  headerGroup: HeaderGroup<DataType>;
  virtualPaddingLeft: number | undefined;
  virtualPaddingRight: number | undefined;
}) {
  const virtualColumns = columnVirtualizer.getVirtualItems();

  return (
    <TableRow
      className="flex w-full min-w-auto bg-gray-100"
      data-index={headerGroup.id}
      ref={rowVirtualizer.measureElement}
    >
      {virtualPaddingLeft ? (
        //fake empty column to the left for virtualization scroll padding
        <th className="flex" style={{ width: virtualPaddingLeft }} />
      ) : null}
      {virtualColumns.map((virtualColumn) => {
        const header = headerGroup.headers[virtualColumn.index];
        return header.isPlaceholder ? null : (
          <TableHead
            key={header.id}
            className="flex min-w-auto items-center break-all"
            style={{
              width: header.getSize(),
            }}
          >
            {flexRender(header.column.columnDef.header, header.getContext())}
          </TableHead>
        );
      })}
      {virtualPaddingRight ? (
        //fake empty column to the right for virtualization scroll padding
        <th className="flex" style={{ width: virtualPaddingRight }} />
      ) : null}
    </TableRow>
  );
}

function TableBodyRow<DataType>({
  columnVirtualizer,
  row,
  rowVirtualizer,
  virtualPaddingLeft,
  virtualPaddingRight,
  virtualRow,
}: {
  columnVirtualizer: Virtualizer<HTMLDivElement, HTMLTableCellElement>;
  row: Row<DataType>;
  rowVirtualizer: Virtualizer<HTMLDivElement, HTMLTableRowElement>;
  virtualRow: VirtualItem;
  virtualPaddingLeft: number | undefined;
  virtualPaddingRight: number | undefined;
}) {
  const visibleCells = row.getVisibleCells();
  const virtualColumns = columnVirtualizer.getVirtualItems();

  return (
    <TableRow
      key={row.id}
      data-index={virtualRow.index}
      ref={rowVirtualizer.measureElement}
      className="absolute flex min-w-full"
      style={{
        transform: `translateY(${virtualRow.start}px)`,
      }}
    >
      {virtualPaddingLeft ? (
        //fake empty column to the left for virtualization scroll padding
        <td style={{ display: "flex", width: virtualPaddingLeft }} />
      ) : null}
      {virtualColumns.map((vc) => {
        const cell = visibleCells[vc.index];
        const cellValue = cell.getValue();
        let cellDisplayedValue: string | ReactNode = "";
        switch (typeof cellValue) {
          case "object":
            if (cellValue == null) {
              cellDisplayedValue = <em>null</em>;
              break;
            }
            if (cellValue instanceof Date) {
              cellDisplayedValue = cellValue.toLocaleString();
              break;
            }
            cellDisplayedValue = (
              <ReactJsonView
                src={cellValue}
                indentWidth={2}
                displayDataTypes={false}
                style={{ width: "100%" }}
              />
            );
            break;
          case "boolean":
            cellDisplayedValue = <em>{cellValue ? "true" : "false"}</em>;
            break;
          case "number":
          case "string":
            cellDisplayedValue = cellValue.toString();
            break;
          default:
            console.warn(
              `The type ${typeof cellValue} is not supported yet`,
              cellValue,
            );
            break;
        }

        return (
          <TableCell
            key={cell.id}
            className="flex min-w-auto break-all"
            style={{
              width: cell.column.getSize(),
            }}
          >
            {cellDisplayedValue}
          </TableCell>
        );
      })}
      {virtualPaddingRight ? (
        //fake empty column to the right for virtualization scroll padding
        <td style={{ display: "flex", width: virtualPaddingRight }} />
      ) : null}
    </TableRow>
  );
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filter,
  onFilteredChange,
}: DataTableProps<TData, TValue>) {
  const widthComputedColumns = useMemo(() => {
    return columns.map((column) => {
      let minWidth = measureOneLineCellWidth(column.header?.toString() ?? "");
      for (const line of data) {
        minWidth = Math.max(
          minWidth,
          // @ts-expect-error accessorKey is a valid key
          measureOneLineCellWidth(line[column.accessorKey]),
        );
      }

      return {
        size: minWidth,
        ...column,
      } satisfies ColumnDef<TData, TValue>;
    });
  }, [columns, data]);

  const table = useReactTable({
    data,
    columns: widthComputedColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
    state: {
      globalFilter: filter,
    },
    defaultColumn: {
      maxSize: 300,
    },
  });

  const { rows } = table.getRowModel();
  onFilteredChange?.(rows);

  const visibleColumns = table.getVisibleLeafColumns();

  const parentRef = useRef<HTMLTableElement>(null);

  const columnVirtualizer = useVirtualizer<
    HTMLDivElement,
    HTMLTableCellElement
  >({
    count: visibleColumns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => visibleColumns[index].getSize(),
    horizontal: true,
    overscan: 10,
  });

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 20,
  });

  const virtualColumns = columnVirtualizer.getVirtualItems();
  const virtualRows = rowVirtualizer.getVirtualItems();

  //different virtualization strategy for columns - instead of absolute and translateY, we add empty columns to the left and right
  let virtualPaddingLeft: number | undefined;
  let virtualPaddingRight: number | undefined;

  if (columnVirtualizer && virtualColumns?.length) {
    virtualPaddingLeft = virtualColumns[0]?.start ?? 0;
    virtualPaddingRight =
      columnVirtualizer.getTotalSize() -
      (virtualColumns[virtualColumns.length - 1]?.end ?? 0);
  }

  return (
    <div
      ref={parentRef}
      className="relative max-h-full w-full overflow-auto rounded-lg border will-change-transform"
    >
      <Table className="grid">
        <TableHeader className="sticky top-0 z-10 grid min-w-auto">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableHeadRow
              key={headerGroup.id}
              rowVirtualizer={rowVirtualizer}
              columnVirtualizer={columnVirtualizer}
              headerGroup={headerGroup}
              virtualPaddingLeft={virtualPaddingLeft}
              virtualPaddingRight={virtualPaddingRight}
            />
          ))}
        </TableHeader>
        <TableBody
          className="relative grid"
          style={{
            height:
              rows.length > 0
                ? `${rowVirtualizer.getTotalSize()}px`
                : undefined,
          }}
        >
          {rows.length > 0 && virtualRows.length > 0 ? (
            virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <TableBodyRow
                  key={row.id}
                  columnVirtualizer={columnVirtualizer}
                  rowVirtualizer={rowVirtualizer}
                  row={row}
                  virtualRow={virtualRow}
                  virtualPaddingLeft={virtualPaddingLeft}
                  virtualPaddingRight={virtualPaddingRight}
                />
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-foreground/50 text-center italic"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
