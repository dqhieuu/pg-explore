import { appDb } from "@/lib/dexie/app-db";
import { PGlite } from "@electric-sql/pglite";
import { PGliteWithLive, live } from "@electric-sql/pglite/live";
import Dexie from "dexie";
import { create } from "zustand";

interface PostgresStore {
  database: null | PGliteWithLive;
  databaseId: null | string;
  setDatabase: (databaseId: string | null) => void;
}

export const usePostgresStore = create<PostgresStore>((set, get) => ({
  database: null,
  databaseId: null,
  setDatabase: async (databaseId) => {
    set({ databaseId });

    const { database } = get();

    if (database != null) {
      await database.close();
    }

    let newDatabase: PGliteWithLive;
    if (databaseId != null) {
      newDatabase = await PGlite.create(`idb://pg_${databaseId}`, {
        extensions: { live },
      });
    } else {
      newDatabase = await PGlite.create({
        extensions: { live },
      });
    }

    set({ database: newDatabase });
  },
}));

export const deleteDatabase = async (id: string) => {
  appDb.databases.delete(id);
  return Dexie.delete(`/pglite/pg_${id}`);
};
