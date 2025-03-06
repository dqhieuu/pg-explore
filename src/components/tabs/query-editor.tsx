import { useDockviewStore } from "@/hooks/stores/use-dockview-store";
import { usePostgresStore } from "@/hooks/stores/use-postgres-store";
import { QueryResult, useQueryStore } from "@/hooks/stores/use-query-store";
import { pgLinter } from "@/lib/codemirror/pglinter";
import { appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db";
import { querySchema } from "@/lib/pglite/pg-utils";
import { PostgreSQL as PostgreSQLDialect, sql } from "@codemirror/lang-sql";
import { usePGlite } from "@electric-sql/pglite-react";
import CodeMirror from "@uiw/react-codemirror";
import { Save } from "lucide-react";
import { useEffect, useRef } from "react";
import { useDebounce } from "react-use";
import { toast } from "sonner";

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

  const associatedFile = useAppDbLiveQuery(() => appDb.files.get(fileId));
  const prevAssociatedFile = useRef(associatedFile);

  const dockviewApi = useDockviewStore((state) => state.dockviewApi);
  const setQueryResult = useQueryStore((state) => state.setQueryResult);

  const queryEditorValue = useQueryStore(
    (state) => state.queryEditors[contextId],
  );
  const setQueryEditorValue = useQueryStore(
    (state) => state.setQueryEditorValue,
  );

  const isSaved =
    useQueryStore((state) => state.queryEditorsSaved[contextId]) ?? true;
  const shouldSave = useQueryStore(
    (state) => state.queryEditorsShouldSave[contextId],
  );
  const setShouldSave = useQueryStore(
    (state) => state.setQueryEditorShouldSave,
  );

  const schema = usePostgresStore((state) => state.schema);
  const setSchema = usePostgresStore((state) => state.setSchema);

  function createQueryResultTabsIfNeeded(result: object[]) {
    if (dockviewApi == null) return;

    let resultGroup = dockviewApi.getGroup("result-group");

    if (resultGroup == null) {
      resultGroup = dockviewApi.addGroup({
        id: "result-group",
        referencePanel: fileId,
        direction: "below",
      });
    }

    for (let i = 0; i < result.length; i++) {
      const resultPanelId = `${contextId}_${i}`;

      if (!dockviewApi.getPanel(resultPanelId)) {
        dockviewApi.addPanel({
          id: resultPanelId,
          title: `Result: [${i + 1}] ${associatedFile?.name ?? "Untitled"}`,
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

  useDebounce(
    () => {
      if (!isSaved) setShouldSave(contextId, true);
    },
    3000,
    [queryEditorValue],
  );

  // Component first mount, set the query editor value
  useEffect(() => {
    if (associatedFile == null) {
      // Nothing is loaded yet. Do nothing
      if (prevAssociatedFile.current == null) return;

      // File state changed from valued to null -> close the panel
      dockviewApi?.getPanel(fileId)?.api?.close();
      return;
    }

    prevAssociatedFile.current = associatedFile;

    setQueryEditorValue(contextId, associatedFile.content ?? "", true);
  }, [
    contextId,
    fileId,
    associatedFile,
    dockviewApi,
    setQueryEditorValue,
    setShouldSave,
  ]);

  useEffect(() => {
    // Save the query editor value to the database if needed
    if (!shouldSave) return;

    appDb.files
      .update(fileId, {
        content: queryEditorValue,
      })
      .then(() => {
        console.log(`Saved query editor value for ${fileId}`);
      });
  }, [shouldSave, fileId, queryEditorValue]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-1 flex gap-2">
        <Save
          className={
            (isSaved ? "text-green-700" : "text-red-800") +
            (import.meta.env.DEV ? " " : " hidden")
          }
        />
        <Button
          className="h-7 p-3"
          onClick={async () => {
            db.exec("rollback;" + (queryEditorValue ?? ""))
              .then((res) => {
                const result = (res as unknown as QueryResult[])
                  .slice(1)
                  .filter(filterNonSelectResult);

                if (result.length === 0) {
                  toast("Executed successfully!", {
                    description: "No result returned.",
                    duration: 1000,
                  });
                  return;
                }

                setQueryResult(contextId, result);
                createQueryResultTabsIfNeeded(result);
              })
              .catch((err) => {
                const result = [err.message];
                setQueryResult(contextId, result);
                createQueryResultTabsIfNeeded(result);
              });

            querySchema(db).then(setSchema);
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
            defaultSchema: "public",
            schema,
          }),
          pgLinter(db),
        ]}
      />
    </div>
  );
}
