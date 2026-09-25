import { MAX_MESSAGE_LENGTH } from "../constants";
import type { AppDatabase } from "../db/client";
import { AppError } from "../errors";
import {
  listConversations,
  requireConversation,
  touchConversation,
  updateAiEnabled,
} from "../repositories/conversations";
import { insertMessage, listMessages } from "../repositories/messages";
import type { ConversationRecord, MessageRecord } from "../types";

export async function listVendorConversations(
  db: AppDatabase,
  vendorId: string,
): Promise<ConversationRecord[]> {
  return listConversations(db, vendorId);
}

export async function listVendorMessages(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  after: number,
): Promise<MessageRecord[]> {
  await requireConversation(db, vendorId, conversationId);
  return listMessages(db, vendorId, conversationId, after);
}

export async function setConversationAi(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  aiEnabled: boolean,
): Promise<ConversationRecord> {
  return updateAiEnabled(db, vendorId, conversationId, aiEnabled);
}

export async function enqueueOperatorMessage(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  content: string,
): Promise<MessageRecord> {
  const trimmed = content.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new AppError("Nội dung tin nhắn không hợp lệ", 400);
  }
  await requireConversation(db, vendorId, conversationId);
  const createdAt = Date.now();
  const message = await insertMessage(db, {
    vendorId,
    conversationId,
    direction: "out",
    source: "operator",
    content: trimmed,
    zaloMsgId: null,
    status: "queued",
    createdAt,
  });
  await touchConversation(db, vendorId, conversationId, trimmed, createdAt);
  return message;
}
