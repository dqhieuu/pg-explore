import { AppSidebar } from "@/components/sections/app-sidebar";
import { DockviewCustomTab } from "@/components/sections/dockview-tab";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { createNewFile } from "@/lib/dexie/dexie-utils";
import { createWorkflowPanel, openFileEditor } from "@/lib/dockview";
import { memDbId } from "@/lib/utils";
import { PGliteProvider } from "@electric-sql/pglite-react";
import { DockviewReact, IDockviewPanelProps } from "@hieu_dq/dockview";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ReactFlowProvider } from "@xyflow/react";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";

import { QueryEditor, QueryEditorProps } from "../components/tabs/query-editor";
import { QueryResult, QueryResultProps } from "../components/tabs/query-result";
import { QueryWorkflow } from "../components/tabs/query-workflow";
import { useDockviewStore } from "../hooks/stores/use-dockview-store";
import { usePostgresStore } from "../hooks/stores/use-postgres-store";
import { appDb, useAppDbLiveQuery } from "../lib/dexie/app-db";

export const Route = createFileRoute("/database/$databaseId")({
  component: MainApp,
});

function NoEditors() {
  const dockviewApi = useDockviewStore((state) => state.dockviewApi);
  const currentDbId = usePostgresStore((state) => state.databaseId) ?? memDbId;

  const files =
    useAppDbLiveQuery(() => {
      return appDb.files.where("databaseId").equals(currentDbId).toArray();
    }) ?? [];

  return (
    <div className="w-full h-full bg-background flex flex-col items-center justify-center gap-2">
      {files.length === 0 ? (
        <>
          <div className="text-xl">Create a new file to get started</div>
          <Button
            onClick={async () => {
              if (dockviewApi == null) return;

              const fileId = await createNewFile(currentDbId, {
                prefix: "SQL Query",
                existingFileNames: files.map((f) => f.name),
              });

              openFileEditor(dockviewApi, fileId, "SQL Query 01");
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

function MainApp() {
  const navigate = useNavigate();
  const { databaseId } = Route.useParams();

  const setDockviewApi = useDockviewStore((state) => state.setDockviewApi);

  const pgDb = usePostgresStore((state) => state.database);
  const setPgDb = usePostgresStore((state) => state.setDatabase);

  useEffect(() => {
    (async () => {
      const appDbPgList = await appDb.databases.toArray();

      if (databaseId === "memory") {
        setPgDb(null);
      } else if (appDbPgList.find((db) => db.id === databaseId) != null) {
        setPgDb(databaseId);
        appDb.databases.update(databaseId, { lastOpened: new Date() });
      } else {
        navigate({ to: "/" });
      }
    })();
  }, [setPgDb, databaseId, navigate]);

  if (pgDb == null) {
    return (
      <div className="flex items-center justify-center h-[100dvh] gap-2">
        <LoaderCircle className="animate-spin" /> Loading database...
      </div>
    );
  }

  return (
    <PGliteProvider db={pgDb}>
      <ReactFlowProvider>
        <SidebarProvider className="flex w-full">
          <AppSidebar />
          <SidebarTrigger className="h-[100dvh] rounded-none flex items-start py-2 border-r" />

          <main className="flex-1 h-[100dvh]">
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
                queryEditor: (props: IDockviewPanelProps<QueryEditorProps>) => (
                  <QueryEditor
                    contextId={props.params.contextId}
                    fileId={props.params.fileId}
                  />
                ),
                queryResult: (props: IDockviewPanelProps<QueryResultProps>) => (
                  <div className="p-2 w-full h-full overflow-auto">
                    <QueryResult
                      contextId={props.params.contextId}
                      lotNumber={props.params.lotNumber}
                    />
                  </div>
                ),
                queryWorkflow: () => <QueryWorkflow />,
                noEditors: () => <NoEditors />,
              }}
              singleTabMode="fullwidth"
              className="dockview-theme-replit"
              defaultTabComponent={DockviewCustomTab}
              watermarkComponent={NoEditors}
            />
          </main>
        </SidebarProvider>
      </ReactFlowProvider>
    </PGliteProvider>
  );
}
