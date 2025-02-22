import { Diagnostic, linter } from "@codemirror/lint";
import { PGliteInterface } from "@electric-sql/pglite";

interface QueryLineError {
  line: number;
  error: string;
}

async function detectQueryLineError_Experimental(
  db: PGliteInterface,
  query: string,
): Promise<QueryLineError | null> {
  query = [
    {
      pattern: "(?<=;|^)(\\s*)start(\\s+)transaction[^;]*",
      replacement: "$1$2",
    },
    {
      pattern: "(?<=;|^)(\\s*)(?:begin|commit|end)[^;]*",
      replacement: "$1",
    },
  ].reduce((query, { pattern, replacement }) => {
    return query.replace(new RegExp(pattern, "i"), replacement);
  }, query);

  const lines = query.split("\n");

  let result: QueryLineError | null = null;
  for (let i = 0; i < lines.length; i++) {
    const partialQuery = `rollback;begin;${lines
      .slice(0, i + 1)
      .join("\n")};rollback;`;
    await db
      .exec(partialQuery)
      .then(() => {
        result = null;
      })
      .catch((err) => {
        const prevError = result?.error;
        const error = (err as Error).message;
        if (prevError === error) {
          return;
        }
        result = {
          line: i + 1,
          error,
        };
      });
  }

  return result;
}

export const pgLinter = (db: PGliteInterface) =>
  linter(async (view) => {
    const diagnostics: Diagnostic[] = [];

    const lintResult = await detectQueryLineError_Experimental(
      db,
      view.state.doc.toString(),
    );

    if (lintResult == null) return diagnostics;

    const line = view.state.doc.line(lintResult.line);

    diagnostics.push({
      from: line.from,
      to: line.to,
      severity: "error",
      message: lintResult.error,
    });

    return diagnostics;
  });
