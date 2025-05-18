import { appDb } from "@/lib/dexie/app-db.ts";
import { DockviewApi } from "dockview";

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
    const editorGroup = dockviewApi.getGroup("editor-group");
    if (editorGroup == null) {
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
      `There isn't a suitable component for this file type ${file.type}`,
    );
    return;
  }

  let editorGroup = dockviewApi.getGroup("editor-group");

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

  const editorGroup = dockviewApi.getGroup("editor-group");

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
