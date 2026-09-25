import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { conversations, messages } from "../db/schema";
import { AppError } from "../errors";
import type { ConversationRecord, InboundInput } from "../types";

export function listConversations(db: AppDatabase, vendorId: string): ConversationRecord[] {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.vendorId, vendorId))
    .orderBy(desc(conversations.lastMessageAt))
    .all();
}

export function getConversation(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
): ConversationRecord | null {
  const row = db
    .select()
    .from(conversations)
    .where(and(eq(conversations.vendorId, vendorId), eq(conversations.id, conversationId)))
    .get();
  return row ?? null;
}

export function requireConversation(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
): ConversationRecord {
  const row = getConversation(db, vendorId, conversationId);
  if (!row) throw new AppError("Không tìm thấy cuộc trò chuyện", 404);
  return row;
}

export function findConversationByThread(
  db: AppDatabase,
  vendorId: string,
  threadId: string,
): ConversationRecord | null {
  const row = db
    .select()
    .from(conversations)
    .where(and(eq(conversations.vendorId, vendorId), eq(conversations.threadId, threadId)))
    .get();
  return row ?? null;
}

export function insertConversation(
  db: AppDatabase,
  vendorId: string,
  input: InboundInput,
): ConversationRecord {
  const created: ConversationRecord = {
    id: randomUUID(),
    vendorId,
    threadId: input.threadId,
    threadType: input.threadType,
    title: input.title,
    avatarUrl: input.avatarUrl,
    lastMessage: null,
    lastMessageAt: null,
    aiEnabled: false,
  };
  db.insert(conversations).values(created).run();
  return created;
}

export function updateConversationTitle(
  db: AppDatabase,
  conversation: ConversationRecord,
  input: InboundInput,
): ConversationRecord {
  if (!input.overwriteTitle || input.title.trim() === "") return conversation;
  db.update(conversations)
    .set({ title: input.title, avatarUrl: input.avatarUrl ?? conversation.avatarUrl })
    .where(eq(conversations.id, conversation.id))
    .run();
  return { ...conversation, title: input.title, avatarUrl: input.avatarUrl ?? conversation.avatarUrl };
}

export function touchConversation(
  db: AppDatabase,
  conversationId: string,
  lastMessage: string,
  lastMessageAt: number,
): void {
  db.update(conversations)
    .set({ lastMessage, lastMessageAt })
    .where(eq(conversations.id, conversationId))
    .run();
}

export function updateAiEnabled(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  aiEnabled: boolean,
): ConversationRecord {
  const current = requireConversation(db, vendorId, conversationId);
  db.update(conversations)
    .set({ aiEnabled })
    .where(and(eq(conversations.vendorId, vendorId), eq(conversations.id, conversationId)))
    .run();
  return { ...current, aiEnabled };
}

export function deleteVendorChats(db: AppDatabase, vendorId: string): void {
  db.delete(messages).where(eq(messages.vendorId, vendorId)).run();
  db.delete(conversations).where(eq(conversations.vendorId, vendorId)).run();
}
