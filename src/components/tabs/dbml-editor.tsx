import { QueryEditor } from "@/components/tabs/base/query-editor.tsx";
import { Button } from "@/components/ui/button.tsx";
import { dbmlLinter } from "@/lib/codemirror/dbml/linter.ts";
import { dbmlParser } from "@/lib/codemirror/dbml/parser.ts";

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
    />
  );
}
