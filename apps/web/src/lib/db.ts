import { openDatabase, type AppDatabase } from "@zalo/core";
import { getEnv } from "@/config/env";

let database: AppDatabase | null = null;

export function getDb(): AppDatabase {
  if (!database) database = openDatabase(getEnv().databasePath);
  return database;
}
