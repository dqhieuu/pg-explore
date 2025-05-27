import { usePostgresStore } from "@/hooks/stores/use-postgres-store";
import { WorkflowStep, appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db";
import { getWorkflow } from "@/lib/dexie/dexie-utils.ts";
import { memDbId } from "@/lib/utils";
import { Node, NodeProps } from "@xyflow/react";
import { PlusCircle, ScrollText, WandSparkles } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHint,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  PlaceholderNode,
  PlaceholderNodeData,
} from "./base/placeholder-node.tsx";

export type PlaceholderSchemaNode = Node<
  PlaceholderNodeData,
  "placeholderSchema"
>;

export const PlaceholderSchemaNode = ({
  data,
}: NodeProps<PlaceholderSchemaNode>) => {
  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;

  const { compact, insertBefore } = data;

  const schemaWorkflow = useAppDbLiveQuery(() =>
    getWorkflow(currentDbId, "schema"),
  );

  const addWorkflowStep = async (
    insertBefore: number,
    stepType: "sql-query" | "dbml",
  ) => {
    if (schemaWorkflow == null) return;

    let newStep: WorkflowStep;
    if (stepType === "sql-query") {
      newStep = { type: "sql-query", options: {} };
    } else if (stepType === "dbml") {
      newStep = { type: "dbml", options: {} };
    } else {
      throw new Error("Invalid step type");
    }

    appDb.workflows.update(schemaWorkflow.id, {
      workflowSteps: [
        ...schemaWorkflow.workflowSteps.slice(0, insertBefore),
        newStep,
        ...schemaWorkflow.workflowSteps.slice(insertBefore),
      ],
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer">
        <PlaceholderNode compact={compact}>
          <div className="flex h-[4rem] w-[9rem] items-center gap-2">
            <PlusCircle className="size-8" strokeWidth={1} />
            Add table schema
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
        <DropdownMenuItem onClick={() => addWorkflowStep(insertBefore, "dbml")}>
          <ScrollText />
          From DBML
          <DropdownMenuHint href="https://dbml.dbdiagram.io/home/" />
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <WandSparkles /> From AI prompt
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
