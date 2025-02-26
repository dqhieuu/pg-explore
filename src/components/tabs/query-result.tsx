import { useQueryStore } from "@/hooks/stores/use-query-store";
import { ColumnDef } from "@tanstack/react-table";

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
      <div className="flex justify-between items-center border-b -mx-2 -mt-2 px-2 py-0.5 ">
        <Tabs>
          <TabsList defaultValue={"table"}>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="text-sm text-primary/50">{data.length} rows</div>
      </div>
      <div className="flex-1">
        <DataTable columns={columns} data={processedData} />
      </div>
    </div>
  );
}
