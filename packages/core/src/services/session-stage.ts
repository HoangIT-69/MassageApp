import { and, eq } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { bookings, conversations } from "../db/schema";
import { requireConversation } from "../repositories/conversations";
import { getAnchor, listFactsForConversation } from "../repositories/memory";
import { forwardStage, suggestStage, type ChatStage } from "./customer-name";

export async function syncConversationStage(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
): Promise<ChatStage> {
  const conversation = await requireConversation(db, vendorId, conversationId);
  const [facts, anchor, orders] = await Promise.all([
    listFactsForConversation(db, vendorId, conversationId),
    getAnchor(db, vendorId, conversationId),
    db
      .select({ status: bookings.status })
      .from(bookings)
      .where(and(eq(bookings.vendorId, vendorId), eq(bookings.conversationId, conversationId))),
  ]);
  const hasAdvice = facts.some((fact) => fact.kind === "preference" || fact.kind === "intent");
  const hasDraft = Boolean(anchor && (anchor.serviceName || anchor.staffName || anchor.whenText));
  const bookingStatus = orders.some((order) => order.status === "da_chot")
    ? "da_chot"
    : orders.some((order) => order.status === "cho_xac_nhan")
      ? "cho_xac_nhan"
      : null;
  const next = forwardStage(conversation.stage, suggestStage({ hasAdvice, hasDraft, bookingStatus }));
  if (next !== conversation.stage) {
    await db
      .update(conversations)
      .set({ stage: next })
      .where(and(eq(conversations.vendorId, vendorId), eq(conversations.id, conversationId)));
  }
  return next;
}
