import { usePostgresStore } from "@/hooks/stores/use-postgres-store.ts";
import { appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db.ts";
import { memDbId } from "@/lib/utils.ts";
import { ReactNode } from "react";

import { WorkflowMonitor } from "./use-workflow-monitor";

export const WorkflowMonitorProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;
  const pgDb = usePostgresStore((state) => state.database) ?? undefined;

  const schemaWorkflow = useAppDbLiveQuery(
    () =>
      appDb.workflows
        .where("databaseId")
        .equals(currentDbId)
        .and((wf) => wf.type === "schema")
        .first(),
    [currentDbId],
  );

  const dataWorkflow = useAppDbLiveQuery(
    () =>
      appDb.workflows
        .where("databaseId")
        .equals(currentDbId)
        .and((wf) => wf.type === "data")
        .first(),
    [currentDbId],
  );

  return (
    <WorkflowMonitor.Provider
      value={{ currentDbId, pgDb, schemaWorkflow, dataWorkflow }}
    >
      {children}
    </WorkflowMonitor.Provider>
  );
};
