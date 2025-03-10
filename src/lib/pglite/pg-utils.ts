import { PGliteInterface } from "@electric-sql/pglite";
import { pgDump } from "@electric-sql/pglite-tools/pg_dump";

export async function querySchemaForCodeMirror(
  pg: PGliteInterface,
): Promise<Record<string, string[]>> {
  const ret = await pg.query<{
    schema: string;
    table: string;
    columns: string;
  }>(`
      SELECT 
        table_schema AS schema,
        table_name AS table,
        array_agg(column_name) AS columns
      FROM 
        information_schema.columns
      GROUP BY 
        table_schema, table_name
      ORDER BY 
        table_schema, table_name;
    `);
  const schema: Record<string, string[]> = {};
  for (const row of ret.rows) {
    schema[`${row.schema}.${row.table}`] = Array.isArray(row.columns)
      ? row.columns
      : row.columns.slice(1, -1).split(",");
  }
  return schema;
}

export function wipeDatabase(pg: PGliteInterface) {
  return evaluateSql(
    pg,
    `DROP SCHEMA public CASCADE; 
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT ALL ON SCHEMA public TO public;
    ALTER USER postgres SET search_path TO public;
    SET search_path TO public;
    `,
  );
}

export function evaluateSql(pg: PGliteInterface, sqlScript: string) {
  return pg.exec("rollback;" + sqlScript);
}

export async function getDatabaseSchemaDump(pg: PGliteInterface) {
  const dumpFile = await pgDump({ pg, args: ["--schema-only"] });
  await pg.query("DEALLOCATE ALL;");
  await evaluateSql(pg, "SET search_path TO public;");
  return dumpFile.text();
}
