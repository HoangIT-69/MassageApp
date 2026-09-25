import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, isNull, ne } from "drizzle-orm";
import { HISTORY_LIMIT, MESSAGE_PAGE_SIZE, SELF_ECHO_WINDOW_MS } from "../constants";
import type { AppDatabase } from "../db/client";
import { messages } from "../db/schema";
import type { Direction, MessageRecord, MessageSource, MessageStatus } from "../types";

export type NewMessage = {
  vendorId: string;
  conversationId: string;
  direction: Direction;
  source: MessageSource;
  content: string;
  zaloMsgId: string | null;
  status: MessageStatus;
  createdAt: number;
};

export function findMessageByZaloId(
  db: AppDatabase,
  vendorId: string,
  zaloMsgId: string,
): MessageRecord | null {
  const row = db
    .select()
    .from(messages)
    .where(and(eq(messages.vendorId, vendorId), eq(messages.zaloMsgId, zaloMsgId)))
    .get();
  return row ?? null;
}

export function insertMessage(db: AppDatabase, input: NewMessage): MessageRecord {
  const created: MessageRecord = { id: randomUUID(), ...input };
  db.insert(messages).values(created).run();
  return created;
}

export function listMessages(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  after: number,
): MessageRecord[] {
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
    .limit(MESSAGE_PAGE_SIZE)
    .all();
}

export function listRecentMessages(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
): MessageRecord[] {
  const rows = db
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
    .limit(HISTORY_LIMIT)
    .all();
  return rows.reverse();
}

export function findSelfEcho(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  content: string,
  timestamp: number,
): MessageRecord | null {
  const row = db
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
    .limit(1)
    .get();
  return row ?? null;
}

export function attachZaloMsgId(
  db: AppDatabase,
  vendorId: string,
  messageId: string,
  zaloMsgId: string,
  status: MessageStatus,
): void {
  db.update(messages)
    .set({ zaloMsgId, status })
    .where(and(eq(messages.vendorId, vendorId), eq(messages.id, messageId)))
    .run();
}

export function claimQueued(db: AppDatabase, vendorId: string, limit: number): MessageRecord[] {
  return db
    .select()
    .from(messages)
    .where(and(eq(messages.vendorId, vendorId), eq(messages.status, "queued")))
    .orderBy(asc(messages.createdAt))
    .limit(limit)
    .all();
}

export function markMessageStatus(
  db: AppDatabase,
  vendorId: string,
  messageId: string,
  status: "sent" | "failed",
): boolean {
  const result = db
    .update(messages)
    .set({ status })
    .where(and(eq(messages.vendorId, vendorId), eq(messages.id, messageId)))
    .run();
  return result.changes > 0;
}
