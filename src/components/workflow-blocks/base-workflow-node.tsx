import { useDockviewStore } from "@/hooks/stores/use-dockview-store";
import { usePostgresStore } from "@/hooks/stores/use-postgres-store";
import {
  FileEntry,
  WorkflowStep,
  appDb,
  useAppDbLiveQuery,
} from "@/lib/dexie/app-db";
import { createNewFile } from "@/lib/dexie/dexie-utils";
import { openFileEditor } from "@/lib/dockview";
import { useWorkflowMonitor } from "@/lib/pglite/use-workflow-monitor.ts";
import { cn, memDbId } from "@/lib/utils";
import { Handle, NodeProps, Position } from "@xyflow/react";
import { Node } from "@xyflow/react";
import {
  CircleMinus,
  ExternalLink,
  FileIcon,
  FilePlus,
  FileText,
  ScrollText,
  Trash,
} from "lucide-react";
import { ReactNode } from "react";

import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { BaseNode } from "./base-node";

export type BaseWorkflowNodeData = {
  workflowIndex: number;
  workflowType: "schema" | "data";
  headerText: string;
  headerIcon?: ReactNode;
  headerBackgroundClass?: string;
  useDefaultFileSelector?: boolean;
  fileFilterPredicate?: (file: FileEntry) => boolean;
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
    fileFilterPredicate,
  } = data;

  const dockviewApi = useDockviewStore((state) => state.dockviewApi);

  const useDefaultFileSelectorValue = useDefaultFileSelector ?? true;

  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;

  const databaseFiles = (
    useAppDbLiveQuery(
      () => appDb.files.where("databaseId").equals(currentDbId).toArray(),
      [currentDbId],
    ) ?? []
  ).toSorted((a, b) => a.name.localeCompare(b.name));

  const filteredFiles = fileFilterPredicate
    ? databaseFiles.filter(fileFilterPredicate)
    : databaseFiles;

  const { notifyUpdateWorkflow } = useWorkflowMonitor();

  const currentWorkflowStep = useAppDbLiveQuery(
    () =>
      appDb.workflows
        .where("databaseId")
        .equals(currentDbId)
        .and((wf) => wf.type === workflowType)
        .first()
        .then((wf) => wf?.workflowSteps[workflowIndex]),
    [currentDbId, workflowType],
  );

  const currentFile = databaseFiles.find(
    (file) => file.id === currentWorkflowStep?.fileId,
  );

  const currentFilename = currentFile?.name ?? "File not found.";

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

    await notifyUpdateWorkflow();
  }

  async function setWorkflowFile(
    workflowType: string,
    workflowIndex: number,
    fileId: string | null,
  ) {
    const workflow = await appDb.workflows
      .where("databaseId")
      .equals(currentDbId)
      .and((wf) => wf.type === workflowType)
      .first();

    if (workflow == null) return;

    appDb.workflows.update(workflow.id, {
      workflowSteps: workflow.workflowSteps.map((step, index) => {
        if (index !== workflowIndex) return step;
        return {
          ...step,
          fileId: fileId == null ? undefined : fileId,
        } satisfies WorkflowStep;
      }),
    });

    await notifyUpdateWorkflow();
  }

  return (
    <>
      <Handle type="target" position={Position.Top} className="z-10" />
      <BaseNode className="w-[10rem] overflow-hidden rounded-lg bg-white px-2 py-1">
        <div className="relative">
          <div className="relative z-10 flex gap-1">
            {headerIcon ?? <ScrollText strokeWidth={1.5} className="w-5" />}
            <div className="self-center text-sm font-medium">{headerText}</div>
            <Trash
              className="ml-auto w-4.5 hover:text-red-700"
              strokeWidth={1.5}
              onClick={() => deleteWorkflowStep(workflowType, workflowIndex)}
            />
          </div>
          <div
            className={cn(
              "absolute top-0 right-0 bottom-0 left-0 -mx-2 -mt-1 -mb-1",
              headerBackgroundClass ?? "bg-amber-50",
            )}
          />
        </div>

        <div className="relative -mx-2 my-1 border-b border-gray-200" />
        <div className="flex flex-col gap-2 py-2">
          {useDefaultFileSelectorValue &&
            (currentFile == null ? (
              <div className="flex h-6 w-full overflow-hidden">
                <div
                  className="flex flex-1 gap-0.5 rounded-l bg-gray-100 px-1 hover:bg-gray-200"
                  onClick={async () => {
                    if (dockviewApi == null) return;
                    const fileId = await createNewFile(currentDbId, {
                      prefix: "SQL Script",
                      existingFileNames: databaseFiles.map((file) => file.name),
                    });
                    setWorkflowFile(workflowType, workflowIndex, fileId);

                    const fileEntry = await appDb.files.get(fileId);
                    openFileEditor(dockviewApi, fileId, fileEntry?.name);
                  }}
                >
                  <FilePlus className="w-4" />
                  <div className="flex items-center text-xs">New</div>
                </div>
                {/* divider */}
                <div className="h-full w-0.5 bg-gray-300" />
                {/* divider */}
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="flex flex-1 gap-0.5 rounded-r bg-gray-100 px-1 hover:bg-gray-200">
                      {" "}
                      <ExternalLink className="w-4" />
                      <div className="flex items-center text-xs">Open</div>
                    </div>
                  </DialogTrigger>
                  <DialogContent aria-describedby={undefined}>
                    <DialogHeader>
                      <DialogTitle>Select a file</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-start gap-8">
                      <div className="flex max-h-[15rem] w-full flex-col gap-1 overflow-auto">
                        {filteredFiles.length ? (
                          filteredFiles.map((file) => (
                            <div
                              key={file.id}
                              className="mr-1 flex shrink-0 gap-1 rounded-lg p-2 select-none hover:bg-gray-100"
                              onClick={() => {
                                setWorkflowFile(
                                  workflowType,
                                  workflowIndex,
                                  file.id,
                                );
                              }}
                            >
                              <FileIcon />
                              {file.name}
                            </div>
                          ))
                        ) : (
                          <div>No files found.</div>
                        )}
                      </div>

                      <Button>
                        <label htmlFor="file-upload">
                          Select from your machine
                        </label>
                      </Button>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file == null) return;
                          const fileId = await createNewFile(currentDbId, {
                            filename: file.name,
                            content: await file.text(),
                          });
                          setWorkflowFile(workflowType, workflowIndex, fileId);
                        }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="flex h-6 w-full overflow-hidden">
                <Tooltip>
                  <TooltipTrigger
                    asChild
                    onClick={() => {
                      if (dockviewApi == null) return;
                      openFileEditor(
                        dockviewApi,
                        currentFile.id,
                        currentFile.name,
                      );
                    }}
                  >
                    <div className="flex flex-1 gap-0.5 rounded-l bg-gray-100 px-1 hover:bg-gray-200">
                      <FileText className="w-4 shrink-0" />
                      <div className="flex items-center overflow-hidden text-xs whitespace-nowrap">
                        {currentFilename}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{currentFilename}</TooltipContent>
                </Tooltip>
                {/* divider */}
                <div className="h-full w-0.5 bg-gray-300" />
                {/* divider */}
                <div
                  className="flex items-center rounded-r bg-gray-100 px-1 hover:bg-gray-200"
                  onClick={() =>
                    setWorkflowFile(workflowType, workflowIndex, null)
                  }
                >
                  <CircleMinus className="w-3.5" />
                </div>
              </div>
            ))}
          {children}
        </div>
      </BaseNode>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
};
