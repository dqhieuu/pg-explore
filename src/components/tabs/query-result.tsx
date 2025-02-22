import { useQueryStore } from "@/hooks/stores/use-query-store";
import { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "../sections/data-table";

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

  return <DataTable columns={columns} data={data} />;
}
