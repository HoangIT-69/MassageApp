import { ensureShopSeed, openDatabase, type AppDatabase } from "@zalo/core";
import { getEnv } from "@/config/env";

let opening: Promise<AppDatabase> | null = null;

export function getDb(): Promise<AppDatabase> {
  if (!opening) {
    const env = getEnv();
    opening = openDatabase(env.databaseUrl)
      .then(async (db) => {
        await ensureShopSeed(db, env.vendorId);
        return db;
      })
      .catch((error: unknown) => {
        opening = null;
        throw error;
      });
  }
  return opening;
}
