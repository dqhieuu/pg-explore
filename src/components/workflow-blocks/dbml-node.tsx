import { NodeProps } from "@xyflow/react";
import { Node } from "@xyflow/react";
import { ScrollText } from "lucide-react";

import { BaseWorkflowNode } from "./base/base-workflow-node.tsx";

export type DbmlNodeData = {
  workflowIndex: number;
  workflowType: "schema" | "data";
};

export type DbmlNodeType = Node<DbmlNodeData, "workflow">;

export const DbmlNode = ({ data, ...props }: NodeProps<DbmlNodeType>) => {
  const { workflowIndex, workflowType } = data;

  return (
    <BaseWorkflowNode
      data={{
        workflowIndex: workflowIndex,
        workflowType: workflowType,
        newFileType: "dbml",
        fileFilterPredicate: (file) => file.type === "dbml",
        newFilePrefix: "DBML Schema",
        headerText: "DBML File",
        headerBackgroundClass: "bg-purple-100 dark:bg-purple-950",
        headerIcon: <ScrollText strokeWidth={1.5} className="w-5" />,
      }}
      {...props}
    />
  );
};
