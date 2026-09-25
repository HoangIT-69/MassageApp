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

export function listVendorConversations(db: AppDatabase, vendorId: string): ConversationRecord[] {
  return listConversations(db, vendorId);
}

export function listVendorMessages(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  after: number,
): MessageRecord[] {
  requireConversation(db, vendorId, conversationId);
  return listMessages(db, vendorId, conversationId, after);
}

export function setConversationAi(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  aiEnabled: boolean,
): ConversationRecord {
  return updateAiEnabled(db, vendorId, conversationId, aiEnabled);
}

export function enqueueOperatorMessage(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  content: string,
): MessageRecord {
  const trimmed = content.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new AppError("Nội dung tin nhắn không hợp lệ", 400);
  }
  requireConversation(db, vendorId, conversationId);
  const createdAt = Date.now();
  const message = insertMessage(db, {
    vendorId,
    conversationId,
    direction: "out",
    source: "operator",
    content: trimmed,
    zaloMsgId: null,
    status: "queued",
    createdAt,
  });
  touchConversation(db, conversationId, trimmed, createdAt);
  return message;
}
