import { QueryEditor } from "@/components/tabs/base/query-editor.tsx";
import { Button } from "@/components/ui/button.tsx";
import { dbmlLinter } from "@/lib/codemirror/dbml/linter.ts";
import { dbmlParser } from "@/lib/codemirror/dbml/parser.ts";
import { transformDbmlToSql } from "@/lib/dbml.ts";
import { PostgreSQL as PostgreSQLDialect, sql } from "@codemirror/lang-sql";

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
        <>
          <Button className="h-7 p-3" disabled>
            Preview tables
          </Button>
        </>
      )}
      extensions={[() => dbmlLinter, () => dbmlParser]}
      generatedViewConfig={{
        transformFunc: transformDbmlToSql,
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
