import { DataTable } from "@/components/sections/data-table.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useQueryStore } from "@/hooks/stores/use-query-store";
import { ColumnDef } from "@tanstack/react-table";
import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

export interface QueryResultProps {
  contextId: string;
  lotNumber: number;
}

export function QueryResult({ contextId, lotNumber }: QueryResultProps) {
  const queryResult = useQueryStore(
    (state) => state.queryResults[contextId][lotNumber],
  );

  const [tab, setTab] = useState("table");

  const [filter, setFilter] = useState("");
  const setFilterDebounced = useDebounceCallback(setFilter, 300);

  const [filteredCount, setFilteredCount] = useState(0);

  if (queryResult == null) {
    return (
      <div className="text-primary/50">
        Query result will be displayed here.
      </div>
    );
  }

  if (typeof queryResult === "string") {
    return <div className="text-red-500">{queryResult}</div>;
  }

  const columns: ColumnDef<object>[] = (queryResult?.fields ?? []).map(
    (key) => ({
      header: key.name,
      accessorKey: key.name,
    }),
  );

  const data = queryResult?.rows ?? [];
  const processedData = data.map((row) => {
    const processedRow: Record<string, string> = {};
    for (const key in row) {
      let value = row[key] as string;
      if (typeof value === "object") {
        value = JSON.stringify(value);
      }

      processedRow[key] = value;
    }
    return processedRow;
  });

  return (
    <div className="flex h-full flex-col gap-1">
      <div className="-mx-2 -mt-2 flex items-center justify-between gap-1 border-b px-2 py-0.5">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            {/*<TabsTrigger value="chart" disabled>*/}
            {/*  Chart*/}
            {/*</TabsTrigger>*/}
          </TabsList>
        </Tabs>
        <div className="flex flex-1 items-center gap-2">
          <div className="flex-1" />
          <label className="ring-ring/20 flex items-center rounded-lg border pl-2 [&:has(:focus-visible)]:ring-2">
            <SearchIcon className="text-muted-foreground size-4" />
            <Input
              onChange={(e) => setFilterDebounced(e.target.value)}
              placeholder="Filter..."
              className="h-7 max-w-[4.5rem] border-none bg-transparent shadow-none transition-all duration-100 ease-in-out focus:max-w-[12rem] focus-visible:shadow-none focus-visible:ring-0 focus-visible:outline-none"
            />
          </label>
          <div className="text-primary/50 shrink-0 text-sm">
            {filter.length > 0 ? `${filteredCount} / ` : ""}
            {data.length} {data.length !== 1 ? "rows" : "row"}
          </div>
        </div>
      </div>
      <div className="flex-1">
        <DataTable
          columns={columns}
          data={processedData}
          filter={filter}
          onFilteredChange={(filteredData) => {
            setTimeout(() => {
              setFilteredCount(filteredData.length);
            }, 0);
          }}
        />
      </div>
    </div>
  );
}
