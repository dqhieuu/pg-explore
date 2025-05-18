import { BaseNode } from "@/components/workflow-blocks/base/base-node.tsx";
import { cn } from "@/lib/utils";
import { Node, NodeProps, Panel } from "@xyflow/react";
import { HTMLAttributes, ReactNode } from "react";

export type GroupNodeLabelProps = HTMLAttributes<HTMLDivElement>;
export const GroupNodeLabel = ({
  children,
  className,
  ...props
}: GroupNodeLabelProps) => {
  return (
    <div className="h-full w-full" {...props}>
      <div
        className={cn(
          "bg-secondary/80 text-card-foreground w-fit p-2",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
};

type GroupNodeData = {
  label: string;
  backgroundClassName?: string;
};

export type GroupNodeProps = NodeProps<Node<GroupNodeData, "GroupNode">> & {
  label?: ReactNode;
};
export const LabeledGroupNode = ({ selected, data }: GroupNodeProps) => {
  const { label, backgroundClassName } = data;

  return (
    <BaseNode
      selected={selected}
      className={cn(
        "border-muted-foreground h-full overflow-hidden rounded-sm p-0",
        backgroundClassName,
      )}
    >
      <Panel className={cn("m-0! p-0")}>
        {label && (
          <GroupNodeLabel className="rounded-br-sm text-sm font-medium">
            {label}
          </GroupNodeLabel>
        )}
      </Panel>
    </BaseNode>
  );
};
