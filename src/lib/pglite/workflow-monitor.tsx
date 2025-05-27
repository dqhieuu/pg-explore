import { usePostgresStore } from "@/hooks/stores/use-postgres-store.ts";
import { useAppDbLiveQuery } from "@/lib/dexie/app-db.ts";
import { getWorkflow } from "@/lib/dexie/dexie-utils.ts";
import { memDbId } from "@/lib/utils.ts";
import { ReactNode } from "react";

import { WorkflowMonitorContext } from "./use-workflow-monitor";

export const WorkflowMonitorProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;
  const pgDb = usePostgresStore((state) => state.database) ?? undefined;

  const schemaWorkflow = useAppDbLiveQuery(
    () => getWorkflow(currentDbId, "schema"),
    [currentDbId],
  );

  const dataWorkflow = useAppDbLiveQuery(
    () => getWorkflow(currentDbId, "data"),
    [currentDbId],
  );

  return (
    <WorkflowMonitorContext.Provider
      value={{ currentDbId, pgDb, schemaWorkflow, dataWorkflow }}
    >
      {children}
    </WorkflowMonitorContext.Provider>
  );
};
