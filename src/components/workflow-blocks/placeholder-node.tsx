import { BaseNode } from "@/components/workflow-blocks/base-node";
import { cn } from "@/lib/utils";
import { Handle, NodeProps, Position } from "@xyflow/react";
import { Plus } from "lucide-react";
import { ReactNode, Ref } from "react";

export type PlaceholderNodeProps = Partial<NodeProps> & {
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
  ref?: Ref<HTMLDivElement>;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PlaceholderNodeData = {
  compact?: boolean;
  insertBefore: number; // index of the node to insert before
  section: "schema" | "data";
};

export const PlaceholderNode = ({
  selected,
  children,
  onClick,
  className,
  compact,
  ref,
}: PlaceholderNodeProps) => {
  return (
    <BaseNode
      ref={ref}
      selected={selected}
      className={cn(
        ` border-gray-400 bg-card p-2 text-center text-gray-400 shadow-none`,
        compact ? "rounded-2xl p-0.5" : "border-dashed",
        className,
      )}
      onClick={onClick}
    >
      {compact ? <Plus size={10} /> : children}
      <Handle
        type="target"
        style={{ visibility: "hidden" }}
        position={Position.Top}
        isConnectable={false}
      />
      <Handle
        type="source"
        style={{ visibility: "hidden" }}
        position={Position.Bottom}
        isConnectable={false}
      />
    </BaseNode>
  );
};
