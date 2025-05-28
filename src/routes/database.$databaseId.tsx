import { AppSidebar } from "@/components/sections/app-sidebar";
import { DockviewCustomTab } from "@/components/sections/dockview-tab";
import { ExtensionListDialogContent } from "@/components/sections/extension-list-dialog-content.tsx";
import { AiChat } from "@/components/tabs/ai-chat.tsx";
import { DbmlEditor } from "@/components/tabs/dbml-editor.tsx";
import {
  SqlQueryEditor,
  SqlQueryEditorProps,
} from "@/components/tabs/sql-query-editor.tsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog.tsx";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAnimationStore } from "@/hooks/stores/use-animation-store";
import { CURRENT_POSTGRES_VERSION } from "@/lib/constants.ts";
import {
  createNewFile,
  getDatabaseFiles,
  getWorkflow,
} from "@/lib/dexie/dexie-utils";
import { createWorkflowPanel, openFileEditor } from "@/lib/dockview";
import { WorkflowMonitorProvider } from "@/lib/pglite/workflow-monitor.tsx";
import { guid, memDbId } from "@/lib/utils";
import { PGliteProvider } from "@electric-sql/pglite-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ReactFlowProvider } from "@xyflow/react";
import { DockviewReact, IDockviewPanelProps, themeReplit } from "dockview";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { QueryEditorProps } from "../components/tabs/base/query-editor.tsx";
import { QueryResult, QueryResultProps } from "../components/tabs/query-result";
import { QueryWorkflow } from "../components/tabs/query-workflow";
import { useDockviewStore } from "../hooks/stores/use-dockview-store";
import { usePostgresStore } from "../hooks/stores/use-postgres-store";
import { WorkflowState, appDb, useAppDbLiveQuery } from "../lib/dexie/app-db";

export const Route = createFileRoute("/database/$databaseId")({
  component: MainApp,
});

function NoEditors() {
  const dockviewApi = useDockviewStore((state) => state.dockviewApi);
  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;

  const files = useAppDbLiveQuery(() => getDatabaseFiles(currentDbId)) ?? [];

  return (
    <div className="bg-background flex h-full w-full flex-col items-center justify-center gap-2">
      {files.length === 0 ? (
        <>
          <div className="text-xl">Create a new file to get started</div>
          <Button
            onClick={async () => {
              if (dockviewApi == null) return;

              const fileId = await createNewFile(currentDbId, {
                type: "sql",
                prefix: "SQL Query",
                existingFileNames: files.map((f) => f.name),
              });

              openFileEditor(dockviewApi, fileId);
            }}
          >
            Create new file
          </Button>
        </>
      ) : (
        <>
          <div className="text-xl">No files opened.</div>
          <Button>Browse files</Button>
        </>
      )}
    </div>
  );
}

const newSchemaWorkflowId = guid();
const newDataWorkflowId = guid();

function LoadingPlaceholder() {
  return (
    <div className="flex h-[100dvh] items-center justify-center gap-2">
      <LoaderCircle className="animate-spin" /> Loading database...
    </div>
  );
}

function MainApp() {
  const navigate = useNavigate();
  const { databaseId: databaseIdUrlPath } = Route.useParams();

  const setDockviewApi = useDockviewStore((state) => state.setDockviewApi);

  const pgDb = usePostgresStore((state) => state.database);
  const setPgDb = usePostgresStore((state) => state.setDatabase);

  const internalDbId = usePostgresStore((state) => state.databaseId);
  const currentDbId = internalDbId ?? memDbId;

  const dataWorkflow = useAppDbLiveQuery(
    () => getWorkflow(currentDbId, "data"),
    [currentDbId],
    "loading",
  );

  const schemaWorkflow = useAppDbLiveQuery(
    () => getWorkflow(currentDbId, "schema"),
    [currentDbId],
    "loading",
  );

  const extensionsDialogOpen = useAnimationStore(
    (state) => state.extensionsDialogOpen,
  );

  const setExtensionsDialogOpen = useAnimationStore(
    (state) => state.setExtensionsDialogOpen,
  );

  const enabledExtensionsChanged = usePostgresStore(
    (state) => state.enabledExtensionsChanged,
  );
  const setEnabledExtensionsChanged = usePostgresStore(
    (state) => state.setEnabledExtensionsChanged,
  );

  useEffect(() => {
    (async () => {
      const appDbPgList = await appDb.databases.toArray();

      if (databaseIdUrlPath === "memory") {
        setPgDb(null);
      } else if (
        appDbPgList.find((db) => db.id === databaseIdUrlPath) != null
      ) {
        setPgDb(databaseIdUrlPath);
        appDb.databases.update(databaseIdUrlPath, { lastOpened: new Date() });
      } else {
        navigate({ to: "/" });
      }
    })();
  }, [setPgDb, databaseIdUrlPath, navigate]);

  useEffect(() => {
    if (pgDb == null) return;

    if (schemaWorkflow == null) {
      appDb.workflows.put({
        id: newSchemaWorkflowId,
        databaseId: currentDbId,
        type: "schema",
        name: "",
        workflowSteps: [],
      });
    }

    if (dataWorkflow == null) {
      appDb.workflows.put({
        id: newDataWorkflowId,
        databaseId: currentDbId,
        type: "data",
        name: "",
        workflowSteps: [],
      });
    }

    (async () => {
      let db = await appDb.databases.get(currentDbId);

      if (db == null) {
        await appDb.databases.add({
          id: currentDbId,
          name: "In-memory database",
          createdAt: new Date(),
          lastOpened: new Date(),
          enabledExtensions: [],
          version: CURRENT_POSTGRES_VERSION,
        });

        db = await appDb.databases.get(currentDbId);

        if (db == null) {
          throw new Error("Failed to create database");
        }
      }

      if (db.workflowState == null) {
        appDb.databases.update(currentDbId, {
          workflowState: {
            schemaWorkflowId: newSchemaWorkflowId,
            dataWorkflowId: newDataWorkflowId,
            currentProgress: "schema",
            stepsDone: 0,
            stepResults: [],
          } satisfies WorkflowState,
        });
      }
    })();
  }, [pgDb, currentDbId, dataWorkflow, schemaWorkflow]);

  if (pgDb == null) {
    return <LoadingPlaceholder />;
  }

  return (
    <PGliteProvider db={pgDb}>
      <WorkflowMonitorProvider>
        <ReactFlowProvider>
          <SidebarProvider className="flex w-full">
            <Dialog
              open={extensionsDialogOpen}
              onOpenChange={(open) => {
                setExtensionsDialogOpen(open);
                if (!open && enabledExtensionsChanged) {
                  setPgDb(internalDbId);
                  toast("Extensions updated!", {
                    duration: 1000,
                  });
                  setEnabledExtensionsChanged(false);
                }
              }}
            >
              <AppSidebar />
              <SidebarTrigger className="flex h-[100dvh] items-start rounded-none border-r py-2" />
              <main className="h-[100dvh] flex-1">
                <DockviewReact
                  onReady={(event) => {
                    setDockviewApi(event.api);

                    const editorGroup = event.api.addGroup({
                      direction: "right",
                      id: "editor-group",
                    });

                    event.api.addPanel({
                      id: "no-editors",
                      title: "No files opened",
                      component: "noEditors",
                      position: {
                        referenceGroup: editorGroup,
                      },
                    });

                    createWorkflowPanel(event.api, true);
                  }}
                  components={{
                    sqlQueryEditor: (
                      props: IDockviewPanelProps<SqlQueryEditorProps>,
                    ) => (
                      <SqlQueryEditor
                        contextId={props.params.contextId}
                        fileId={props.params.fileId}
                      />
                    ),
                    dbmlEditor: (
                      props: IDockviewPanelProps<QueryEditorProps>,
                    ) => (
                      <DbmlEditor
                        contextId={props.params.contextId}
                        fileId={props.params.fileId}
                      />
                    ),
                    queryResult: (
                      props: IDockviewPanelProps<QueryResultProps>,
                    ) => (
                      <div className="h-full w-full overflow-auto p-2">
                        <QueryResult
                          contextId={props.params.contextId}
                          lotNumber={props.params.lotNumber}
                        />
                      </div>
                    ),
                    queryWorkflow: () => <QueryWorkflow />,
                    noEditors: () => <NoEditors />,
                    aiChat: () => <AiChat />,
                  }}
                  singleTabMode="fullwidth"
                  theme={{ ...themeReplit, gap: 0 }}
                  defaultTabComponent={DockviewCustomTab}
                  watermarkComponent={NoEditors}
                />
              </main>

              <DialogContent>
                <ExtensionListDialogContent databaseId={currentDbId} />
              </DialogContent>
            </Dialog>
          </SidebarProvider>
        </ReactFlowProvider>
      </WorkflowMonitorProvider>
    </PGliteProvider>
  );
}
