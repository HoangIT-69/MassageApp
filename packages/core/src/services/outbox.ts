import { OUTBOX_BATCH_SIZE } from "../constants";
import type { AppDatabase } from "../db/client";
import { getConversation } from "../repositories/conversations";
import { claimQueued, markMessageStatus } from "../repositories/messages";
import type { MessageRecord } from "../types";

export type OutboxItem = MessageRecord & {
  threadId: string;
  threadType: string;
};

export async function takeOutbox(db: AppDatabase, vendorId: string): Promise<OutboxItem[]> {
  const queued = await claimQueued(db, vendorId, OUTBOX_BATCH_SIZE);
  const ready: OutboxItem[] = [];
  for (const message of queued) {
    const conversation = await getConversation(db, vendorId, message.conversationId);
    if (!conversation) {
      await markMessageStatus(db, vendorId, message.id, "failed");
      continue;
    }
    ready.push({ ...message, threadId: conversation.threadId, threadType: conversation.threadType });
  }
  return ready;
}

export async function completeOutboxSend(
  db: AppDatabase,
  vendorId: string,
  messageId: string,
  ok: boolean,
): Promise<void> {
  await markMessageStatus(db, vendorId, messageId, ok ? "sent" : "failed");
}
