import { and, eq } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { conversations } from "../db/schema";
import { clearConversationPreview, requireConversation } from "../repositories/conversations";
import { deleteConversationMemory } from "../repositories/memory";
import { deleteConversationMessages } from "../repositories/messages";

export async function clearConversationContext(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
): Promise<void> {
  await requireConversation(db, vendorId, conversationId);
  await deleteConversationMessages(db, vendorId, conversationId);
  await deleteConversationMemory(db, vendorId, conversationId);
  await clearConversationPreview(db, vendorId, conversationId);
}

export async function removeConversation(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
): Promise<void> {
  await requireConversation(db, vendorId, conversationId);
  await deleteConversationMessages(db, vendorId, conversationId);
  await deleteConversationMemory(db, vendorId, conversationId);
  await db
    .delete(conversations)
    .where(and(eq(conversations.vendorId, vendorId), eq(conversations.id, conversationId)));
}
