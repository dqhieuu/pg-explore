import { debugLog, isEmptyOrSpaces, nextIncrementedName } from "@/lib/utils.ts";
import { Extension, PGliteInterface, QueryOptions } from "@electric-sql/pglite";
import { pgDump } from "@electric-sql/pglite-tools/pg_dump";
import { amcheck } from "@electric-sql/pglite/contrib/amcheck";
import { auto_explain } from "@electric-sql/pglite/contrib/auto_explain";
import { bloom } from "@electric-sql/pglite/contrib/bloom";
import { btree_gin } from "@electric-sql/pglite/contrib/btree_gin";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { cube } from "@electric-sql/pglite/contrib/cube";
import { earthdistance } from "@electric-sql/pglite/contrib/earthdistance";
import { fuzzystrmatch } from "@electric-sql/pglite/contrib/fuzzystrmatch";
import { hstore } from "@electric-sql/pglite/contrib/hstore";
import { isn } from "@electric-sql/pglite/contrib/isn";
import { lo } from "@electric-sql/pglite/contrib/lo";
import { ltree } from "@electric-sql/pglite/contrib/ltree";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { seg } from "@electric-sql/pglite/contrib/seg";
import { tablefunc } from "@electric-sql/pglite/contrib/tablefunc";
import { tcn } from "@electric-sql/pglite/contrib/tcn";
import { tsm_system_rows } from "@electric-sql/pglite/contrib/tsm_system_rows";
import { tsm_system_time } from "@electric-sql/pglite/contrib/tsm_system_time";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
// import { pg_ivm } from "@electric-sql/pglite/pg_ivm";
import { vector } from "@electric-sql/pglite/vector";
import Papa from "papaparse";

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
        table_name AS "table",
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
    `drop schema public cascade; 
    create schema public;
    grant all on schema public to postgres;
    grant all on schema public to public;
    alter user postgres set search_path to public;
    set search_path to public;`,
  );
}

export function evaluateSql(
  pg: PGliteInterface,
  sqlScript: string,
  fileContent: string | File | Blob | null = null,
) {
  const queryOptions = {} as QueryOptions;
  if (fileContent != null) {
    if (typeof fileContent === "string") {
      queryOptions.blob = new File([fileContent], "any_file_name");
    } else {
      queryOptions.blob = fileContent;
    }
  }
  const executedScript = "rollback;" + sqlScript;
  debugLog({ executedScript, queryOptions });

  return pg.exec(executedScript, queryOptions);
}

/**
 * Import a table from a CSV file.
 * @param pg
 * @param includeCreateTable
 * @param tableName
 * @param csv Must be a valid CSV file, containing a header row.
 * @param specifiedColumnTypes
 */
export async function importTableFromCsv(
  pg: PGliteInterface,
  csv: string | File,
  includeCreateTable = false,
  tableName?: string,
  specifiedColumnTypes?: Record<string, string>,
) {
  if (!includeCreateTable && isEmptyOrSpaces(tableName)) {
    throw new Error(
      "Table name is required if 'Include CREATE TABLE' is unchecked",
    );
  }

  const isNameAutomaticallyGenerated = isEmptyOrSpaces(tableName);
  if (isNameAutomaticallyGenerated) {
    const allCurrentTableNames = await getAllTableNames(pg);
    tableName = nextIncrementedName("datatable_", allCurrentTableNames);
  }

  const fileContent = typeof csv === "string" ? csv : await csv.text();
  const parsedCsv = Papa.parse(fileContent, { header: true });
  const columns = parsedCsv.meta.fields;
  if (columns == undefined || columns.length === 0) {
    throw new Error("CSV file must contain a header row");
  }

  const tableColumnsSql =
    columns && columns.length > 0
      ? "(" +
        columns
          .map((columnName) => `"${escapeSqlIdentifier(columnName)}"`)
          .join(", ") +
        ")"
      : "";

  if (includeCreateTable) {
    const columnsToDataType = getColumnToDataTypeMap(
      columns,
      parsedCsv.data as Record<string, string>[],
      specifiedColumnTypes,
    );
    const createTableSql = getCreateTableSql(tableName!, columnsToDataType);
    const commentOnTable = `comment on table "${escapeSqlIdentifier(tableName!)}" is 'Imported from external data file. ${isNameAutomaticallyGenerated ? "Table name was automatically generated and prefixed with ''datatable_''." : ""}';`;

    await evaluateSql(pg, createTableSql + commentOnTable);
  }

  return evaluateSql(
    pg,
    `copy "${escapeSqlIdentifier(tableName!)}" ${tableColumnsSql} from '/dev/blob' with (format csv, header);`,
    csv,
  );
}

export async function getAllTableNames(pg: PGliteInterface) {
  const ret = await pg.query<{ table_name: string }>(
    `select table_name from information_schema.tables where table_schema = 'public'`,
  );
  return ret.rows.map((row) => row.table_name);
}

export function getCreateTableSql(
  tableName: string,
  columnToDataType: Record<string, string>,
) {
  const sqlColumns = Object.entries(columnToDataType)
    .map(
      ([columnName, dataType]) =>
        `  "${escapeSqlIdentifier(columnName)}" ${dataType}`,
    )
    .join(",\n");
  return (
    `CREATE TABLE "${escapeSqlIdentifier(tableName)}" (` +
    "\n" +
    sqlColumns +
    "\n);"
  );
}

function escapeSqlIdentifier(identifier: string) {
  return identifier.replace(/"/g, '""');
}

export async function getDatabaseSchemaDump(pg: PGliteInterface) {
  await evaluateSql(pg, "");
  const dumpFile = await pgDump({
    // @ts-expect-error pg should be a PGliteInterface, but it is not
    pg,
    args: ["--schema-only", "--no-owner", "--no-privileges"],
  });
  const dumpText = await dumpFile.text();
  await evaluateSql(pg, "set search_path to public;");
  debugLog({ "Database schema dump": dumpText });
  return dumpText;
}

export const pgExtensions = [
  {
    id: "pgvector",
    name: "pgvector",
    description: "Open-source vector similarity search for Postgres.",
    implementation: vector,
  },
  {
    id: "amcheck",
    name: "amcheck",
    description:
      "The amcheck module provides functions that allow you to verify the logical consistency of the structure of relations.",
    implementation: amcheck,
  },
  {
    id: "auto_explain",
    name: "auto_explain",
    description:
      "The auto_explain module provides a means for logging execution plans of slow statements automatically, without having to run EXPLAIN by hand.",
    implementation: auto_explain,
  },
  {
    id: "bloom",
    name: "bloom",
    description:
      "bloom provides an index access method based on Bloom filters. A Bloom filter is a space-efficient data structure that is used to test whether an element is a member of a set. In the case of an index access method, it allows fast exclusion of non-matching tuples via signatures whose size is determined at index creation.",
    implementation: bloom,
  },
  {
    id: "btree_gin",
    name: "btree_gin",
    description:
      "btree_gin provides GIN operator classes that implement B-tree equivalent behavior for many built in data types.",
    implementation: btree_gin,
  },
  {
    id: "btree_gist",
    name: "btree_gist",
    description:
      "btree_gist provides GiST operator classes that implement B-tree equivalent behavior for many built in data types.",
    implementation: btree_gist,
  },
  {
    id: "citext",
    name: "citext",
    description:
      "citext provides a case-insensitive character string type, citext. Essentially, it internally calls lower when comparing values. Otherwise, it behaves almost the same as text.",
    implementation: citext,
  },
  {
    id: "cube",
    name: "cube",
    description:
      "cube provides a data type cube for representing multidimensional cubes.",
    implementation: cube,
  },
  {
    id: "earthdistance",
    name: "earthdistance",
    description:
      "The earthdistance module provides tools for calculating great circle distances on the surface of the Earth.",
    implementation: earthdistance,
  },
  {
    id: "fuzzystrmatch",
    name: "fuzzystrmatch",
    description:
      "fuzzystrmatch provides functions to determine similarities and distance between strings.",
    implementation: fuzzystrmatch,
  },
  {
    id: "hstore",
    name: "hstore",
    description:
      "This module implements the hstore data type for storing sets of key/value pairs within a single PostgreSQL value. This can be useful in various scenarios, such as rows with many attributes that are rarely examined, or semi-structured data. Keys and values are simply text strings.",
    implementation: hstore,
  },
  {
    id: "isn",
    name: "isn",
    description:
      "The isn module provides data types for the following international product numbering standards: EAN13, UPC, ISBN (books), ISMN (music), and ISSN (serials).",
    implementation: isn,
  },
  {
    id: "lo",
    name: "lo",
    description:
      "The lo module provides support for managing Large Objects (also called LOs or BLOBs). This includes a data type lo and a trigger lo_manage.",
    implementation: lo,
  },
  {
    id: "ltree",
    name: "ltree",
    description:
      "This module implements a data type ltree for representing labels of data stored in a hierarchical tree-like structure. Extensive facilities for searching through label trees are provided.",
    implementation: ltree,
  },
  // {
  //   id: "pg_ivm",
  //   name: "pg_ivm",
  //   description:
  //     "The pg_ivm module provides Incremental View Maintenance (IVM) feature for PostgreSQL. Incremental View Maintenance (IVM) is a way to make materialized views up-to-date in which only incremental changes are computed and applied on views rather than recomputing the contents from scratch as REFRESH MATERIALIZED VIEW does. IVM can update materialized views more efficiently than recomputation when only small parts of the view are changed.",
  //   implementation: pg_ivm,
  // },
  {
    id: "pg_trgm",
    name: "pg_trgm",
    description:
      "The pg_trgm module provides functions and operators for determining the similarity of alphanumeric text based on trigram matching, as well as index operator classes that support fast searching for similar strings.",
    implementation: pg_trgm,
  },
  {
    id: "seg",
    name: "seg",
    description:
      "This module implements a data type seg for representing line segments, or floating point intervals. seg can represent uncertainty in the interval endpoints, making it especially useful for representing laboratory measurements.",
    implementation: seg,
  },
  {
    id: "tablefunc",
    name: "tablefunc",
    description:
      "The tablefunc module includes various functions that return tables (that is, multiple rows). These functions are useful both in their own right and as examples of how to write C functions that return multiple rows.",
    implementation: tablefunc,
  },
  {
    id: "tcn",
    name: "tcn",
    description:
      "The tcn module provides a trigger function that notifies listeners of changes to any table on which it is attached. It must be used as an AFTER trigger FOR EACH ROW.",
    implementation: tcn,
  },
  {
    id: "tsm_system_rows",
    name: "tsm_system_rows",
    description:
      "The tsm_system_rows module provides the table sampling method SYSTEM_ROWS, which can be used in the TABLESAMPLE clause of a SELECT command.",
    implementation: tsm_system_rows,
  },
  {
    id: "tsm_system_time",
    name: "tsm_system_time",
    description:
      "The tsm_system_time module provides the table sampling method SYSTEM_TIME, which can be used in the TABLESAMPLE clause of a SELECT command.",
    implementation: tsm_system_time,
  },
  {
    id: "uuid-ossp",
    name: "uuid-ossp",
    description:
      "The uuid-ossp module provides functions to generate universally unique identifiers (UUIDs) using one of several standard algorithms. There are also functions to produce certain special UUID constants. This module is only necessary for special requirements beyond what is available in core PostgreSQL.",
    implementation: uuid_ossp,
  },
];

const extensionByName: Record<string, Extension> = pgExtensions.reduce(
  (acc, extension) => {
    acc[extension.name] = extension.implementation;
    return acc;
  },
  {} as Record<string, Extension>,
);

export function extensionNamesToExtensions(extensionNames: string[]) {
  return extensionNames.reduce(
    (acc, name) => {
      const extension = extensionByName[name];
      if (extension) {
        acc[name] = extension;
      }
      return acc;
    },
    {} as Record<string, Extension>,
  );
}

export const getColumnToDataTypeMap = (
  columns: string[],
  tableData: Record<string, string>[],
  specifiedColumnTypes: Record<string, string> = {},
) =>
  columns.reduce(
    (acc, column) => {
      acc[column] = isEmptyOrSpaces(specifiedColumnTypes?.[column])
        ? guessPostgresDataTypeBasedOnValueList(
            tableData.map((row) => row[column]),
          )
        : specifiedColumnTypes![column].trim();
      return acc;
    },
    {} as Record<string, string>,
  );

export function guessPostgresDataTypeBasedOnValueList(
  values: (string | null | undefined)[],
  useHighPrecision = true,
) {
  let hasDate = false;
  let hasNonDate = false;
  for (const value of values) {
    if (value == null || value === "") continue;
    if (
      /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(value) &&
      new Date(value).toString() !== "Invalid Date"
    ) {
      hasDate = true;
    } else {
      hasNonDate = true;
      break;
    }
  }
  if (hasDate && !hasNonDate) return "timestamptz";

  let hasBool = false;
  let hasNonBool = false;
  for (const value of values) {
    if (value == null || value === "") continue;
    if (/^(?:true|false|t|f|yes|no|y|n|1|0|on|off)$/i.test(value)) {
      hasBool = true;
    } else {
      hasNonBool = true;
      break;
    }
  }
  if (hasBool && !hasNonBool) return "boolean";

  let hasUuid = false;
  let hasNonUuid = false;
  for (const value of values) {
    if (value == null || value === "") continue;
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      hasUuid = true;
    } else {
      hasNonUuid = true;
      break;
    }
  }
  if (hasUuid && !hasNonUuid) return "uuid";

  let hasJson = false;
  let hasNonJson = false;
  for (const value of values) {
    if (value == null || value === "") continue;
    if (/^[{[].*[}\]]$/i.test(value)) {
      hasJson = true;
    } else {
      hasNonJson = true;
      break;
    }
  }
  if (hasJson && !hasNonJson) return "jsonb";

  let hasInt = false;
  let hasNonInt = false;
  for (const value of values) {
    if (value == null || value === "") continue;
    if (/^-?\d+$/.test(value)) {
      hasInt = true;
    } else {
      hasNonInt = true;
      break;
    }
  }
  if (hasInt && !hasNonInt) return useHighPrecision ? "bigint" : "integer";

  let hasFloat = false;
  let hasNonFloat = false;
  for (const value of values) {
    if (value == null || value === "") continue;
    if (/^[+-]?(\d+([.]\d*)?(e[+-]?\d+)?|[.]\d+(e[+-]?\d+)?)$/i.test(value)) {
      hasFloat = true;
    } else {
      hasNonFloat = true;
      break;
    }
  }
  if (hasFloat && !hasNonFloat)
    return useHighPrecision ? "double precision" : "real";

  return "text";
}
