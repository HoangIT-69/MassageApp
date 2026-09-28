import { OUTBOX_BATCH_SIZE } from "../constants";
import type { AppDatabase } from "../db/client";
import { getConversation } from "../repositories/conversations";
import { claimQueued, markMessageStatus } from "../repositories/messages";
import type { ChannelName, MessageRecord } from "../types";

export type OutboxItem = MessageRecord & {
  channel: ChannelName;
  threadId: string;
  threadType: string;
};

export type ChannelSender = {
  channel: ChannelName;
  send(item: OutboxItem): Promise<void>;
};

export type FlushOutcome = "sent" | "waiting";

export async function takeOutbox(db: AppDatabase, vendorId: string): Promise<OutboxItem[]> {
  const queued = await claimQueued(db, vendorId, OUTBOX_BATCH_SIZE);
  const ready: OutboxItem[] = [];
  for (const message of queued) {
    const conversation = await getConversation(db, vendorId, message.conversationId);
    if (!conversation) {
      await markMessageStatus(db, vendorId, message.id, "failed");
      continue;
    }
    ready.push({
      ...message,
      channel: conversation.channel as ChannelName,
      threadId: conversation.threadId,
      threadType: conversation.threadType,
    });
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

// Channel chưa có sender thì để tin nằm nguyên trong hàng chờ: Zalo chưa quét QR
// không được làm reply Facebook chết, và ngược lại. Đánh failed rồi ném lại để
// nơi gọi ghi log — console thuộc tầng ngoài, không thuộc core.
export async function routeOutbox(
  db: AppDatabase,
  vendorId: string,
  senders: Map<ChannelName, ChannelSender>,
  item: OutboxItem,
): Promise<FlushOutcome> {
  const sender = senders.get(item.channel);
  if (!sender) return "waiting";
  try {
    await sender.send(item);
    await completeOutboxSend(db, vendorId, item.id, true);
    return "sent";
  } catch (error) {
    await completeOutboxSend(db, vendorId, item.id, false);
    throw error;
  }
}
