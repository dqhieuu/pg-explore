import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useDockviewStore } from "@/hooks/stores/use-dockview-store.ts";
import { usePostgresStore } from "@/hooks/stores/use-postgres-store.ts";
import { useQueryStore } from "@/hooks/stores/use-query-store.ts";
import { useSettingsStore } from "@/hooks/stores/use-settings-store.ts";
import { appDb, useAppDbLiveQuery } from "@/lib/dexie/app-db.ts";
import { executeQueryAndShowResults } from "@/lib/dockview.ts";
import { querySchemaForCodeMirror } from "@/lib/pglite/pg-utils.ts";
import { useWorkflowMonitor } from "@/lib/pglite/use-workflow-monitor.ts";
import { TransformValueResult } from "@/lib/types.ts";
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

export interface QueryEditorProps {
  contextId: string;
  fileId: string;
  extensions?: ((ctx: QueryEditorContext) => Extension)[];
  headerComponent?: (ctx: QueryEditorContext) => ReactNode;
  generatedViewConfig?: GeneratedViewConfig;
}

export interface QueryEditorContext {
  executeCurrentQuery: () => void;
  currentDatabase: PGliteInterface;
  currentSchema: Record<string, string[]>;
  isHighlightingSelection: boolean;
}

interface GeneratedViewConfig {
  transformFunc: (content?: string) => TransformValueResult;
  extensions?: ((ctx: QueryEditorContext) => Extension)[];
}

export function QueryEditor({
  contextId,
  fileId,
  extensions,
  headerComponent,
  generatedViewConfig,
}: QueryEditorProps) {
  const db = usePGlite();

  const associatedFile = useAppDbLiveQuery(() => appDb.files.get(fileId));
  const prevAssociatedFile = useRef(associatedFile);

  const dockviewApi = useDockviewStore((state) => state.dockviewApi);
  const setQueryResult = useQueryStore((state) => state.setQueryResult);

  const queryEditorValue =
    useQueryStore((state) => state.queryEditors[contextId]) ?? "";
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

  const theme = useSettingsStore((state) => state.resolvedTheme);

  const [, cancelDebouncedSave] = useDebounce(
    () => {
      if (isSaved) return;
      setShouldSave(contextId, true);
    },
    3000,
    [queryEditorValue],
  );

  const [generatedEditorView, setGeneratedEditorView] = useState("original");
  const [generatedEditorValue, setGeneratedEditorValue] = useState<
    string | null
  >(null);

  const ctx: QueryEditorContext = {
    executeCurrentQuery: executeQuery,
    currentDatabase: db,
    currentSchema: schema,
    isHighlightingSelection,
  };

  useEffect(() => {
    if (generatedViewConfig != null) {
      const transformOriginalValueRes =
        generatedViewConfig.transformFunc(queryEditorValue);

      if (
        transformOriginalValueRes.success &&
        transformOriginalValueRes.value != null
      ) {
        setGeneratedEditorValue(transformOriginalValueRes.value);
      }
    }
  }, [generatedViewConfig, queryEditorValue]);

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

  async function executeQuery() {
    const sqlToQuery = isHighlightingSelection
      ? queryEditorValue.slice(...selectionRange)
      : queryEditorValue;

    await notifyRunArbitraryQuery(fileId);

    await executeQueryAndShowResults({
      db,
      setQueryResult,
      query: sqlToQuery,
      contextId,
      dockviewApi,
      referencePanel: fileId,
      tabName: associatedFile?.name,
    });

    querySchemaForCodeMirror(db).then(setSchema);
  }

  const generatedViewExtensions = generatedViewConfig?.extensions ?? [];
  const GeneratedView = () =>
    generatedViewConfig != null ? (
      <CodeMirror
        value={generatedEditorValue ?? "-- Value currently unavailable."}
        theme={theme}
        extensions={[...generatedViewExtensions.map((e) => e(ctx))]}
        className="h-full w-full flex-1"
        width="100%"
        height="100%"
        readOnly={true}
      />
    ) : (
      <></>
    );

  return (
    <div className="@container flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b p-1">
        <Save
          className={
            (isSaved ? "text-green-700" : "text-red-800") +
            (devModeEnabled() ? " " : " hidden")
          }
        />
        {generatedViewConfig != null && (
          <Tabs
            value={generatedEditorView}
            className="h-8"
            onValueChange={setGeneratedEditorView}
          >
            <TabsList>
              <TabsTrigger value="original">Editor</TabsTrigger>
              <TabsTrigger value="generated">Generated</TabsTrigger>
              <TabsTrigger value="split">Split view</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {headerComponent != null && headerComponent(ctx)}
      </div>

      <div className="flex flex-1 flex-col items-center @2xl:flex-row">
        {(generatedEditorView === "original" ||
          generatedEditorView === "split") && (
          <CodeMirror
            ref={editor}
            value={queryEditorValue}
            theme={theme}
            className="h-full w-full flex-1 border-b-2 @2xl:border-r-2 @2xl:border-b-0"
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
        )}
        {(generatedEditorView === "generated" ||
          generatedEditorView === "split") && <GeneratedView />}
      </div>
    </div>
  );
}
