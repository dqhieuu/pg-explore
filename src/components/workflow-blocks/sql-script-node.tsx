import { usePostgresStore } from "@/hooks/stores/use-postgres-store";
import { appDb } from "@/lib/dexie/app-db";
import { memDbId } from "@/lib/utils";
import { Handle, NodeProps, Position } from "@xyflow/react";
import { Node } from "@xyflow/react";
import { ExternalLink, FilePlus, ScrollText, Trash } from "lucide-react";

import { BaseNode } from "./base-node";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SQLScriptData = {
  workflowIndex: number;
  workflowType: "schema" | "data";
};

export type SQLScriptNode = Node<SQLScriptData, "sqlScript">;

export const SQLScriptNode = ({ data }: NodeProps<SQLScriptNode>) => {
  const { workflowIndex, workflowType } = data;

  const databaseId = usePostgresStore((state) => state.databaseId);

  const currentDbId = databaseId ?? memDbId;

  async function deleteWorkflowStep(
    workflowType: string,
    workflowIndex: number,
  ) {
    const workflow = await appDb.workflows
      .where("databaseId")
      .equals(currentDbId)
      .and((wf) => wf.type === workflowType)
      .first();

    if (workflow == null) return;

    appDb.workflows.update(workflow.id, {
      workflowSteps: workflow.workflowSteps.filter(
        (_, index) => index !== workflowIndex,
      ),
    });
  }

  return (
    <>
      <Handle type="target" position={Position.Top} className="z-10" />
      <BaseNode className="w-[10rem] bg-white py-1 px-2 rounded-lg overflow-hidden">
        <div className="relative">
          <div className="relative z-10 flex gap-1">
            <ScrollText strokeWidth={1.5} className="w-5" />
            <div className="font-medium">SQL script</div>
            <Trash
              className="ml-auto w-4.5 hover:text-red-700"
              strokeWidth={1.5}
              onClick={() => deleteWorkflowStep(workflowType, workflowIndex)}
            />
          </div>
          <div className="bg-amber-50 top-0 bottom-0 left-0 right-0 absolute -mx-2 -mt-1 -mb-1" />
        </div>

        <div className="border-b border-gray-200 my-1 -mx-2 relative" />
        <div className="flex flex-col gap-2 py-2">
          <div className="rounded h-6 w-full bg-gray-100 flex overflow-hidden px-1">
            <div className="flex-1 flex gap-0.5">
              <FilePlus className="w-4" />
              <div className="text-sm flex items-center">New</div>
            </div>
            {/* divider */}
            <div className="h-full w-0.5 bg-gray-400 mx-1" />
            {/* divider */}
            <div className="flex-1 flex gap-0.5">
              {" "}
              <ExternalLink className="w-4" />
              <div className="text-sm flex items-center">Open</div>
            </div>
          </div>
        </div>
      </BaseNode>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
};
