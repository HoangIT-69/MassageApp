import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import * as schema from "./schema";
import { MIGRATION_SQL } from "./migrate";

export type AppDatabase = MySql2Database<typeof schema>;

const pools = new WeakMap<AppDatabase, Pool>();

function statements(sql: string): string[] {
  return sql
    .split(/;\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export async function openDatabase(databaseUrl: string): Promise<AppDatabase> {
  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 4,
    charset: "utf8mb4",
    waitForConnections: true,
  });
  const connection = await pool.getConnection();
  try {
    for (const statement of statements(MIGRATION_SQL)) {
      await connection.query(statement);
    }
    await ensureColumn(connection, "shop_profiles", "ai_all", "TINYINT(1) NOT NULL DEFAULT 0");
    await ensureColumn(connection, "conversations", "stage", "VARCHAR(32) NOT NULL DEFAULT 'chao_hoi'");
  } finally {
    connection.release();
  }
  const db = drizzle(pool, { schema, mode: "default" });
  pools.set(db, pool);
  return db;
}

async function ensureColumn(
  connection: mysql.PoolConnection,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const [rows] = await connection.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column],
  );
  if (Number(rows[0]?.total ?? 0) > 0) return;
  await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

export async function closeDatabase(db: AppDatabase): Promise<void> {
  const pool = pools.get(db);
  if (pool) await pool.end();
}

export async function createIsolatedDatabase(adminUrl: string): Promise<{
  db: AppDatabase;
  name: string;
}> {
  const url = new URL(adminUrl);
  const name = `zalo_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  });
  try {
    await admin.query(
      `CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await admin.end();
  }
  url.pathname = `/${name}`;
  const db = await openDatabase(url.toString());
  return { db, name };
}

export async function dropIsolatedDatabase(adminUrl: string, name: string): Promise<void> {
  if (!/^zalo_test_[a-z0-9]+$/.test(name)) return;
  const url = new URL(adminUrl);
  const admin = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  });
  try {
    await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
  } finally {
    await admin.end();
  }
}
