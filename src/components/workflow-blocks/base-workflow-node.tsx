import { usePostgresStore } from "@/hooks/stores/use-postgres-store";
import { appDb } from "@/lib/dexie/app-db";
import { cn, memDbId } from "@/lib/utils";
import { Handle, NodeProps, Position } from "@xyflow/react";
import { Node } from "@xyflow/react";
import {
  CircleMinus,
  ExternalLink,
  FilePlus,
  FileText,
  ScrollText,
  Trash,
} from "lucide-react";
import { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { BaseNode } from "./base-node";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BaseWorkflowNodeData = {
  workflowIndex: number;
  workflowType: "schema" | "data";
  headerText: string;
  headerIcon?: ReactNode;
  headerBackgroundClass?: string;
  useDefaultFileSelector?: boolean;
};

export type BaseWorkflowNode = Node<BaseWorkflowNodeData, "workflow">;

export const BaseWorkflowNode = ({
  data,
  children,
}: NodeProps<BaseWorkflowNode> & { children?: React.ReactNode }) => {
  const {
    workflowIndex,
    workflowType,
    headerBackgroundClass,
    headerIcon,
    headerText,
    useDefaultFileSelector,
  } = data;

  const useDefaultFileSelectorValue = useDefaultFileSelector ?? true;

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
            {headerIcon ?? <ScrollText strokeWidth={1.5} className="w-5" />}
            <div className="font-medium text-sm self-center">{headerText}</div>
            <Trash
              className="ml-auto w-4.5 hover:text-red-700"
              strokeWidth={1.5}
              onClick={() => deleteWorkflowStep(workflowType, workflowIndex)}
            />
          </div>
          <div
            className={cn(
              " top-0 bottom-0 left-0 right-0 absolute -mx-2 -mt-1 -mb-1",
              headerBackgroundClass ?? "bg-amber-50",
            )}
          />
        </div>

        <div className="border-b border-gray-200 my-1 -mx-2 relative" />
        <div className="flex flex-col gap-2 py-2">
          {useDefaultFileSelectorValue && (
            <div className="h-6 w-full flex overflow-hidden">
              <div className="flex-1 flex gap-0.5 bg-gray-100 hover:bg-gray-200 px-1 rounded-l">
                <FilePlus className="w-4" />
                <div className="text-xs flex items-center">New</div>
              </div>
              {/* divider */}
              <div className="h-full w-0.5 bg-gray-300" />
              {/* divider */}
              <Dialog>
                <DialogTrigger asChild>
                  <div className="flex-1 flex gap-0.5 bg-gray-100 hover:bg-gray-200 px-1 rounded-r">
                    {" "}
                    <ExternalLink className="w-4" />
                    <div className="text-xs flex items-center">Open</div>
                  </div>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Select a file</DialogTitle>
                  </DialogHeader>
                  <div></div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {useDefaultFileSelectorValue && (
            <div className="h-6 w-full flex overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-1 flex gap-0.5 bg-gray-100 hover:bg-gray-200 px-1 rounded-l">
                    <FileText className="w-4" />
                    <div className="text-xs flex items-center overflow-hidden whitespace-nowrap">
                      Current File Name long
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Current File Name long</TooltipContent>
              </Tooltip>
              {/* divider */}
              <div className="h-full w-0.5 bg-gray-300" />
              {/* divider */}
              <div className="flex items-center bg-gray-100 hover:bg-gray-200 px-1 rounded-r">
                {" "}
                <CircleMinus className="w-3.5" />
              </div>
            </div>
          )}
          {children}
        </div>
      </BaseNode>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
};
