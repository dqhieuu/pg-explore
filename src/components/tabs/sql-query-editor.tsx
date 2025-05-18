import { QueryEditor } from "@/components/tabs/base/query-editor.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { pgLinter } from "@/lib/codemirror/pg-linter.ts";
import { PostgreSQL as PostgreSQLDialect, sql } from "@codemirror/lang-sql";
import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";

export interface SqlQueryEditorProps {
  contextId: string;
  fileId: string;
}

export function SqlQueryEditor({ contextId, fileId }: SqlQueryEditorProps) {
  return (
    <QueryEditor
      contextId={contextId}
      fileId={fileId}
      headerComponent={({ isHighlightingSelection, executeCurrentQuery }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button className="h-7 p-3" onClick={executeCurrentQuery}>
              Query {isHighlightingSelection ? "selection" : ""}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Hotkey <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
          </TooltipContent>
        </Tooltip>
      )}
      extensions={[
        ({ currentSchema }) =>
          sql({
            dialect: PostgreSQLDialect,
            defaultSchema: "public",
            schema: currentSchema,
          }),
        ({ currentDatabase }) => pgLinter(currentDatabase),

        ({ executeCurrentQuery }) =>
          Prec.high(
            keymap.of([
              {
                key: "Mod-Enter",
                run: () => {
                  executeCurrentQuery();
                  return true;
                },
              },
            ]),
          ),
      ]}
    />
  );
}
