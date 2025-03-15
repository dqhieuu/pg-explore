import { Input } from "@/components/ui/input.tsx";
import { useQueryStore } from "@/hooks/stores/use-query-store";
import { ColumnDef } from "@tanstack/react-table";
import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

import { DataTable } from "../sections/data-table";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

export interface QueryResultProps {
  contextId: string;
  lotNumber: number;
}

export function QueryResult({ contextId, lotNumber }: QueryResultProps) {
  const queryResult = useQueryStore(
    (state) => state.queryResults[contextId][lotNumber],
  );

  const [tab, setTab] = useState<string>("table");

  const [filter, setFilter] = useState<string>("");
  const setFilterDebounced = useDebounceCallback(setFilter, 300);

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
    <div className="flex flex-col h-full gap-1">
      <div className="flex gap-1 justify-between items-center border-b -mx-2 -mt-2 px-2 py-0.5 ">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="chart" disabled>
              Chart (TODO)
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex-1 flex gap-2 items-center">
          <div className="flex-1" />
          <label className="[&:has(:focus-visible)]:ring-2 ring-ring/20 flex items-center rounded-lg border pl-2">
            <SearchIcon className="size-4 text-muted-foreground" />
            <Input
              onChange={(e) => setFilterDebounced(e.target.value)}
              placeholder="Filter..."
              className="focus:max-w-[12rem] max-w-[4.5rem] transition-all ease-in-out duration-100 border-none bg-transparent shadow-none focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0 h-7"
            />
          </label>
          <div className="text-sm text-primary/50 shrink-0">
            {data.length} {data.length !== 1 ? "rows" : "row"}
          </div>
        </div>
      </div>
      <div className="flex-1">
        <DataTable columns={columns} data={processedData} filter={filter} />
      </div>
    </div>
  );
}
