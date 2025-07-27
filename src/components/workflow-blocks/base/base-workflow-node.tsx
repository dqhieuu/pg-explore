import { useDockviewStore } from "@/hooks/stores/use-dockview-store.ts";
import { usePostgresStore } from "@/hooks/stores/use-postgres-store.ts";
import { FileEntry, appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db.ts";
import {
  createNewFile,
  getDatabaseFiles,
  getWorkflow,
} from "@/lib/dexie/dexie-utils.ts";
import { openFileEditor } from "@/lib/dockview.ts";
import { useWorkflowMonitor } from "@/lib/pglite/use-workflow-monitor.ts";
import { cn, isEmptyOrSpaces, memDbId } from "@/lib/utils.ts";
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
  TriangleAlert,
} from "lucide-react";
import { ReactNode } from "react";

import { Button } from "../../ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip.tsx";
import { BaseNode } from "./base-node.tsx";

export type BaseWorkflowNodeData = {
  workflowIndex: number;
  workflowType: "schema" | "data";
  newFileType: FileEntry["type"];
  newFilePrefix: string;
  headerText: string;
  headerIcon?: ReactNode;
  headerBackgroundClass?: string;
  useDefaultFileSelector?: boolean;
  fileFilterPredicate?: (file: FileEntry) => boolean;
  allowSelectFileFromMachine?: boolean;
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
    newFilePrefix,
    newFileType,
    allowSelectFileFromMachine,
  } = data;

  const dockviewApi = useDockviewStore((state) => state.dockviewApi);

  const useDefaultFileSelectorValue = useDefaultFileSelector ?? true;
  const allowSelectFileFromMachineValue = allowSelectFileFromMachine ?? true;

  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;

  const databaseFiles = (
    useAppDbLiveQuery(() => getDatabaseFiles(currentDbId), [currentDbId]) ?? []
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

  const workflowStepExecutionResult = useAppDbLiveQuery(
    () =>
      appDb.databases
        .where("id")
        .equals(currentDbId)
        .first()
        .then((db) => {
          if (db?.workflowState == null) return undefined;

          return db.workflowState.stepResults.find(
            (workflowResult) =>
              workflowResult.type === workflowType &&
              workflowResult.index === workflowIndex,
          );
        }),
    [currentDbId, workflowType, workflowIndex],
  );

  const currentFile = databaseFiles.find(
    (file) => file.id === currentWorkflowStep?.fileId,
  );

  const currentFilename = currentFile?.name ?? "File not found.";

  async function deleteWorkflowStep(
    workflowType: "schema" | "data",
    workflowIndex: number,
  ) {
    const workflow = await getWorkflow(currentDbId, workflowType);

    if (workflow == null) return;

    appDb.workflows.update(workflow.id, {
      workflowSteps: workflow.workflowSteps.filter(
        (_, index) => index !== workflowIndex,
      ),
    });

    await notifyUpdateWorkflow();
  }

  async function setWorkflowFile(
    workflowType: "schema" | "data",
    workflowIndex: number,
    fileId: string | null,
  ) {
    const workflow = await getWorkflow(currentDbId, workflowType);
    if (workflow == null) return;
    workflow.workflowSteps[workflowIndex].fileId =
      fileId == null ? undefined : fileId;

    appDb.workflows.update(workflow.id, {
      workflowSteps: workflow.workflowSteps,
    });

    await notifyUpdateWorkflow();
  }

  return (
    <>
      <Handle type="target" position={Position.Top} className="z-10" />
      <BaseNode
        className={cn(
          "w-[11rem] overflow-hidden rounded-lg bg-white px-2 py-1 dark:bg-neutral-950",
          workflowStepExecutionResult != null ? "outline-3" : "",
          workflowStepExecutionResult?.result === "success"
            ? "outline-green-600"
            : "",
          workflowStepExecutionResult?.result === "noop"
            ? "outline-amber-300"
            : "",
          workflowStepExecutionResult?.result === "error"
            ? "outline-destructive"
            : "",
        )}
      >
        <div className="relative">
          <div className="relative z-10 flex gap-1">
            {isEmptyOrSpaces(workflowStepExecutionResult?.error) ? (
              (headerIcon ?? <ScrollText strokeWidth={1.5} className="w-5" />)
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <TriangleAlert className="w-5 text-yellow-600" />
                </TooltipTrigger>
                <TooltipContent>
                  {workflowStepExecutionResult!.error}
                </TooltipContent>
              </Tooltip>
            )}

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
              headerBackgroundClass ?? "bg-amber-50 dark:bg-amber-950",
            )}
          />
        </div>

        <div className="relative -mx-2 my-1 border-b border-neutral-200 dark:border-neutral-600" />
        <div className="flex flex-col gap-2 py-2">
          {useDefaultFileSelectorValue &&
            (currentFile == null ? (
              <div className="flex h-6 w-full overflow-hidden">
                <div
                  className="flex flex-1 gap-0.5 rounded-l bg-neutral-100 px-1 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-800"
                  onClick={async () => {
                    if (dockviewApi == null) return;
                    const fileId = await createNewFile(currentDbId, {
                      type: newFileType,
                      prefix: newFilePrefix,
                      existingFileNames: databaseFiles.map((file) => file.name),
                    });
                    setWorkflowFile(workflowType, workflowIndex, fileId);
                    openFileEditor(dockviewApi, fileId);
                  }}
                >
                  <FilePlus className="w-4" />
                  <div className="flex items-center text-xs">New</div>
                </div>
                {/* divider */}
                <div className="neutral-300 h-full w-0.5 dark:bg-neutral-600" />
                {/* divider */}
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="flex flex-1 gap-0.5 rounded-r bg-neutral-100 px-1 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-800">
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
                              className="hover:bg-sidebar-accent mr-1 flex shrink-0 gap-1 rounded-lg p-2 select-none"
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
                      {allowSelectFileFromMachineValue && (
                        <>
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
                                type: newFileType,
                                filename: file.name,
                                content: await file.text(),
                              });
                              setWorkflowFile(
                                workflowType,
                                workflowIndex,
                                fileId,
                              );
                            }}
                          />
                        </>
                      )}
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
                      openFileEditor(dockviewApi, currentFile.id);
                    }}
                  >
                    <div className="dark:bg flex flex-1 gap-0.5 rounded-l bg-neutral-100 px-1 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-800">
                      <FileText className="w-4 shrink-0" />
                      <div className="flex items-center overflow-hidden text-xs whitespace-nowrap">
                        {currentFilename}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{currentFilename}</TooltipContent>
                </Tooltip>
                {/* divider */}
                <div className="h-full w-0.5 bg-neutral-300 dark:bg-neutral-600" />
                {/* divider */}
                <div
                  className="group flex items-center rounded-r bg-neutral-100 px-1 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-800"
                  onClick={() =>
                    setWorkflowFile(workflowType, workflowIndex, null)
                  }
                >
                  <CircleMinus className="group-hover:text-destructive w-3.5" />
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
