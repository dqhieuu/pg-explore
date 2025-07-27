import { NodeProps } from "@xyflow/react";
import { Node } from "@xyflow/react";
import { ScrollText } from "lucide-react";

import { BaseWorkflowNode } from "./base/base-workflow-node.tsx";

export type SqlScriptNodeData = {
  workflowIndex: number;
  workflowType: "schema" | "data";
};

export type SqlScriptNodeType = Node<SqlScriptNodeData, "workflow">;

export const SqlScriptNode = ({
  data,
  ...props
}: NodeProps<SqlScriptNodeType>) => {
  const { workflowIndex, workflowType } = data;

  return (
    <BaseWorkflowNode
      data={{
        workflowIndex: workflowIndex,
        workflowType: workflowType,
        newFileType: "sql",
        fileFilterPredicate: (file) => file.type === "sql",
        newFilePrefix: "SQL Script",
        headerText: "SQL Script",
        headerBackgroundClass: "bg-amber-50 dark:bg-amber-950",
        headerIcon: <ScrollText strokeWidth={1.5} className="w-5" />,
      }}
      {...props}
    />
  );
};
