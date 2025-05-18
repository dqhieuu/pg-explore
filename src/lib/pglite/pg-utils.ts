import { Extension, PGliteInterface } from "@electric-sql/pglite";
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
import { vector } from "@electric-sql/pglite/vector";

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
  // @ts-expect-error pg should be a PGliteInterface, but it is not
  const dumpFile = await pgDump({ pg, args: ["--schema-only"] });
  return dumpFile.text();
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
