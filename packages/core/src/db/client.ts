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
    await upgradeToChannels(connection);
  } finally {
    connection.release();
  }
  const db = drizzle(pool, { schema, mode: "default" });
  pools.set(db, pool);
  return db;
}

async function hasColumn(
  connection: mysql.PoolConnection,
  table: string,
  column: string,
): Promise<boolean> {
  const [rows] = await connection.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column],
  );
  return Number(rows[0]?.total ?? 0) > 0;
}

async function hasIndex(
  connection: mysql.PoolConnection,
  table: string,
  indexName: string,
): Promise<boolean> {
  const [rows] = await connection.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?",
    [table, indexName],
  );
  return Number(rows[0]?.total ?? 0) > 0;
}

async function ensureColumn(
  connection: mysql.PoolConnection,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  if (await hasColumn(connection, table, column)) return;
  await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

async function ensureColumnRenamed(
  connection: mysql.PoolConnection,
  table: string,
  from: string,
  to: string,
  definition: string,
): Promise<void> {
  if (await hasColumn(connection, table, to)) return;
  if (!(await hasColumn(connection, table, from))) return;
  await connection.query(
    `ALTER TABLE \`${table}\` CHANGE \`${from}\` \`${to}\` ${definition}`,
  );
}

async function ensureUniqueKey(
  connection: mysql.PoolConnection,
  table: string,
  previousName: string,
  name: string,
  columns: string[],
): Promise<void> {
  if (await hasIndex(connection, table, name)) return;
  if (await hasIndex(connection, table, previousName)) {
    await connection.query(`ALTER TABLE \`${table}\` DROP INDEX \`${previousName}\``);
  }
  const list = columns.map((column) => `\`${column}\``).join(", ");
  await connection.query(`ALTER TABLE \`${table}\` ADD UNIQUE KEY \`${name}\` (${list})`);
}

// Nâng một database chỉ có Zalo lên lược đồ đa channel. Không có versioned migration
// nên mỗi bước phải tự nhận biết đã chạy chưa; trên database mới tất cả là no-op.
async function upgradeToChannels(connection: mysql.PoolConnection): Promise<void> {
  await ensureColumn(connection, "conversations", "channel", "VARCHAR(16) NOT NULL DEFAULT 'zalo'");
  await ensureColumn(connection, "messages", "channel", "VARCHAR(16) NOT NULL DEFAULT 'zalo'");
  await ensureColumnRenamed(connection, "messages", "zalo_msg_id", "external_msg_id", "VARCHAR(128) NULL");
  await ensureUniqueKey(
    connection,
    "conversations",
    "conversations_vendor_thread",
    "conversations_vendor_channel_thread",
    ["vendor_id", "channel", "thread_id"],
  );
  await ensureUniqueKey(
    connection,
    "messages",
    "messages_vendor_zalo_msg",
    "messages_vendor_channel_external",
    ["vendor_id", "channel", "external_msg_id"],
  );
  await connection.query("UPDATE messages SET source = 'customer' WHERE source = 'zalo'");
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
