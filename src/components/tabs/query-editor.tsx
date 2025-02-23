import { useDockviewStore } from "@/hooks/stores/use-dockview-store";
import { QueryResult, useQueryStore } from "@/hooks/stores/use-query-store";
import { pgLinter } from "@/lib/codemirror/pglinter";
import { PostgreSQL as PostgreSQLDialect, sql } from "@codemirror/lang-sql";
import { usePGlite } from "@electric-sql/pglite-react";
import CodeMirror from "@uiw/react-codemirror";

import { Button } from "../ui/button";

export interface QueryEditorProps {
  contextId: string;
}

export const filterNonSelectResult = (result: QueryResult) => {
  return result?.fields?.length > 0;
};

export function QueryEditor({ contextId }: QueryEditorProps) {
  const db = usePGlite();

  const dockviewApi = useDockviewStore((state) => state.dockviewApi);

  const setQueryResult = useQueryStore((state) => state.setQueryResult);

  const allotQueryResultPanel = useQueryStore(
    (state) => state.allotQueryResultPanel,
  );
  const queryResultLots = useQueryStore(
    (state) => state.queryResultPanelLots[contextId],
  );

  const queryEditorValue = useQueryStore(
    (state) => state.queryEditors[contextId],
  );
  const setQueryEditorValue = useQueryStore((state) => state.setQueryEditor);

  //   useEffect(() => {
  //     return () => {
  //       setQueryEditorValue(
  //         contextId,
  //         `begin;
  // create table test(a int, b int);
  // select * from test;
  // insert into test (a,b)
  // values (1,2), (3,4);
  // select * from test;
  // rollback;
  // select * from information_schema.tables;`,
  //       );
  //     };
  //   }, []);

  function createQueryResultTabsIfNeeded(result: object[]) {
    const lotsNeeded = result.length;

    for (let i = 0; i < lotsNeeded; i++) {
      if (queryResultLots == null || queryResultLots[i] !== true) {
        allotQueryResultPanel(contextId, i);
        if (dockviewApi?.getGroup("results") == null) {
          dockviewApi?.addGroup({
            id: "results",
            referencePanel: "panel_1",
            direction: "below",
          });
        }

        dockviewApi?.addPanel({
          id: `${contextId}_${i}`,
          component: "queryResult",
          params: {
            contextId,
            lotNumber: i,
          },
          position: {
            referenceGroup: "results",
          },
        });
      }
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-1">
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
