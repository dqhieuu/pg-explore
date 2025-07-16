import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Input } from "@/components/ui/input.tsx";
import { NodeProps } from "@xyflow/react";
import { Node } from "@xyflow/react";
import { EyeIcon, TableIcon } from "lucide-react";

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
      }}
      {...props}
    >
      <label className="-mt-1 flex cursor-pointer flex-col items-start">
        <div className="text-[0.7rem] text-gray-600">Table name</div>
        <Input
          className="nopan h-6 px-1 text-xs md:text-xs"
          placeholder="SQL table name..."
        />
      </label>
      <div className="flex justify-between">
        <label className="nopan flex items-center gap-1 text-xs">
          <Checkbox />
          <span className="text-[0.7rem]">Include CREATE TABLE</span>
        </label>
        <Button variant="ghost" className="h-6 w-4 cursor-pointer">
          <EyeIcon strokeWidth={1.5} />
        </Button>
      </div>
    </BaseWorkflowNode>
  );
};
