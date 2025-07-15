import { QueryResult, QueryStore } from "@/hooks/stores/use-query-store.ts";
import { appDb } from "@/lib/dexie/app-db.ts";
import { evaluateSql } from "@/lib/pglite/pg-utils.ts";
import { PGliteInterface } from "@electric-sql/pglite";
import { DockviewApi, DockviewGroupPanel } from "dockview";
import { toast } from "sonner";

import { guid } from "./utils";

export function createWorkflowPanel(
  dockviewApi: DockviewApi,
  skipIfSmallScreen = false,
) {
  const existingPanel = dockviewApi.getPanel("workflow");
  if (existingPanel != null) {
    existingPanel.focus();
    return;
  }

  const workflowPanel = {
    id: "workflow",
    title: "Workflow",
    component: "queryWorkflow",
  };

  if (window.screen.width >= 1000) {
    const workflowGroup = dockviewApi.addGroup({
      direction: "left",
      id: "workflow-group",
    });
    dockviewApi.addPanel({
      ...workflowPanel,
      initialWidth: window.screen.width * 0.2,
      position: {
        referenceGroup: workflowGroup,
      },
    });
  } else if (!skipIfSmallScreen) {
    const editorGroup = dockviewApi.getGroup("editor-group") as
      | DockviewGroupPanel
      | undefined;
    if (editorGroup != null) {
      dockviewApi.addPanel({
        ...workflowPanel,
        position: {
          referenceGroup: editorGroup,
          direction: "within",
        },
      });
    } else {
      dockviewApi.addPanel(workflowPanel);
    }
  }
}

const fileTypeToComponent = {
  sql: "sqlQueryEditor",
  dbml: "dbmlEditor",
  table: "dataTableEditor",
};

export async function openFileEditor(dockviewApi: DockviewApi, fileId: string) {
  if (dockviewApi == null) return;

  const file = await appDb.files.get(fileId);
  if (!file) {
    console.error(`Could not find file ${fileId} to open file editor`);
    return;
  }

  const componentToAdd = fileTypeToComponent[file.type];
  if (componentToAdd == null) {
    console.error(
      `There isn't a suitable component for this file type '${file.type}'`,
    );
    return;
  }

  let editorGroup = dockviewApi.getGroup("editor-group") as
    | DockviewGroupPanel
    | undefined;

  if (editorGroup == null) {
    editorGroup = dockviewApi.addGroup({
      id: "editor-group",
      direction: "right",
    });
  }

  const existingPanel = dockviewApi.getPanel(fileId);
  if (existingPanel != null) {
    existingPanel.focus();
    return;
  }

  dockviewApi.addPanel({
    id: fileId,
    component: componentToAdd,
    title: file.name,
    params: {
      fileId,
      contextId: guid(),
    },
    position: {
      referenceGroup: editorGroup,
      direction: "within",
    },
  });

  dockviewApi.getPanel("no-editors")?.api?.close();
}

export function openAiChat(dockviewApi: DockviewApi) {
  if (dockviewApi == null) return;

  const existingPanel = dockviewApi.getPanel("ai-chat");
  if (existingPanel != null) {
    existingPanel.focus();
    return;
  }

  const editorGroup = dockviewApi.getGroup("editor-group") as
    | DockviewGroupPanel
    | undefined;

  dockviewApi.addPanel({
    id: "ai-chat",
    title: "AI Chat",
    component: "aiChat",
    position:
      editorGroup == null
        ? {
            direction: "right",
          }
        : {
            referenceGroup: editorGroup,
            direction: "below",
          },
  });
}

export function createQueryResultTabsIfNeeded({
  dockviewApi,
  numOfTabs,
  contextId,
  referencePanel,
  tabName,
}: {
  dockviewApi: DockviewApi;
  numOfTabs: number;
  contextId: string;
  referencePanel?: string;
  tabName?: string;
  tabNameIncludesIndex?: boolean;
}) {
  if (dockviewApi == null) return;

  let resultGroup = dockviewApi.getGroup("result-group") as
    | DockviewGroupPanel
    | undefined;

  if (resultGroup == null) {
    resultGroup = dockviewApi.addGroup({
      id: "result-group",
      referencePanel: referencePanel,
      direction: window.screen.width >= 1000 ? "right" : "below",
    });
  }

  for (let i = 0; i < numOfTabs; i++) {
    const resultPanelId = `${contextId}_${i}`;

    if (!dockviewApi.getPanel(resultPanelId)) {
      dockviewApi.addPanel({
        id: resultPanelId,
        title: `Result #${i + 1}: ${tabName ?? "Untitled"}`,
        component: "queryResult",
        params: {
          contextId,
          lotNumber: i,
        },
        position: {
          referenceGroup: resultGroup,
        },
      });
    }
  }
}

export async function executeQueryAndShowResults({
  db,
  setQueryResult,
  dockviewApi,
  query,
  contextId,
  referencePanel,
  tabName,
}: {
  db: PGliteInterface;
  setQueryResult: QueryStore["setQueryResult"];
  query: string;
  contextId: string;
  dockviewApi?: DockviewApi | null;
  referencePanel?: string;
  tabName?: string;
}) {
  const createResultTabs = (numOfResults: number) => {
    if (dockviewApi == null) return;
    createQueryResultTabsIfNeeded({
      dockviewApi: dockviewApi,
      numOfTabs: numOfResults,
      contextId: contextId,
      referencePanel: referencePanel,
      tabName: tabName,
    });
  };

  evaluateSql(db, query)
    .then((res) => {
      const results = (res as unknown as QueryResult[])
        .slice(1) // Skip the first result, which is the `rollback;` hack
        .filter((result: QueryResult) => {
          // Filter out empty results
          return result?.fields?.length > 0;
        });

      if (results.length === 0) {
        toast("Executed successfully!", {
          description: "No result returned.",
          duration: 1000,
        });
        return;
      }

      setQueryResult(contextId, results);
      createResultTabs(results.length);
    })
    .catch((err) => {
      const results = [err.message];
      setQueryResult(contextId, results);
      createResultTabs(results.length);
    });
}
