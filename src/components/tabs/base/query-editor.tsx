import { useDockviewStore } from "@/hooks/stores/use-dockview-store.ts";
import { usePostgresStore } from "@/hooks/stores/use-postgres-store.ts";
import { QueryResult, useQueryStore } from "@/hooks/stores/use-query-store.ts";
import { appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db.ts";
import {
  evaluateSql,
  querySchemaForCodeMirror,
} from "@/lib/pglite/pg-utils.ts";
import { useWorkflowMonitor } from "@/lib/pglite/use-workflow-monitor.ts";
import { devModeEnabled } from "@/lib/utils.ts";
import { Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { PGliteInterface } from "@electric-sql/pglite";
import { usePGlite } from "@electric-sql/pglite-react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { Save } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useDebounce } from "react-use";
import { toast } from "sonner";
import { useDebounceCallback } from "usehooks-ts";

const filterNonSelectResult = (result: QueryResult) => {
  return result?.fields?.length > 0;
};

export interface QueryEditorProps {
  contextId: string;
  fileId: string;
  extensions?: ((ctx: QueryEditorContext) => Extension)[];
  headerComponent?: (ctx: QueryEditorContext) => ReactNode;
}

export interface QueryEditorContext {
  executeCurrentQuery: () => void;
  currentDatabase: PGliteInterface;
  currentSchema: Record<string, string[]>;
  isHighlightingSelection: boolean;
}

export function QueryEditor({
  contextId,
  fileId,
  extensions,
  headerComponent,
}: QueryEditorProps) {
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

  const editor = useRef<ReactCodeMirrorRef>(null);
  const [selectionRange, setSelectionRange] = useState<[number, number]>([
    0, 0,
  ]);
  const setSelectionRangeDebounced = useDebounceCallback(setSelectionRange, 50);
  const isHighlightingSelection = selectionRange[0] < selectionRange[1];

  const { notifyModifyEditor, notifyRunArbitraryQuery } = useWorkflowMonitor();

  const [, cancelDebouncedSave] = useDebounce(
    () => {
      if (isSaved) return;
      setShouldSave(contextId, true);
    },
    3000,
    [queryEditorValue],
  );

  const ctx: QueryEditorContext = {
    executeCurrentQuery: executeQuery,
    currentDatabase: db,
    currentSchema: schema,
    isHighlightingSelection,
  };

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
    setShouldSave(contextId, false);
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

    appDb.files.update(fileId, {
      content: queryEditorValue,
    });
  }, [shouldSave, fileId, queryEditorValue]);

  function createQueryResultTabsIfNeeded(result: object[]) {
    if (dockviewApi == null) return;

    let resultGroup = dockviewApi.getGroup("result-group");

    if (resultGroup == null) {
      resultGroup = dockviewApi.addGroup({
        id: "result-group",
        referencePanel: fileId,
        direction: window.screen.width >= 1000 ? "right" : "below",
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

  async function executeQuery() {
    const sqlToQuery = isHighlightingSelection
      ? queryEditorValue.slice(...selectionRange)
      : queryEditorValue;

    await notifyRunArbitraryQuery(fileId);

    evaluateSql(db, sqlToQuery)
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

    querySchemaForCodeMirror(db).then(setSchema);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b p-1">
        <Save
          className={
            (isSaved ? "text-green-700" : "text-red-800") +
            (devModeEnabled() ? " " : " hidden")
          }
        />
        {headerComponent != null && headerComponent(ctx)}
      </div>

      <CodeMirror
        ref={editor}
        value={queryEditorValue}
        className="flex-1"
        width="100%"
        height="100%"
        onUpdate={(update) => {
          const newSelectionRanges = update.view.state.selection.ranges;

          if (
            newSelectionRanges.length != 1 ||
            newSelectionRanges[0].from >= newSelectionRanges[0].to
          ) {
            if (selectionRange[0] != 0 || selectionRange[1] != 0) {
              setSelectionRangeDebounced([0, 0]);
            }
            return;
          }

          if (
            selectionRange[0] != newSelectionRanges[0].from ||
            selectionRange[1] != newSelectionRanges[0].to
          ) {
            setSelectionRangeDebounced([
              newSelectionRanges[0].from,
              newSelectionRanges[0].to,
            ]);
          }
        }}
        onChange={async (val) => {
          await notifyModifyEditor(fileId);
          setQueryEditorValue(contextId, val);
        }}
        extensions={[
          ...(extensions != null ? extensions.map((e) => e(ctx)) : []),

          keymap.of([
            {
              key: "Mod-s",
              preventDefault: true,
              run: () => {
                cancelDebouncedSave();
                setShouldSave(contextId, true);
                toast("File saved!", {
                  duration: 1000,
                });

                return true;
              },
            },
          ]),
        ]}
      />
    </div>
  );
}
