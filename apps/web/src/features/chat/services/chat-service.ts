import {
  enqueueOperatorMessage,
  listVendorConversations,
  listVendorMessages,
  readZaloLink,
  requestZaloLogout,
  setConversationAi,
  toQrDataUrl,
  type ConversationRecord,
  type MessageRecord,
} from "@zalo/core";
import { getEnv } from "@/config/env";
import { getDb } from "@/lib/db";

export function conversationDto(row: ConversationRecord) {
  return {
    id: row.id,
    title: row.title,
    avatarUrl: row.avatarUrl,
    lastMessage: row.lastMessage,
    lastMessageAt: row.lastMessageAt,
    aiEnabled: row.aiEnabled,
    threadType: row.threadType,
  };
}

export function messageDto(row: MessageRecord) {
  return {
    id: row.id,
    direction: row.direction,
    source: row.source,
    content: row.content,
    status: row.status,
    createdAt: row.createdAt,
  };
}

export function listChats(vendorId: string) {
  return listVendorConversations(getDb(), vendorId).map(conversationDto);
}

export function listChatMessages(vendorId: string, conversationId: string, after: number) {
  return listVendorMessages(getDb(), vendorId, conversationId, after).map(messageDto);
}

export function setChatAi(vendorId: string, conversationId: string, aiEnabled: boolean) {
  return conversationDto(setConversationAi(getDb(), vendorId, conversationId, aiEnabled));
}

export function sendChatMessage(vendorId: string, conversationId: string, content: string) {
  return messageDto(enqueueOperatorMessage(getDb(), vendorId, conversationId, content));
}

export function logoutZalo(vendorId: string): { status: "disconnected" } {
  requestZaloLogout(getDb(), vendorId, getEnv().credentialsPath);
  return { status: "disconnected" };
}

export function zaloStatus(vendorId: string) {
  const link = readZaloLink(getDb(), vendorId);
  return { status: link.status, displayName: link.displayName };
}

export function zaloQr(vendorId: string): { image: string } | null {
  const link = readZaloLink(getDb(), vendorId);
  if (link.status !== "awaiting_qr" || !link.qrImage) return null;
  return { image: toQrDataUrl(link.qrImage) };
}
