import { AppSidebar } from "@/components/sections/app-sidebar";
import { DockviewCustomTab } from "@/components/sections/dockview-tab";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PGliteProvider } from "@electric-sql/pglite-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DockviewReact, IDockviewPanelProps } from "dockview";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";

import { QueryEditor, QueryEditorProps } from "../components/tabs/query-editor";
import { QueryResult, QueryResultProps } from "../components/tabs/query-result";
import { QueryWorkflow } from "../components/tabs/query-workflow";
import { useDockviewStore } from "../hooks/stores/use-dockview-store";
import { usePostgresStore } from "../hooks/stores/use-postgres-store";
import { appDb, useAppDbLiveQuery } from "../lib/dexie/app-db";
import { guid } from "../lib/utils";

export const Route = createFileRoute("/database/$databaseId")({
  component: MainApp,
});

function MainApp() {
  const navigate = useNavigate();

  const { databaseId } = Route.useParams();

  const setDockviewApi = useDockviewStore((state) => state.setDockviewApi);

  const pgDb = usePostgresStore((state) => state.database);
  const setPgDb = usePostgresStore((state) => state.setDatabase);

  const appDbPgList = useAppDbLiveQuery(() => appDb.databases.toArray());

  useEffect(() => {
    (async () => {
      if (appDbPgList == null) {
        return;
      }

      if (appDbPgList.find((db) => db.id === databaseId) == null) {
        navigate({ to: "/" });
      } else {
        setPgDb(databaseId);
      }
    })();
  }, [setPgDb, appDbPgList, databaseId, navigate]);

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
        <SidebarTrigger />

        <main className="flex-1 h-[100dvh]">
          <DockviewReact
            onReady={(event) => {
              setDockviewApi(event.api);

              const contextId = guid();
              const editorPanel = event.api.addPanel({
                id: "panel_1",
                component: "queryEditor",
                params: {
                  contextId,
                },
                position: {
                  direction: "right",
                },
              });
              event.api.addPanel({
                id: "panel_3",
                component: "queryWorkflow",
                initialWidth: 400,
                position: {
                  referencePanel: editorPanel,
                  direction: "left",
                },
              });
            }}
            components={{
              queryEditor: (props: IDockviewPanelProps<QueryEditorProps>) => (
                <QueryEditor contextId={props.params.contextId} />
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
              // repl: () => <Repl pg={db} />,
            }}
            tabComponents={{}}
            singleTabMode="fullwidth"
            className="dockview-theme-replit"
            defaultTabComponent={DockviewCustomTab}
          />
        </main>
      </SidebarProvider>
    </PGliteProvider>
  );
}
