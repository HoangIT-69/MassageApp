import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import {
  bookingAnchors,
  bookings,
  conversationSummaries,
  conversations,
  customerFacts,
  customerProfiles,
  messages,
} from "../db/schema";
import { AppError } from "../errors";
import type { ChannelName, ConversationRecord, InboundInput } from "../types";

export async function listConversations(
  db: AppDatabase,
  vendorId: string,
): Promise<ConversationRecord[]> {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.vendorId, vendorId))
    .orderBy(desc(conversations.lastMessageAt));
}

export async function getConversation(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
): Promise<ConversationRecord | null> {
  const rows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.vendorId, vendorId), eq(conversations.id, conversationId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function requireConversation(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
): Promise<ConversationRecord> {
  const row = await getConversation(db, vendorId, conversationId);
  if (!row) throw new AppError("Không tìm thấy cuộc trò chuyện", 404);
  return row;
}

export async function findConversationByThread(
  db: AppDatabase,
  vendorId: string,
  channel: ChannelName,
  threadId: string,
): Promise<ConversationRecord | null> {
  const rows = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.vendorId, vendorId),
        eq(conversations.channel, channel),
        eq(conversations.threadId, threadId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function insertConversation(
  db: AppDatabase,
  vendorId: string,
  input: InboundInput,
  aiEnabled = false,
): Promise<ConversationRecord> {
  const title = input.title.trim() || (input.threadType === "group" ? "Nhóm" : "Người dùng");
  const created: ConversationRecord = {
    id: randomUUID(),
    vendorId,
    channel: input.channel,
    threadId: input.threadId,
    threadType: input.threadType,
    title,
    avatarUrl: input.avatarUrl,
    lastMessage: null,
    lastMessageAt: null,
    aiEnabled,
    stage: "chao_hoi",
  };
  await db.insert(conversations).values(created);
  return created;
}

export async function updateConversationTitle(
  db: AppDatabase,
  conversation: ConversationRecord,
  input: InboundInput,
): Promise<ConversationRecord> {
  const nextTitle = input.overwriteTitle ? input.title.trim() : "";
  const avatarUrl = input.avatarUrl ?? conversation.avatarUrl;
  if (nextTitle === "" && avatarUrl === conversation.avatarUrl) return conversation;
  await db
    .update(conversations)
    .set({ ...(nextTitle ? { title: nextTitle } : {}), avatarUrl })
    .where(and(eq(conversations.vendorId, conversation.vendorId), eq(conversations.id, conversation.id)));
  return { ...conversation, title: nextTitle || conversation.title, avatarUrl };
}

export async function clearConversationPreview(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
): Promise<void> {
  await db
    .update(conversations)
    .set({ lastMessage: null, lastMessageAt: null })
    .where(and(eq(conversations.vendorId, vendorId), eq(conversations.id, conversationId)));
}

export async function touchConversation(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  lastMessage: string,
  lastMessageAt: number,
): Promise<void> {
  await db
    .update(conversations)
    .set({ lastMessage, lastMessageAt })
    .where(and(eq(conversations.vendorId, vendorId), eq(conversations.id, conversationId)));
}

export async function updateAiEnabled(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  aiEnabled: boolean,
): Promise<ConversationRecord> {
  const current = await requireConversation(db, vendorId, conversationId);
  await db
    .update(conversations)
    .set({ aiEnabled })
    .where(and(eq(conversations.vendorId, vendorId), eq(conversations.id, conversationId)));
  return { ...current, aiEnabled };
}

export async function deleteVendorChats(
  db: AppDatabase,
  vendorId: string,
  channel: ChannelName,
): Promise<void> {
  const owned = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.vendorId, vendorId), eq(conversations.channel, channel)));
  const ids = owned.map((row) => row.id);
  if (ids.length === 0) return;
  await db
    .delete(messages)
    .where(and(eq(messages.vendorId, vendorId), inArray(messages.conversationId, ids)));
  await db
    .delete(customerFacts)
    .where(and(eq(customerFacts.vendorId, vendorId), inArray(customerFacts.conversationId, ids)));
  await db
    .delete(conversationSummaries)
    .where(
      and(
        eq(conversationSummaries.vendorId, vendorId),
        inArray(conversationSummaries.conversationId, ids),
      ),
    );
  await db
    .delete(bookingAnchors)
    .where(and(eq(bookingAnchors.vendorId, vendorId), inArray(bookingAnchors.conversationId, ids)));
  await db
    .delete(customerProfiles)
    .where(
      and(eq(customerProfiles.vendorId, vendorId), inArray(customerProfiles.conversationId, ids)),
    );
  await db
    .delete(bookings)
    .where(and(eq(bookings.vendorId, vendorId), inArray(bookings.conversationId, ids)));
  await db.delete(conversations).where(inArray(conversations.id, ids));
}
