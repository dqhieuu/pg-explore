import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { usePostgresStore } from "@/hooks/stores/use-postgres-store.ts";
import {
  TableFileEntry,
  appDb,
  useAppDbLiveQuery,
} from "@/lib/dexie/app-db.ts";
import { getWorkflow } from "@/lib/dexie/dexie-utils.ts";
import {
  getColumnToDataTypeMap,
  getCreateTableSql,
} from "@/lib/pglite/pg-utils.ts";
import { useWorkflowMonitor } from "@/lib/pglite/use-workflow-monitor.ts";
import { cn, isEmptyOrSpaces, memDbId } from "@/lib/utils.ts";
import { PostgreSQL as PostgreSQLDialect, sql } from "@codemirror/lang-sql";
import CodeMirror from "@uiw/react-codemirror";
import { NodeProps } from "@xyflow/react";
import { Node } from "@xyflow/react";
import { produce } from "immer";
import { EyeIcon, TableIcon } from "lucide-react";
import Papa from "papaparse";
import { useState } from "react";

import { BaseWorkflowNode } from "./base/base-workflow-node.tsx";

export type DataTableNodeData = {
  workflowIndex: number;
  workflowType: "data";
};

export type DataTableNodeType = Node<DataTableNodeData, "workflow">;

export const DataTableNode = ({
  data,
  ...props
}: NodeProps<DataTableNodeType>) => {
  const { workflowIndex, workflowType } = data;
  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;
  const currentWorkflow = useAppDbLiveQuery(() =>
    getWorkflow(currentDbId, workflowType),
  );
  const isIncludeCreateTable =
    currentWorkflow?.workflowSteps[workflowIndex].options.includeCreateTable ??
    false;
  const tableName =
    currentWorkflow?.workflowSteps[workflowIndex].options.tableName ?? "";
  const { notifyUpdateWorkflow } = useWorkflowMonitor();

  const [createTablePreview, setCreateTablePreview] = useState("");

  return (
    <BaseWorkflowNode
      data={{
        workflowIndex: workflowIndex,
        workflowType: workflowType,
        newFileType: "table",
        fileFilterPredicate: (file) => file.type === "table",
        newFilePrefix: "Data Table",
        headerText: "Data Table",
        headerBackgroundClass: "bg-blue-100",
        useDefaultFileSelector: true,
        headerIcon: <TableIcon strokeWidth={1.5} className="w-5" />,
        allowSelectFileFromMachine: false,
      }}
      {...props}
    >
      <label className="-mt-1 flex cursor-pointer flex-col items-start">
        <div className="text-[0.7rem] text-gray-600">
          Table name{" "}
          {!isIncludeCreateTable && <span className="text-destructive">*</span>}
        </div>
        <Input
          className={cn("nopan h-6 border-1 px-1 text-xs md:text-xs")}
          placeholder="SQL table name..."
          defaultValue={tableName}
          required={!isIncludeCreateTable}
          onBlur={(e) => {
            if (currentWorkflow == null) return;

            const updatedWorkflow = produce(currentWorkflow, (draft) => {
              draft.workflowSteps[workflowIndex].options.tableName =
                e.target.value;
            });

            appDb.workflows.update(currentWorkflow.id, {
              workflowSteps: updatedWorkflow.workflowSteps,
            });

            notifyUpdateWorkflow();
          }}
        />
      </label>
      <div className="flex justify-between">
        <label className="nopan flex items-center gap-1 text-xs">
          <Checkbox
            onCheckedChange={(checked) => {
              if (currentWorkflow == null) return;

              const updatedWorkflow = produce(currentWorkflow, (draft) => {
                draft.workflowSteps[workflowIndex].options.includeCreateTable =
                  checked === "indeterminate" ? false : checked;
              });

              appDb.workflows.update(currentWorkflow.id, {
                workflowSteps: updatedWorkflow.workflowSteps,
              });

              notifyUpdateWorkflow();
            }}
            checked={isIncludeCreateTable}
          />
          <span className="text-[0.7rem]">Include CREATE TABLE</span>
        </label>
        <Popover
          onOpenChange={async (open) => {
            if (!open || currentWorkflow == null) return;

            let previewTableName: string;
            if (isEmptyOrSpaces(tableName)) {
              previewTableName = "<GENERATED_NAME>";
            } else {
              previewTableName = tableName;
            }

            const fileId = currentWorkflow.workflowSteps[workflowIndex].fileId;
            if (fileId == null) {
              setCreateTablePreview("-- Nothing to display");
              return;
            }
            const file = (await appDb.files.get(fileId)) as
              | TableFileEntry
              | undefined;
            if (file == null || isEmptyOrSpaces(file.content)) {
              setCreateTablePreview("-- Nothing to display");
              return;
            }

            const parsedCsv = Papa.parse(file.content!, { header: true });
            const columns = parsedCsv.meta.fields ?? [];
            const columnsToDataType = getColumnToDataTypeMap(
              columns,
              parsedCsv.data as Record<string, string>[],
              file.metadata?.columnToDataType,
            );

            const createTableSql = getCreateTableSql(
              previewTableName,
              columnsToDataType,
            );
            setCreateTablePreview(createTableSql);
          }}
        >
          <PopoverContent>
            <CodeMirror
              value={createTablePreview}
              extensions={[
                sql({
                  dialect: PostgreSQLDialect,
                }),
              ]}
              className="h-full w-full flex-1"
              width="100%"
              height="100%"
              readOnly={true}
            />
          </PopoverContent>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              disabled={!isIncludeCreateTable}
              className="h-6 w-4"
            >
              <EyeIcon strokeWidth={1.5} />
            </Button>
          </PopoverTrigger>
        </Popover>
      </div>
    </BaseWorkflowNode>
  );
};
