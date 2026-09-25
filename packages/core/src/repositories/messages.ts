import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, isNull, ne } from "drizzle-orm";
import { HISTORY_LIMIT, MESSAGE_PAGE_SIZE, SELF_ECHO_WINDOW_MS } from "../constants";
import type { AppDatabase } from "../db/client";
import { affectedRows } from "../db/sql";
import { messages } from "../db/schema";
import type { Direction, MessageRecord, MessageSource, MessageStatus } from "../types";

export type NewMessage = {
  vendorId: string;
  conversationId: string;
  direction: Direction;
  source: MessageSource;
  content: string;
  attachmentPath?: string | null;
  zaloMsgId: string | null;
  status: MessageStatus;
  createdAt: number;
};

export async function findMessageByZaloId(
  db: AppDatabase,
  vendorId: string,
  zaloMsgId: string,
): Promise<MessageRecord | null> {
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.vendorId, vendorId), eq(messages.zaloMsgId, zaloMsgId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertMessage(db: AppDatabase, input: NewMessage): Promise<MessageRecord> {
  const created: MessageRecord = {
    id: randomUUID(),
    ...input,
    attachmentPath: input.attachmentPath ?? null,
  };
  await db.insert(messages).values(created);
  return created;
}

export async function listMessages(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  after: number,
): Promise<MessageRecord[]> {
  return db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.vendorId, vendorId),
        eq(messages.conversationId, conversationId),
        gt(messages.createdAt, after),
      ),
    )
    .orderBy(asc(messages.createdAt))
    .limit(MESSAGE_PAGE_SIZE);
}

export async function listRecentMessages(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
): Promise<MessageRecord[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.vendorId, vendorId),
        eq(messages.conversationId, conversationId),
        ne(messages.status, "failed"),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(HISTORY_LIMIT);
  return rows.reverse();
}

export async function countMessagesSince(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  afterCreatedAt: number,
): Promise<MessageRecord[]> {
  return db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.vendorId, vendorId),
        eq(messages.conversationId, conversationId),
        ne(messages.status, "failed"),
        gt(messages.createdAt, afterCreatedAt),
      ),
    )
    .orderBy(asc(messages.createdAt));
}

export async function findSelfEcho(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  content: string,
  timestamp: number,
): Promise<MessageRecord | null> {
  const rows = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.vendorId, vendorId),
        eq(messages.conversationId, conversationId),
        eq(messages.direction, "out"),
        eq(messages.content, content),
        isNull(messages.zaloMsgId),
        gt(messages.createdAt, timestamp - SELF_ECHO_WINDOW_MS),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function attachZaloMsgId(
  db: AppDatabase,
  vendorId: string,
  messageId: string,
  zaloMsgId: string,
  status: MessageStatus,
): Promise<void> {
  await db
    .update(messages)
    .set({ zaloMsgId, status })
    .where(and(eq(messages.vendorId, vendorId), eq(messages.id, messageId)));
}

export async function claimQueued(
  db: AppDatabase,
  vendorId: string,
  limit: number,
): Promise<MessageRecord[]> {
  return db
    .select()
    .from(messages)
    .where(and(eq(messages.vendorId, vendorId), eq(messages.status, "queued")))
    .orderBy(asc(messages.createdAt))
    .limit(limit);
}

export async function markMessageStatus(
  db: AppDatabase,
  vendorId: string,
  messageId: string,
  status: "sent" | "failed",
): Promise<boolean> {
  const result = await db
    .update(messages)
    .set({ status })
    .where(and(eq(messages.vendorId, vendorId), eq(messages.id, messageId)));
  return affectedRows(result) > 0;
}

export async function deleteConversationMessages(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
): Promise<void> {
  await db
    .delete(messages)
    .where(and(eq(messages.vendorId, vendorId), eq(messages.conversationId, conversationId)));
}
