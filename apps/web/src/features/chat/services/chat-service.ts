import {
  clearConversationContext,
  removeConversation,
  enqueueOperatorMessage,
  ensureShopSeed,
  listVendorConversations,
  listVendorMessages,
  readConversationSession,
  readShopAiAll,
  readZaloLink,
  requestZaloLogout,
  setConversationAi,
  setShopAiAll,
  toQrDataUrl,
  type ConversationRecord,
  type MessageRecord,
} from "@zalo/core";
import { getEnv } from "@/config/env";
import { getDb } from "@/lib/db";

export function conversationDto(row: ConversationRecord) {
  return {
    id: row.id,
    channel: row.channel,
    title: row.title,
    avatarUrl: row.avatarUrl,
    lastMessage: row.lastMessage,
    lastMessageAt: row.lastMessageAt,
    aiEnabled: Boolean(row.aiEnabled),
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

export async function listChats(vendorId: string) {
  return (await listVendorConversations(await getDb(), vendorId)).map(conversationDto);
}

export async function listChatMessages(vendorId: string, conversationId: string, after: number) {
  return (await listVendorMessages(await getDb(), vendorId, conversationId, after)).map(messageDto);
}

export async function setChatAi(vendorId: string, conversationId: string, aiEnabled: boolean) {
  return conversationDto(await setConversationAi(await getDb(), vendorId, conversationId, aiEnabled));
}

export async function sendChatMessage(vendorId: string, conversationId: string, content: string) {
  return messageDto(await enqueueOperatorMessage(await getDb(), vendorId, conversationId, content));
}

export async function logoutZalo(vendorId: string): Promise<{ status: "disconnected" }> {
  await requestZaloLogout(await getDb(), vendorId, getEnv().credentialsPath);
  return { status: "disconnected" };
}

export async function zaloStatus(vendorId: string) {
  const db = await getDb();
  const link = await readZaloLink(db, vendorId);
  const aiAll = await readShopAiAll(db, vendorId);
  return { status: link.status, displayName: link.displayName, aiAll };
}

export async function setAllAi(vendorId: string, enabled: boolean) {
  const db = await getDb();
  await ensureShopSeed(db, vendorId);
  return setShopAiAll(db, vendorId, enabled);
}

export async function clearChatContext(vendorId: string, conversationId: string) {
  await clearConversationContext(await getDb(), vendorId, conversationId);
}

export async function removeChat(vendorId: string, conversationId: string) {
  await removeConversation(await getDb(), vendorId, conversationId);
}

export async function readChatSession(vendorId: string, conversationId: string) {
  return readConversationSession(await getDb(), vendorId, conversationId);
}

export async function zaloQr(vendorId: string): Promise<{ image: string } | null> {
  const link = await readZaloLink(await getDb(), vendorId);
  if (link.status !== "awaiting_qr" || !link.qrImage) return null;
  return { image: toQrDataUrl(link.qrImage) };
}
