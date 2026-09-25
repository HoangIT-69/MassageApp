import { OUTBOX_BATCH_SIZE } from "../constants";
import type { AppDatabase } from "../db/client";
import { getConversation } from "../repositories/conversations";
import { claimQueued, markMessageStatus } from "../repositories/messages";
import type { MessageRecord } from "../types";

export type OutboxItem = MessageRecord & {
  threadId: string;
  threadType: string;
};

export function takeOutbox(db: AppDatabase, vendorId: string): OutboxItem[] {
  const queued = claimQueued(db, vendorId, OUTBOX_BATCH_SIZE);
  const ready: OutboxItem[] = [];
  for (const message of queued) {
    const conversation = getConversation(db, vendorId, message.conversationId);
    if (!conversation) {
      markMessageStatus(db, vendorId, message.id, "failed");
      continue;
    }
    ready.push({ ...message, threadId: conversation.threadId, threadType: conversation.threadType });
  }
  return ready;
}

export function completeOutboxSend(
  db: AppDatabase,
  vendorId: string,
  messageId: string,
  ok: boolean,
): void {
  markMessageStatus(db, vendorId, messageId, ok ? "sent" : "failed");
}
