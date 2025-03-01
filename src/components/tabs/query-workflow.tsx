/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { usePostgresStore } from "@/hooks/stores/use-postgres-store";
import { appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db";
import { guid, memDbId } from "@/lib/utils";
import {
  Background,
  BackgroundVariant,
  Edge,
  EdgeChange,
  Handle,
  Node,
  NodeChange,
  NodeTypes,
  Position,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { produce } from "immer";
import { DatabaseIcon, SquareTerminal, Table2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounce } from "react-use";
import useResizeObserver from "use-resize-observer";

import { BaseNode } from "../workflow-blocks/base-node";
import { LabeledGroupNode } from "../workflow-blocks/labeled-group-node";
import { PlaceholderSchemaNode } from "../workflow-blocks/placeholder-schema-node";
import { SQLScriptNode } from "../workflow-blocks/sql-script-node";

const DatabaseSourceNode = () => {
  return (
    <BaseNode className="bg-neutral-700 text-white p-2 flex gap-1">
      <DatabaseIcon />
      Empty database
      <Handle type="source" position={Position.Bottom} />
    </BaseNode>
  );
};

const TablesCreatedNode = () => {
  return (
    <BaseNode className="bg-cyan-900 text-white p-2 flex gap-1">
      <Handle type="source" position={Position.Top} />
      <Table2 />
      Tables created
      <Handle type="target" position={Position.Bottom} />
    </BaseNode>
  );
};

const EndNode = () => {
  return (
    <BaseNode className="bg-green-900 text-white p-2 flex items-center gap-1">
      <Handle type="target" position={Position.Top} />
      <SquareTerminal />
      <div>
        <div>Data populated / Run your query</div>
      </div>
    </BaseNode>
  );
};

const nodeTypes: NodeTypes = {
  databaseSource: DatabaseSourceNode,
  tablesCreated: TablesCreatedNode,
  end: EndNode,
  placeholderSchema: PlaceholderSchemaNode,
  sqlScript: SQLScriptNode,
  labeledGroup: LabeledGroupNode,
};

const newSchemaWorkflowId = guid();

enum LayoutingStep {
  Render = 1,
  Position,
  CreateGroups,
  FitView,
  Done,
}

export function QueryWorkflow() {
  const [nodes, setNodes] = useNodesState([] as Node[]);
  const onNodesChange = (changes: NodeChange[]) => {
    const updatedNodes = produce(nodes, (draft) => {
      const entries = applyNodeChanges(changes, draft);
      draft.splice(0, entries.length, ...entries);
      draft.splice(entries.length);
    });
    setNodes(updatedNodes);
  };

  const [edges, setEdges] = useEdgesState([] as Edge[]);
  const onEdgesChange = (changes: EdgeChange[]) => {
    const updatedEdges = produce(edges, (draft) => {
      const entries = applyEdgeChanges(changes, draft);
      draft.splice(0, entries.length, ...entries);
      draft.splice(entries.length);
    });
    setEdges(updatedEdges);
  };

  const reactFlow = useReactFlow();

  const nodeWidthNotAvailable = nodes.some(
    (node) => node.measured?.width == null,
  );

  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;

  const schemaWorkflow = useAppDbLiveQuery(
    () =>
      appDb.workflows
        .where("databaseId")
        .equals(currentDbId)
        .and((wf) => wf.type === "schema")
        .first(),
    [currentDbId],
    "loading",
  );

  const [layoutingStep, setLayoutingStep] = useState(
    LayoutingStep.Render as LayoutingStep,
  );

  const fitViewWhenResize = () => {
    if (layoutingStep !== LayoutingStep.Done) return;
    reactFlow.fitView({ padding: 0.1 });
  };

  const { ref, width } = useResizeObserver<HTMLElement>();
  useDebounce(fitViewWhenResize, 100, [width]);

  useEffect(() => {
    if (typeof schemaWorkflow !== "object") return;

    let newNodes: Node[] = [
      {
        id: "root",
        type: "databaseSource",
        position: { x: 0, y: 0 },
        data: {},
      },
    ];

    const workflowSteps = schemaWorkflow.workflowSteps;

    if (workflowSteps.length === 0) {
      newNodes = produce(newNodes, (draft) => {
        draft.push({
          id: "placeholder-schema",
          type: "placeholderSchema",
          position: { x: 0, y: 0 },
          data: { compact: false, insertBefore: 0, section: "schema" },
        } satisfies PlaceholderSchemaNode);
      });
    } else {
      newNodes = produce(newNodes, (draft) => {
        draft.push({
          id: "placeholder-schema-0",
          type: "placeholderSchema",
          position: { x: 0, y: 0 },
          data: { compact: true, insertBefore: 0, section: "schema" },
        } satisfies PlaceholderSchemaNode);

        for (let i = 0; i < workflowSteps.length; i++) {
          const workflowInfo = {
            workflowIndex: i,
            workflowType: "schema",
          };

          if (workflowSteps[i].type === "sql-query") {
            draft.push({
              id: `schema-step-${i}`,
              type: "sqlScript",
              position: { x: 0, y: 0 },
              data: {
                section: "schema",
                ...workflowInfo,
              },
            });
          } else {
            continue;
          }

          draft.push({
            id: `placeholder-schema-${i + 1}`,
            type: "placeholderSchema",
            position: { x: 0, y: 0 },
            data: { compact: true, insertBefore: i + 1, section: "schema" },
          } satisfies PlaceholderSchemaNode);
        }
      });
    }

    newNodes = produce(newNodes, (draft) => {
      draft.push({
        id: "tables-created",
        type: "tablesCreated",
        position: { x: 0, y: 0 },
        data: {},
      });
    });

    newNodes = produce(newNodes, (draft) => {
      draft.push({
        id: "end",
        type: "end",
        position: { x: 0, y: 0 },
        data: {},
      });
    });

    setNodes(newNodes);
    setLayoutingStep(LayoutingStep.Position);
  }, [schemaWorkflow, setNodes]);

  useEffect(() => {
    if (layoutingStep !== LayoutingStep.Position || nodeWidthNotAvailable)
      return;

    let updatedNodes = nodes;
    updatedNodes = produce(updatedNodes, (draft) => {
      const edgesToBeAdded: Edge[] = [];

      for (let i = 0; i < draft.length - 1; i++) {
        const source = draft[i];
        const target = draft[i + 1];

        edgesToBeAdded.push({
          id: `${source.id}-${target.id}`,
          source: source.id,
          target: target.id,
          animated: true,
        });
      }

      setEdges(edgesToBeAdded);

      const widthMax = Math.max(...draft.map((node) => node.measured!.width!));
      const centerX = widthMax / 2;

      let curY = 0;

      for (let i = 0; i < draft.length; i++) {
        const node = draft[i];
        const xShift = centerX - node.measured!.width! / 2;
        node.position = { x: xShift, y: curY };
        curY += node.measured!.height!;
        if (node["id"] === "root") {
          curY += 80;
        } else if (
          i < draft.length - 1 &&
          ["end", "tables-created"].includes(draft[i + 1].id ?? "")
        ) {
          curY += 50;
        } else {
          curY += 5;
        }
      }
    });

    setNodes(updatedNodes);
    setLayoutingStep(LayoutingStep.CreateGroups);
  }, [edges, nodes, layoutingStep, nodeWidthNotAvailable, setEdges, setNodes]);

  useEffect(() => {
    if (layoutingStep !== LayoutingStep.CreateGroups) return;

    let updatedNodes = nodes;
    updatedNodes = produce(updatedNodes, (draft) => {
      const schemaNodes = draft.filter(
        (node) => node.data.section === "schema",
      );

      const bbox = reactFlow.getNodesBounds(schemaNodes);

      const groupWidth = bbox.width + 40;

      const groupSchema = {
        id: "group-schema",
        type: "labeledGroup",
        position: { x: bbox.x - 20, y: bbox.y - 40 },
        data: {
          label: "Create tables",
          backgroundClassName: "bg-blue-200/50",
        },
        width: groupWidth,
        height: bbox.height + 60,
      };

      draft.unshift(groupSchema);

      const centerX = groupWidth / 2;

      let curY = 50;
      for (const node of schemaNodes) {
        node.parentId = "group-schema";
        const xShift = centerX - node.measured!.width! / 2;
        node.position = { x: xShift, y: curY };
        curY += node.measured!.height!;
        curY += 5;
      }
    });

    setNodes(updatedNodes);
    setLayoutingStep(LayoutingStep.FitView);
  }, [layoutingStep, nodes, reactFlow, setNodes]);

  useEffect(() => {
    if (layoutingStep !== LayoutingStep.FitView) return;

    if (
      typeof schemaWorkflow !== "object" ||
      // We don't want to fit view if there are too many nodes
      schemaWorkflow.workflowSteps.length <= 5
    ) {
      reactFlow.fitView({ padding: 0.1 });
    }
    setLayoutingStep(LayoutingStep.Done);
  }, [layoutingStep, reactFlow, schemaWorkflow]);

  if (schemaWorkflow == null) {
    appDb.workflows.put({
      id: newSchemaWorkflowId,
      databaseId: currentDbId,
      type: "schema",
      name: "",
      workflowSteps: [],
    });
    return null;
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        ref={ref}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
