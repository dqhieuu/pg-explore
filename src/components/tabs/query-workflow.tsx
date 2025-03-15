import { usePostgresStore } from "@/hooks/stores/use-postgres-store";
import { appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db";
import { memDbId } from "@/lib/utils";
import { Tooltip, TooltipTrigger } from "@radix-ui/react-tooltip";
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
import { useEffect, useRef, useState } from "react";
import { useDebounceCallback, useResizeObserver } from "usehooks-ts";

import { TooltipContent } from "../ui/tooltip";
import { BaseNode } from "../workflow-blocks/base-node";
import { LabeledGroupNode } from "../workflow-blocks/labeled-group-node";
import { PlaceholderDataNode } from "../workflow-blocks/placeholder-data-node";
import { PlaceholderSchemaNode } from "../workflow-blocks/placeholder-schema-node";
import { SQLScriptNode } from "../workflow-blocks/sql-script-node";

const DatabaseSourceNode = () => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <BaseNode className="bg-neutral-700 text-white p-2 flex gap-1">
          <DatabaseIcon />
          Empty database
          <Handle type="source" position={Position.Bottom} />
        </BaseNode>
      </TooltipTrigger>
      <TooltipContent>
        Add database plugins and configurations (TODO)
      </TooltipContent>
    </Tooltip>
  );
};

const TablesCreatedNode = () => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <BaseNode className="bg-cyan-900 text-white p-2 flex gap-1">
          <Handle type="target" position={Position.Top} />
          <Table2 />
          Tables created
          <Handle type="source" position={Position.Bottom} />
        </BaseNode>
      </TooltipTrigger>
      <TooltipContent>
        Click to view current tables and relationships (TODO)
      </TooltipContent>
    </Tooltip>
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
  placeholderData: PlaceholderDataNode,
  sqlScript: SQLScriptNode,
  labeledGroup: LabeledGroupNode,
};

enum LayoutingStep {
  Render = 1,
  Position,
  CreateGroups,
  FitView,
  Done,
}

export function QueryWorkflow() {
  const reactFlow = useReactFlow();

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

  const nodeWidthNotAvailable = nodes.some(
    (node) => node.measured?.width == null,
  );

  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;

  const dataWorkflow = useAppDbLiveQuery(
    () =>
      appDb.workflows
        .where("databaseId")
        .equals(currentDbId)
        .and((wf) => wf.type === "data")
        .first(),
    [currentDbId],
  );

  const schemaWorkflow = useAppDbLiveQuery(
    () =>
      appDb.workflows
        .where("databaseId")
        .equals(currentDbId)
        .and((wf) => wf.type === "schema")
        .first(),
    [currentDbId],
  );

  const [layoutingStep, setLayoutingStep] = useState(
    LayoutingStep.Render as LayoutingStep,
  );

  const fitView = () => {
    if (layoutingStep !== LayoutingStep.Done) return;
    reactFlow.fitView({ padding: 0.1 });
  };

  const ref = useRef<HTMLDivElement>(null);

  const fitViewDebounced = useDebounceCallback(fitView, 50);
  // @ts-expect-error useResizeObserver currently expects non-null ref, which is not expected in React 19.
  useResizeObserver({ ref, onResize: fitViewDebounced });

  // Render nodes
  useEffect(() => {
    if (typeof schemaWorkflow !== "object" || typeof dataWorkflow !== "object")
      return;

    let newNodes: Node[] = [
      {
        id: "root",
        type: "databaseSource",
        position: { x: 0, y: 0 },
        data: {},
      },
    ];

    const schemaSteps = schemaWorkflow.workflowSteps;

    if (schemaSteps.length === 0) {
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

        for (let i = 0; i < schemaSteps.length; i++) {
          const workflowInfo = {
            workflowIndex: i,
            workflowType: "schema",
          };

          if (schemaSteps[i].type === "sql-query") {
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

    const dataSteps = dataWorkflow.workflowSteps;

    if (dataSteps.length === 0) {
      newNodes = produce(newNodes, (draft) => {
        draft.push({
          id: "placeholder-data",
          type: "placeholderData",
          position: { x: 0, y: 0 },
          data: { compact: false, insertBefore: 0, section: "data" },
        } satisfies PlaceholderDataNode);
      });
    } else {
      newNodes = produce(newNodes, (draft) => {
        draft.push({
          id: "placeholder-data-0",
          type: "placeholderData",
          position: { x: 0, y: 0 },
          data: { compact: true, insertBefore: 0, section: "data" },
        } satisfies PlaceholderDataNode);

        for (let i = 0; i < dataSteps.length; i++) {
          const workflowInfo = {
            workflowIndex: i,
            workflowType: "data",
          };

          if (dataSteps[i].type === "sql-query") {
            draft.push({
              id: `data-step-${i}`,
              type: "sqlScript",
              position: { x: 0, y: 0 },
              data: {
                section: "data",
                ...workflowInfo,
              },
            });
          } else {
            continue;
          }

          draft.push({
            id: `placeholder-data-${i + 1}`,
            type: "placeholderData",
            position: { x: 0, y: 0 },
            data: { compact: true, insertBefore: i + 1, section: "data" },
          } satisfies PlaceholderDataNode);
        }
      });
    }

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
  }, [dataWorkflow, schemaWorkflow, setNodes]);

  // Position nodes
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
          curY += 70;
        } else if (
          i < draft.length - 1 &&
          ["end", "tables-created"].includes(draft[i + 1].id ?? "")
        ) {
          curY += 50;
        } else if (["tables-created"].includes(draft[i].id ?? "")) {
          curY += 70;
        } else {
          curY += 5;
        }
      }
    });

    setNodes(updatedNodes);
    setLayoutingStep(LayoutingStep.CreateGroups);
  }, [edges, nodes, layoutingStep, nodeWidthNotAvailable, setEdges, setNodes]);

  // Create groups after positioning
  useEffect(() => {
    if (layoutingStep !== LayoutingStep.CreateGroups) return;

    let updatedNodes = nodes;

    // Schema group
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

      let curY = 50;
      const centerX = groupWidth / 2;
      for (const node of schemaNodes) {
        node.parentId = "group-schema";
        const xShift = centerX - node.measured!.width! / 2;
        node.position = { x: xShift, y: curY };
        curY += node.measured!.height!;
        curY += 5;
      }
    });

    // Data group
    updatedNodes = produce(updatedNodes, (draft) => {
      const dataNodes = draft.filter((node) => node.data.section === "data");
      const bbox = reactFlow.getNodesBounds(dataNodes);
      const groupWidth = bbox.width + 40;

      const groupData = {
        id: "group-data",
        type: "labeledGroup",
        position: { x: bbox.x - 20, y: bbox.y - 40 },
        data: {
          label: "Populate data",
          backgroundClassName: "bg-green-200/50",
        },
        width: groupWidth,
        height: bbox.height + 60,
      };

      draft.unshift(groupData);

      let curY = 50;
      const centerX = groupWidth / 2;
      for (const node of dataNodes) {
        node.parentId = "group-data";
        const xShift = centerX - node.measured!.width! / 2;
        node.position = { x: xShift, y: curY };
        curY += node.measured!.height!;
        curY += 5;
      }
    });

    setNodes(updatedNodes);
    setLayoutingStep(LayoutingStep.FitView);
  }, [layoutingStep, nodes, reactFlow, setNodes]);

  // Fit view after layouting
  useEffect(() => {
    if (layoutingStep !== LayoutingStep.FitView) return;

    if (
      typeof schemaWorkflow !== "object" ||
      typeof dataWorkflow !== "object" ||
      // We don't want to fit view if there are too many nodes
      schemaWorkflow.workflowSteps.length + dataWorkflow.workflowSteps.length <=
        4
    ) {
      reactFlow.fitView({ padding: 0.1 });
    }
    setLayoutingStep(LayoutingStep.Done);
  }, [dataWorkflow, layoutingStep, reactFlow, schemaWorkflow]);

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
