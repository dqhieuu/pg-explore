import { BaseNode } from "@/components/base-node";
import { Handle, NodeProps, Position } from "@xyflow/react";
import { ReactNode, Ref } from "react";

export type PlaceholderNodeProps = Partial<NodeProps> & {
  children?: ReactNode;
  onClick?: () => void;
  ref?: Ref<HTMLDivElement>;
};

export const PlaceholderNode = ({
  selected,
  children,
  onClick,
  ref,
}: PlaceholderNodeProps) => {
  return (
    <BaseNode
      ref={ref}
      selected={selected}
      className="w-[10rem] border-dashed border-gray-400 bg-card p-2 text-center text-gray-400 shadow-none"
      onClick={onClick}
    >
      {children}
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
