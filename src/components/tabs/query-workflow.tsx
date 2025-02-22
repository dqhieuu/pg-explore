import {
  Background,
  BackgroundVariant,
  Handle,
  Node,
  Position,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DatabaseIcon } from "lucide-react";

const DatabaseSourceNode = () => {
  return (
    <div className="bg-blue-900 text-white p-2 rounded-lg">
      <DatabaseIcon className="" />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const nodeTypes = {
  databaseSource: DatabaseSourceNode,
};

const initialNodes: Node[] = [
  {
    id: "updateSchemaGroup",
    type: "group",
    data: { label: "Update Schema" },
    position: { x: 0, y: 100 },
    style: {
      width: 200,
      height: 100,
    },
  },

  {
    id: "updateDataGroup",
    type: "group",
    data: { label: "Update Data" },
    position: { x: 0, y: 250 },
    style: {
      width: 200,
      height: 100,
    },
  },
];
const initialEdges = [{ id: "e1-2", source: "1", target: "2", animated: true }];

export function QueryWorkflow() {
  return (
    <div className="h-full w-full">
      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={initialNodes}
        edges={initialEdges}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
