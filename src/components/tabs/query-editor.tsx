import { useDockviewStore } from "@/hooks/stores/use-dockview-store";
import { QueryResult, useQueryStore } from "@/hooks/stores/use-query-store";
import { pgLinter } from "@/lib/codemirror/pglinter";
import { appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db";
import { PostgreSQL as PostgreSQLDialect, sql } from "@codemirror/lang-sql";
import { usePGlite } from "@electric-sql/pglite-react";
import CodeMirror from "@uiw/react-codemirror";
import { Save } from "lucide-react";
import { useEffect } from "react";

import { Button } from "../ui/button";

const filterNonSelectResult = (result: QueryResult) => {
  return result?.fields?.length > 0;
};

export interface QueryEditorProps {
  contextId: string;
  fileId: string;
}
export function QueryEditor({ contextId, fileId }: QueryEditorProps) {
  const db = usePGlite();

  const dockviewApi = useDockviewStore((state) => state.dockviewApi);
  const setQueryResult = useQueryStore((state) => state.setQueryResult);

  const allotQueryResultPanel = useQueryStore(
    (state) => state.allotQueryResultPanel,
  );
  const queryResultLots = useQueryStore(
    (state) => state.queryResultPanelLots[contextId],
  );

  const setQueryEditorValue = useQueryStore(
    (state) => state.setQueryEditorValue,
  );

  const associatedFile = useAppDbLiveQuery(() => appDb.files.get(fileId));

  const queryEditorValue = useQueryStore(
    (state) => state.queryEditors[contextId],
  );
  const isSaved =
    useQueryStore((state) => state.queryEditorsSaved[contextId]) ?? true;
  const shouldSave = useQueryStore(
    (state) => state.queryEditorsShouldSave[contextId],
  );

  // Component first mount, set the query editor value
  useEffect(() => {
    if (associatedFile == null) return;

    setQueryEditorValue(contextId, associatedFile.content ?? "", true);
  }, [associatedFile, contextId, setQueryEditorValue]);

  // Save the query editor value to the database if needed
  useEffect(() => {
    if (!shouldSave) return;

    appDb.files.update(fileId, {
      content: queryEditorValue,
    });
  }, [fileId, queryEditorValue, shouldSave]);

  function createQueryResultTabsIfNeeded(result: object[]) {
    if (dockviewApi == null) return;

    const lotsNeeded = result.length;

    for (let i = 0; i < lotsNeeded; i++) {
      if (queryResultLots == null || queryResultLots[i] !== true) {
        allotQueryResultPanel(contextId, i);
        if (dockviewApi.getGroup("result-group") == null) {
          dockviewApi.addGroup({
            id: "result-group",
            referencePanel: fileId,
            direction: "below",
          });
        }

        dockviewApi.addPanel({
          id: `${contextId}_${i}`,
          title: `Result: ${associatedFile?.name ?? "Untitled"}`,
          component: "queryResult",
          params: {
            contextId,
            lotNumber: i,
          },
          position: {
            referenceGroup: "result-group",
          },
        });
      }
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-1 flex gap-2">
        <Save className={isSaved ? "text-green-700" : "text-red-800"} />
        <Button
          className="h-7 p-3"
          onClick={() => {
            db.exec("rollback;" + (queryEditorValue ?? ""))
              .then((res) => {
                const result = (res as unknown as QueryResult[])
                  .slice(1)
                  .filter(filterNonSelectResult);
                setQueryResult(contextId, result);
                createQueryResultTabsIfNeeded(result);
              })
              .catch((err) => {
                const result = [err.message];
                setQueryResult(contextId, result);
                createQueryResultTabsIfNeeded(result);
              });
          }}
        >
          Query
        </Button>
      </div>

      <CodeMirror
        value={queryEditorValue}
        className="flex-1"
        width="100%"
        height="100%"
        onChange={(val) => {
          setQueryEditorValue(contextId, val);
        }}
        extensions={[
          sql({
            dialect: PostgreSQLDialect,
          }),
          pgLinter(db),
        ]}
      />
    </div>
  );
}
