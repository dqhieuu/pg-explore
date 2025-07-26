import { usePostgresStore } from "@/hooks/stores/use-postgres-store";
import { WorkflowStep, appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db";
import { getWorkflow } from "@/lib/dexie/dexie-utils.ts";
import { memDbId } from "@/lib/utils";
import { Node, NodeProps } from "@xyflow/react";
import {
  PencilRuler,
  PlusCircle,
  ScrollText,
  TableIcon,
  WandSparkles,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  PlaceholderNode,
  PlaceholderNodeData,
} from "./base/placeholder-node.tsx";

export type PlaceholderDataNode = Node<PlaceholderNodeData, "placeholderData">;

export const PlaceholderDataNode = ({
  data,
}: NodeProps<PlaceholderDataNode>) => {
  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;

  const { compact, insertBefore } = data;

  const dataWorkflow = useAppDbLiveQuery(() =>
    getWorkflow(currentDbId, "data"),
  );

  const addWorkflowStep = async (
    insertBefore: number,
    stepType: "sql-query" | "table",
  ) => {
    if (dataWorkflow == null) return;

    let newStep: WorkflowStep;
    if (stepType === "sql-query") {
      newStep = { type: "sql-query", options: {} };
    } else if (stepType === "table") {
      newStep = {
        type: "table",
        options: { tableName: "", includeCreateTable: true },
      };
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
          <ScrollText />
          From SQL
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => addWorkflowStep(insertBefore, "table")}
        >
          <TableIcon />
          From tabular data (JSON, CSV,...)
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <PencilRuler /> From data generator
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <WandSparkles />
          From AI prompt
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
