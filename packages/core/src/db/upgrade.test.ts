import { randomUUID } from "node:crypto";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { afterEach, describe, expect, it } from "vitest";
import { LOCAL_VENDOR_ID } from "../constants";
import { ingestInbound } from "../services/inbound";
import { listVendorConversations, listVendorMessages } from "../services/conversations";
import { closeDatabase, dropIsolatedDatabase, openDatabase, type AppDatabase } from "./client";
import { TEST_DATABASE_URL } from "./test-support";
import type { AiClient } from "../types";

// Lược đồ trước khi có chiều channel, chép từ migrate.ts ở commit cũ.
const ZALO_ONLY_SCHEMA = [
  `CREATE TABLE conversations (
    id VARCHAR(64) PRIMARY KEY,
    vendor_id VARCHAR(64) NOT NULL,
    thread_id VARCHAR(128) NOT NULL,
    thread_type VARCHAR(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    avatar_url TEXT NULL,
    last_message TEXT NULL,
    last_message_at BIGINT NULL,
    ai_enabled TINYINT(1) NOT NULL DEFAULT 0,
    stage VARCHAR(32) NOT NULL DEFAULT 'chao_hoi',
    UNIQUE KEY conversations_vendor_thread (vendor_id, thread_id)
  )`,
  `CREATE TABLE messages (
    id VARCHAR(64) PRIMARY KEY,
    vendor_id VARCHAR(64) NOT NULL,
    conversation_id VARCHAR(64) NOT NULL,
    direction VARCHAR(8) NOT NULL,
    source VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    attachment_path VARCHAR(255) NULL,
    zalo_msg_id VARCHAR(128) NULL,
    status VARCHAR(16) NOT NULL,
    created_at BIGINT NOT NULL,
    UNIQUE KEY messages_vendor_zalo_msg (vendor_id, zalo_msg_id),
    INDEX messages_conversation_time (vendor_id, conversation_id, created_at)
  )`,
  `INSERT INTO conversations (id, vendor_id, thread_id, thread_type, title)
    VALUES ('c-old', '${LOCAL_VENDOR_ID}', 'shared-thread', 'user', 'Khach cu')`,
  `INSERT INTO messages (id, vendor_id, conversation_id, direction, source, content, zalo_msg_id, status, created_at)
    VALUES ('m-old', '${LOCAL_VENDOR_ID}', 'c-old', 'in', 'zalo', 'tin cu', 'zalo-1', 'received', 1700000000000)`,
];

const silentAi: AiClient = {
  async complete() {
    return "";
  },
};

async function createZaloOnlyDatabase(): Promise<{ url: string; name: string }> {
  const name = `zalo_test_${randomUUID().replaceAll("-", "")}`;
  const url = new URL(TEST_DATABASE_URL);
  const admin = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  });
  try {
    await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await admin.query(`USE \`${name}\``);
    for (const statement of ZALO_ONLY_SCHEMA) await admin.query(statement);
  } finally {
    await admin.end();
  }
  url.pathname = `/${name}`;
  return { url: url.toString(), name };
}

async function indexNames(url: string, table: string): Promise<string[]> {
  const connection = await mysql.createConnection(url);
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT DISTINCT INDEX_NAME AS name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
      [table],
    );
    return rows.map((row) => String(row.name)).sort();
  } finally {
    await connection.end();
  }
}

describe("upgrade from the zalo-only schema", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const cleanup of cleanups) await cleanup();
    cleanups.length = 0;
  });

  async function open(url: string): Promise<AppDatabase> {
    const db = await openDatabase(url);
    cleanups.unshift(() => closeDatabase(db));
    return db;
  }

  it("keeps old data as zalo, renames the message id column, and swaps the unique keys", async () => {
    const { url, name } = await createZaloOnlyDatabase();
    cleanups.push(() => dropIsolatedDatabase(TEST_DATABASE_URL, name));
    const db = await open(url);

    const [conversation] = await listVendorConversations(db, LOCAL_VENDOR_ID);
    expect(conversation).toMatchObject({ id: "c-old", channel: "zalo", threadId: "shared-thread" });
    const [message] = await listVendorMessages(db, LOCAL_VENDOR_ID, "c-old", 0);
    expect(message).toMatchObject({ channel: "zalo", source: "customer", externalMsgId: "zalo-1" });

    expect(await indexNames(url, "conversations")).toEqual([
      "PRIMARY",
      "conversations_vendor_channel_thread",
    ]);
    expect(await indexNames(url, "messages")).toEqual([
      "PRIMARY",
      "messages_conversation_time",
      "messages_vendor_channel_external",
    ]);
  });

  it("dedupes an old zalo message after the upgrade and accepts the same ids on facebook", async () => {
    const { url, name } = await createZaloOnlyDatabase();
    cleanups.push(() => dropIsolatedDatabase(TEST_DATABASE_URL, name));
    const db = await open(url);
    const base = {
      threadType: "user" as const,
      title: "Khach",
      avatarUrl: null,
      overwriteTitle: false,
      content: "xin chao",
      isText: true,
      isSelf: false,
      timestamp: 1_700_000_000_100,
    };

    const replayed = await ingestInbound(
      db,
      LOCAL_VENDOR_ID,
      { ...base, channel: "zalo", threadId: "shared-thread", externalMsgId: "zalo-1" },
      silentAi,
    );
    const facebook = await ingestInbound(
      db,
      LOCAL_VENDOR_ID,
      { ...base, channel: "facebook", threadId: "shared-thread", externalMsgId: "zalo-1" },
      silentAi,
    );

    expect(replayed.created).toBe(false);
    expect(facebook.created).toBe(true);
    expect(await listVendorConversations(db, LOCAL_VENDOR_ID)).toHaveLength(2);
  });

  it("is a no-op when run again on an upgraded database", async () => {
    const { url, name } = await createZaloOnlyDatabase();
    cleanups.push(() => dropIsolatedDatabase(TEST_DATABASE_URL, name));
    await closeDatabase(await openDatabase(url));
    const db = await open(url);
    const [message] = await listVendorMessages(db, LOCAL_VENDOR_ID, "c-old", 0);
    expect(message?.externalMsgId).toBe("zalo-1");
  });
});
