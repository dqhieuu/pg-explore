import { QueryEditor } from "@/components/tabs/base/query-editor.tsx";
import { Button } from "@/components/ui/button.tsx";
import { dbmlLinter } from "@/lib/codemirror/dbml/linter.ts";
import { dbmlParser } from "@/lib/codemirror/dbml/parser.ts";
import { PostgreSQL as PostgreSQLDialect, sql } from "@codemirror/lang-sql";
import { exporter as dbmlExporter } from "@dbml/core";

export function DbmlEditor({
  contextId,
  fileId,
}: {
  contextId: string;
  fileId: string;
}) {
  return (
    <QueryEditor
      contextId={contextId}
      fileId={fileId}
      headerComponent={() => (
        <Button className="h-7 p-3">Visualize tables</Button>
      )}
      extensions={[() => dbmlLinter, () => dbmlParser]}
      generatedViewConfig={{
        transformFunc: function (value) {
          if (value == null)
            return {
              success: false,
            };

          try {
            const generatedValue = dbmlExporter.export(value, "postgres");
            return {
              success: true,
              value: generatedValue,
            };
          } catch {
            return {
              success: false,
            };
          }
        },
        extensions: [
          ({ currentSchema }) =>
            sql({
              dialect: PostgreSQLDialect,
              defaultSchema: "public",
              schema: currentSchema,
            }),
        ],
      }}
    />
  );
}
