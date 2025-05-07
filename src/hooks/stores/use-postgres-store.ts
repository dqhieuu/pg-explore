import { appDb } from "@/lib/dexie/app-db";
import {
  extensionNamesToExtensions,
  querySchemaForCodeMirror,
} from "@/lib/pglite/pg-utils";
import { PGlite } from "@electric-sql/pglite";
import { PGliteWithLive, live } from "@electric-sql/pglite/live";
import Dexie from "dexie";
import { create } from "zustand";

interface PostgresStore {
  database: null | PGliteWithLive;
  databaseId: null | string;
  setDatabase: (databaseId: string | null) => void;

  schema: Record<string, string[]>;
  setSchema: (schema: Record<string, string[]>) => void;

  enabledExtensionsChanged: boolean;
  setEnabledExtensionsChanged: (changed: boolean) => void;
}

let isLockingSetDatabase = false;
export const usePostgresStore = create<PostgresStore>((set, get) => ({
  database: null,
  databaseId: null,
  setDatabase: async (databaseId) => {
    if (isLockingSetDatabase) {
      return;
    }

    isLockingSetDatabase = true;

    try {
      set({ databaseId });

      const { database } = get();

      if (database != null && database.ready) {
        await database.close();
      }

      let newDatabase: PGliteWithLive;
      if (databaseId != null) {
        const existingDatabaseConfig = await appDb.databases.get(databaseId);
        const enabledExtensions = extensionNamesToExtensions(
          existingDatabaseConfig?.enabledExtensions ?? [],
        );

        newDatabase = await PGlite.create(`idb://pg_${databaseId}`, {
          extensions: { live, ...enabledExtensions },
          relaxedDurability: true,
        });
      } else {
        newDatabase = await PGlite.create({
          extensions: { live },
        });
      }

      querySchemaForCodeMirror(newDatabase).then((schema) => {
        set({ schema });
      });

      set({ database: newDatabase });
    } finally {
      isLockingSetDatabase = false;
    }
  },

  schema: {},
  setSchema: (schema) => set({ schema }),

  enabledExtensionsChanged: false,
  setEnabledExtensionsChanged: (changed) =>
    set({ enabledExtensionsChanged: changed }),
}));

export const deleteDatabase = async (id: string) => {
  await appDb.workflows.where("databaseId").equals(id).delete();
  await appDb.files.where("databaseId").equals(id).delete();
  await appDb.databases.delete(id);
  return Dexie.delete(`/pglite/pg_${id}`);
};
