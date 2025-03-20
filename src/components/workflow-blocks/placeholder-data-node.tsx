import { usePostgresStore } from "@/hooks/stores/use-postgres-store";
import { WorkflowStep, appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db";
import { memDbId } from "@/lib/utils";
import { Node, NodeProps } from "@xyflow/react";
import { PlusCircle } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { PlaceholderNode, PlaceholderNodeData } from "./placeholder-node";

export type PlaceholderDataNode = Node<PlaceholderNodeData, "placeholderData">;

export const PlaceholderDataNode = ({
  data,
}: NodeProps<PlaceholderDataNode>) => {
  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;

  const { compact, insertBefore } = data;

  const dataWorkflow = useAppDbLiveQuery(() =>
    appDb.workflows
      .where("databaseId")
      .equals(currentDbId)
      .and((wf) => wf.type === "data")
      .first(),
  );

  const addWorkflowStep = async (
    insertBefore: number,
    stepType: "sql-query",
  ) => {
    if (dataWorkflow == null) return;

    let newStep: WorkflowStep;
    if (stepType === "sql-query") {
      newStep = { type: "sql-query", options: {} };
    } else {
      throw new Error("Invalid step type");
    }

    appDb.workflows.update(dataWorkflow.id, {
      workflowSteps: [
        ...dataWorkflow.workflowSteps.slice(0, insertBefore),
        newStep,
        ...dataWorkflow.workflowSteps.slice(insertBefore),
      ],
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer">
        <PlaceholderNode compact={compact}>
          <div className="flex h-[4rem] w-[9rem] items-center gap-2">
            <PlusCircle className="size-8" strokeWidth={1} />
            Add table data
          </div>
        </PlaceholderNode>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[10rem]">
        <DropdownMenuItem
          onClick={() => addWorkflowStep(insertBefore, "sql-query")}
        >
          From SQL
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
