import { WorkflowSection, appDb } from "@/lib/dexie/app-db.ts";
import {
  applyWorkflow,
  markWorkflowDirty,
} from "@/lib/pglite/workflow-evaluator.ts";
import { PGliteInterface } from "@electric-sql/pglite";
import { createContext, useCallback, useContext, useMemo } from "react";

export const WorkflowMonitorContext = createContext<{
  currentDbId?: string;
  pgDb?: PGliteInterface;
  schemaWorkflow?: WorkflowSection;
  dataWorkflow?: WorkflowSection;
} | null>(null);

export const useWorkflowMonitor = () => {
  const monitor = useContext(WorkflowMonitorContext);

  const currentDbId = monitor?.currentDbId;
  const pgDb = monitor?.pgDb;
  const schemaWorkflow = monitor?.schemaWorkflow;
  const dataWorkflow = monitor?.dataWorkflow;

  const runWorkflowStepsBeforeFile = useCallback(
    async (fileId: string) => {
      if (
        currentDbId == null ||
        pgDb == null ||
        schemaWorkflow == null ||
        dataWorkflow == null
      ) {
        return;
      }

      const file = appDb.files.get(fileId);
      if (file == null) {
        throw new Error(`File ${fileId} not found`);
      }

      const schemaWorkflowFileIdx = schemaWorkflow.workflowSteps.findLastIndex(
        (step) => step.fileId === fileId,
      );
      const dataWorkflowFileIdx = dataWorkflow.workflowSteps.findLastIndex(
        (step) => step.fileId === fileId,
      );

      if (schemaWorkflowFileIdx < 0 && dataWorkflowFileIdx < 0) {
        await applyWorkflow(pgDb, currentDbId);

        return;
      }

      if (dataWorkflowFileIdx >= 0) {
        await applyWorkflow(pgDb, currentDbId, {
          workflowType: "data",
          stepsToApply: dataWorkflowFileIdx,
        });

        return;
      }

      if (schemaWorkflowFileIdx >= 0) {
        await applyWorkflow(pgDb, currentDbId, {
          workflowType: "schema",
          stepsToApply: schemaWorkflowFileIdx,
        });
      }
    },
    [currentDbId, dataWorkflow, pgDb, schemaWorkflow],
  );

  return useMemo(
    () => ({
      notifyModifyEditor: async (fileId: string) => {
        const file = await appDb.files.get(fileId);
        if (file == null) {
          throw new Error(`File ${fileId} not found`);
        }

        if (file.type !== "sql") {
          return;
        }

        await runWorkflowStepsBeforeFile(fileId);
      },

      notifyRunArbitraryQuery: async (fileId: string) => {
        const file = appDb.files.get(fileId);
        if (file == null) {
          throw new Error(`File ${fileId} not found`);
        }

        await runWorkflowStepsBeforeFile(fileId);
      },

      notifySendingChat: async () => {
        if (pgDb == null || currentDbId == null) return;

        return applyWorkflow(pgDb, currentDbId);
      },

      notifyUpdateWorkflow: async () => {
        if (currentDbId == null) {
          throw new Error("notifyUpdateWorkflow: No current database ID");
        }

        await markWorkflowDirty(currentDbId);
      },
    }),
    [currentDbId, pgDb, runWorkflowStepsBeforeFile],
  );
};
