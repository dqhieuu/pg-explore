import { AppSidebar } from "@/components/sections/app-sidebar";
import { DockviewCustomTab } from "@/components/sections/dockview-tab";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PGliteProvider } from "@electric-sql/pglite-react";
import { DockviewReact, IDockviewPanelProps } from "@hieu_dq/dockview";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";

import { QueryEditor, QueryEditorProps } from "../components/tabs/query-editor";
import { QueryResult, QueryResultProps } from "../components/tabs/query-result";
import { QueryWorkflow } from "../components/tabs/query-workflow";
import { useDockviewStore } from "../hooks/stores/use-dockview-store";
import { usePostgresStore } from "../hooks/stores/use-postgres-store";
import { appDb } from "../lib/dexie/app-db";

export const Route = createFileRoute("/database/$databaseId")({
  component: MainApp,
});

function MainApp() {
  const navigate = useNavigate();
  const { databaseId } = Route.useParams();

  const setDockviewApi = useDockviewStore((state) => state.setDockviewApi);

  const pgDb = usePostgresStore((state) => state.database);
  const setPgDb = usePostgresStore((state) => state.setDatabase);

  useEffect(() => {
    (async () => {
      const appDbPgList = await appDb.databases.toArray();

      if (appDbPgList == null) {
        return;
      }

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
      <SidebarProvider className="flex w-full">
        <AppSidebar />
        <SidebarTrigger className="h-[100dvh] rounded-none flex items-start py-2" />

        <main className="flex-1 h-[100dvh]">
          <DockviewReact
            onReady={(event) => {
              setDockviewApi(event.api);

              event.api.addGroup({
                direction: "right",
                id: "editor-group",
              });

              if (window.screen.width >= 1000) {
                const workflowGroup = event.api.addGroup({
                  direction: "left",
                  id: "workflow-group",
                });
                event.api.addPanel({
                  id: "workflow",
                  title: "Workflow",
                  component: "queryWorkflow",
                  initialWidth: window.screen.width * 0.2,
                  position: {
                    referenceGroup: workflowGroup,
                  },
                });
              }
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
            }}
            singleTabMode="fullwidth"
            className="dockview-theme-replit"
            defaultTabComponent={DockviewCustomTab}
          />
        </main>
      </SidebarProvider>
    </PGliteProvider>
  );
}
