import {
  Background,
  BackgroundVariant,
  Edge,
  Handle,
  Node,
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
} from "lucide-react";
import { useEffect, useState } from "react";

const DatabaseSourceNode = () => {
  return (
    <div className="bg-blue-900 text-white p-2 rounded-lg">
      <DatabaseIcon className="" />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const QueryScriptNode = () => {
  return (
    <div className="w-[10rem] border shadow bg-white py-1 px-2 rounded-lg overflow-hidden">
      <Handle type="target" position={Position.Top} />
      <div className="relative">
        <div className="relative z-10 flex gap-1">
          <ScrollText strokeWidth={1} />
          <div className="font-medium">SQL script</div>
          <CircleMinus className="ml-auto w-5" strokeWidth={1.5} />
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
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const nodeTypes = {
  databaseSource: DatabaseSourceNode,
  queryScript: QueryScriptNode,
};

const initialNodes: Node[] = [
  {
    id: "bound",
    type: "group",
    data: { label: "Update Schema" },
    position: { x: 0, y: 100 },
    style: {
      width: 0,
      height: 0,
    },
  },

  // {
  //   id: "updateDataGroup",
  //   type: "group",
  //   data: { label: "Update Data" },
  //   position: { x: 0, y: 250 },
  //   style: {
  //     width: 0,
  //     height: 0,
  //   },
  // },

  {
    id: "rootNode",
    type: "databaseSource",
    position: { x: 155, y: -100 },
    data: {},
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

  {
    id: "testQueryScript3",
    type: "queryScript",
    data: { label: "Test Query Script" },
    position: { x: 0, y: 600 },
  },
];
const initialEdges: Edge[] = [
  {
    id: "edge0",
    source: "rootNode",
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
    target: "testQueryScript3",
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

    const rootNode = idToNodeMap["rootNode"];
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

    currentY += 100;
    currentX -= 50;

    const boundTop = currentY - 10;
    const boundLeft = currentX - 10;

    let boundRight = currentX + 10;

    let queue = sourceToTargetMap[rootNode.id].slice() ?? [];

    const positionMap: Record<string, { x: number; y: number }> = {};

    while (queue.length > 0) {
      const initX = currentX;

      const nextQueue: string[] = [];

      for (const nodeId of queue) {
        positionMap[nodeId] = { x: currentX, y: currentY };

        currentX += (idToNodeMap[nodeId].measured?.width ?? 0) + 50;
        nextQueue.push(...(sourceToTargetMap[nodeId] ?? []));
      }

      boundRight = Math.max(boundRight, currentX - 50 + 10);

      currentX = initX;
      currentY += (idToNodeMap[queue[0]].measured?.height ?? 0) + 50;
      queue = nextQueue;
    }

    const boundBottom = currentY;
    const boundWidth = boundRight - boundLeft;
    const boundHeight = boundBottom - boundTop;

    setNodes((nodes) => {
      return nodes.map((node) => {
        if (node.id === "bound") {
          console.log("bound", {
            boundLeft,
            boundTop,
            boundWidth,
            boundHeight,
          });
          return {
            ...node,
            position: { x: boundLeft, y: boundTop },
            width: boundWidth,
            height: boundHeight,
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
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
