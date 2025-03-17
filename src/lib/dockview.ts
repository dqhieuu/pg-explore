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

export function openFileEditor(
  dockviewApi: DockviewApi,
  fileId: string,
  fileName?: string,
) {
  if (dockviewApi == null) return;

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
    component: "queryEditor",
    title: fileName ?? fileId,
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
