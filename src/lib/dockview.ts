import { DockviewApi } from "@hieu_dq/dockview";

export function createWorkflowPanel(
  dockviewApi: DockviewApi,
  skipIfSmallScreen = false,
) {
  if (dockviewApi.getPanel("workflow") != null) return;

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
