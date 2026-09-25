import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { MIGRATION_SQL } from "./migrate";

export type AppDatabase = BetterSQLite3Database<typeof schema>;

const WAL_MODE = "WAL";
const BUSY_TIMEOUT_MS = 5000;
const clients = new WeakMap<AppDatabase, Database.Database>();

export function openDatabase(filePath: string): AppDatabase {
  if (filePath !== ":memory:") {
    mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const sqlite = new Database(filePath);
  sqlite.pragma(`journal_mode = ${WAL_MODE}`);
  sqlite.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
  sqlite.exec(MIGRATION_SQL);
  const db = drizzle(sqlite, { schema });
  clients.set(db, sqlite);
  return db;
}

export function closeDatabase(db: AppDatabase): void {
  clients.get(db)?.close();
}
