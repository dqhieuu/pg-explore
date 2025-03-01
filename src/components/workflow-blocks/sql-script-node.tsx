import { NodeProps } from "@xyflow/react";
import { Node } from "@xyflow/react";
import { ScrollText } from "lucide-react";

import { BaseWorkflowNode } from "./base-workflow-node";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SQLScriptData = {
  workflowIndex: number;
  workflowType: "schema" | "data";
};

export type SQLScriptNode = Node<SQLScriptData, "workflow">;

export const SQLScriptNode = ({ data, ...props }: NodeProps<SQLScriptNode>) => {
  const { workflowIndex, workflowType } = data;

  return (
    <BaseWorkflowNode
      data={{
        workflowIndex: workflowIndex,
        workflowType: workflowType,
        headerBackgroundClass: undefined,
        headerText: "SQL Script",
        headerIcon: <ScrollText strokeWidth={1.5} className="w-5" />,
      }}
      {...props}
    ></BaseWorkflowNode>
  );
};
