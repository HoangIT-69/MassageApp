import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const operatorSessions = sqliteTable("operator_session", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const zaloControls = sqliteTable("zalo_control", {
  vendorId: text("vendor_id").primaryKey(),
  relink: integer("relink").notNull().default(0),
});

export const zaloLinks = sqliteTable("zalo_link", {
  vendorId: text("vendor_id").primaryKey(),
  status: text("status").notNull(),
  displayName: text("display_name"),
  qrImage: text("qr_image"),
  updatedAt: integer("updated_at").notNull(),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull(),
  threadId: text("thread_id").notNull(),
  threadType: text("thread_type").notNull(),
  title: text("title").notNull(),
  avatarUrl: text("avatar_url"),
  lastMessage: text("last_message"),
  lastMessageAt: integer("last_message_at"),
  aiEnabled: integer("ai_enabled", { mode: "boolean" }).notNull().default(false),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull(),
  conversationId: text("conversation_id").notNull(),
  direction: text("direction").notNull(),
  source: text("source").notNull(),
  content: text("content").notNull(),
  zaloMsgId: text("zalo_msg_id"),
  status: text("status").notNull(),
  createdAt: integer("created_at").notNull(),
});
