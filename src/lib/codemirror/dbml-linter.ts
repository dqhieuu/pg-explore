import { Diagnostic, linter } from "@codemirror/lint";
import { Parser } from "@dbml/core";
import { CompilerError } from "@dbml/core/types/parse/error";

const detectDbmlError = (data: string) => {
  const parser = new Parser();
  try {
    parser.parse(data, "dbmlv2");
  } catch (ex) {
    return (ex as CompilerError).diags;
  }

  return [];
};

export const dbmlLinter = linter((view) => {
  const diagnostics: Diagnostic[] = [];

  const currentText = view.state.doc.toString();

  const errors = detectDbmlError(currentText);
  console.log(errors);
  for (const error of errors) {
    const { location } = error;

    const lineStart = view.state.doc.line(location.start.line);
    const charStart = lineStart.from + (location.start.column - 1);

    const lineEnd =
      location.end?.line != null
        ? view.state.doc.line(location.end.line)
        : lineStart;
    const charEnd =
      location.end?.line != null
        ? lineEnd.from + (location.end.column - 1)
        : lineStart.to;

    diagnostics.push({
      from: charStart,
      to: charEnd,
      message: error.message,
      severity: "error",
    });
  }

  return diagnostics;
});
