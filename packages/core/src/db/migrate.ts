export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS operator_session (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS operator_session_token ON operator_session(token_hash);

CREATE TABLE IF NOT EXISTS zalo_control (
  vendor_id TEXT PRIMARY KEY,
  relink INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS zalo_link (
  vendor_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  display_name TEXT,
  qr_image TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  thread_type TEXT NOT NULL,
  title TEXT NOT NULL,
  avatar_url TEXT,
  last_message TEXT,
  last_message_at INTEGER,
  ai_enabled INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_vendor_thread
  ON conversations(vendor_id, thread_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  zalo_msg_id TEXT,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS messages_vendor_zalo_msg
  ON messages(vendor_id, zalo_msg_id)
  WHERE zalo_msg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_conversation_time
  ON messages(vendor_id, conversation_id, created_at);
`;
