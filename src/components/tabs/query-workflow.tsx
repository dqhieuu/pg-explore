import {
  Background,
  BackgroundVariant,
  Edge,
  Handle,
  Node,
  NodeTypes,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CircleMinus,
  DatabaseIcon,
  ExternalLink,
  FilePlus,
  ScrollText,
  SquareTerminal,
} from "lucide-react";
import { useEffect, useState } from "react";

import { BaseNode } from "../base-node";
import { PlaceholderNode } from "../placeholder-node";

const DatabaseSourceNode = () => {
  return (
    <BaseNode className="bg-blue-900 text-white p-2 flex gap-1">
      <DatabaseIcon />
      Empty database
      <Handle type="source" position={Position.Bottom} />
    </BaseNode>
  );
};

const EndNode = () => {
  return (
    <BaseNode className="bg-green-900 text-white p-2 flex gap-1">
      <Handle type="target" position={Position.Top} />
      <SquareTerminal />
      Run your query
    </BaseNode>
  );
};

const QueryScriptNode = () => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="z-10" />
      <BaseNode className="w-[10rem] bg-white py-1 px-2 rounded-lg overflow-hidden">
        <div className="relative">
          <div className="relative z-10 flex gap-1">
            <ScrollText strokeWidth={1.5} className="w-5" />
            <div className="font-medium">SQL script</div>
            <CircleMinus className="ml-auto w-4.5" strokeWidth={1.5} />
          </div>
          <div className="bg-amber-50 top-0 bottom-0 left-0 right-0 absolute -mx-2 -mt-1 -mb-1" />
        </div>

        <div className="border-b border-gray-200 my-1 -mx-2 relative" />
        <div className="flex flex-col gap-2 py-2">
          <div className="rounded h-6 w-full bg-gray-100 flex overflow-hidden px-1">
            <div className="flex-1 flex gap-0.5">
              <FilePlus className="w-4" />
              <div className="text-sm flex items-center">New</div>
            </div>
            {/* divider */}
            <div className="h-full w-0.5 bg-gray-400 mx-1" />
            {/* divider */}
            <div className="flex-1 flex gap-0.5">
              {" "}
              <ExternalLink className="w-4" />
              <div className="text-sm flex items-center">Open</div>
            </div>
          </div>
        </div>
      </BaseNode>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
};

const nodeTypes: NodeTypes = {
  databaseSource: DatabaseSourceNode,
  end: EndNode,
  placeholder: PlaceholderNode,
  queryScript: QueryScriptNode,
};

const initialNodes: Node[] = [
  {
    id: "placeholder",
    type: "placeholder",
    position: { x: 0, y: -50 },
    data: {},
  },
  {
    id: "root",
    type: "databaseSource",
    position: { x: 0, y: 0 },
    data: {},
  },

  {
    id: "end",
    type: "end",
    position: { x: 0, y: 600 },
    data: {},
  },

  {
    id: "groupSchema",
    type: "group",
    data: { label: "Update Schema" },
    position: { x: 0, y: 0 },
    hidden: true,
  },

  {
    id: "groupData",
    type: "group",
    data: { label: "Update Data" },
    position: { x: 0, y: 0 },
    hidden: true,
  },

  {
    id: "testQueryScript",
    type: "queryScript",
    data: { label: "Test Query Script" },
    position: { x: 0, y: 0 },
  },

  {
    id: "testQueryScript1",
    type: "queryScript",
    data: { label: "Test Query Script" },
    position: { x: 0, y: 200 },
  },

  {
    id: "testQueryScript2",
    type: "queryScript",
    data: { label: "Test Query Script" },
    position: { x: 0, y: 400 },
  },
];

const initialEdges: Edge[] = [
  {
    id: "edge0",
    source: "root",
    target: "testQueryScript",
    animated: true,
  },
  {
    id: "edge1",
    source: "testQueryScript",
    target: "testQueryScript1",
    animated: true,
  },
  {
    id: "edge2",
    source: "testQueryScript1",
    target: "testQueryScript2",
    animated: true,
  },
  {
    id: "edge3",
    source: "testQueryScript2",
    target: "end",
    animated: true,
  },
];

export function QueryWorkflow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const [layouted, setLayouted] = useState(false);

  useEffect(() => {
    if (layouted) return;

    const idToNodeMap = nodes.reduce(
      (acc, node) => {
        acc[node.id] = node;
        return acc;
      },
      {} as Record<string, Node>,
    );

    const rootNode = idToNodeMap["root"];
    if (rootNode.measured?.width == null) return;

    const sourceToTargetMap = edges.reduce(
      (acc, edge) => {
        if (acc[edge.source] == null) {
          acc[edge.source] = [];
        }

        acc[edge.source].push(edge.target);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    let currentX = rootNode.position.x;
    let currentY = rootNode.position.y;

    currentY += 120;

    const boundTop = currentY - 10;
    const boundLeft = currentX - 10;

    let boundRight = currentX + 10;

    let queue = sourceToTargetMap[rootNode.id].slice() ?? [];

    const positionMap: Record<string, { x: number; y: number }> = {};

    while (queue.length > 0) {
      const initX = currentX;

      const nextQueue: string[] = [];

      for (const nodeId of queue) {
        positionMap[nodeId] =
          nodeId === "end"
            ? { x: initX, y: currentY + 50 }
            : { x: currentX, y: currentY };

        currentX += (idToNodeMap[nodeId].measured?.width ?? 0) + 50;
        nextQueue.push(...(sourceToTargetMap[nodeId] ?? []));
      }

      boundRight = Math.max(boundRight, currentX - 50 + 10);

      currentX = initX;
      if (idToNodeMap[queue[0]].id !== "end") {
        currentY += (idToNodeMap[queue[0]].measured?.height ?? 0) + 50;
      }

      queue = nextQueue;
    }

    const boundBottom = currentY;
    const boundWidth = boundRight - boundLeft;
    const boundHeight = boundBottom - boundTop;

    setNodes((nodes) => {
      return nodes.map((node) => {
        if (node.id === "groupSchema") {
          return {
            ...node,
            position: { x: boundLeft, y: boundTop },
            width: boundWidth,
            height: boundHeight,
            hidden: false,
          };
        }

        if (positionMap[node.id] == null) return { ...node };

        return {
          ...node,
          position: positionMap[node.id],
        };
      });
    });

    setLayouted(true);
  }, [edges, layouted, nodes, setNodes]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
