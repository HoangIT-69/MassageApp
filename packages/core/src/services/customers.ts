import type { AppDatabase } from "../db/client";
import { listBookings } from "../repositories/bookings";
import { requireConversation } from "../repositories/conversations";
import { listConversations } from "../repositories/conversations";
import { getCustomerProfile, saveCustomerProfile } from "../repositories/memory";

export async function listCustomerCards(db: AppDatabase, vendorId: string) {
  const [chats, orders] = await Promise.all([listConversations(db, vendorId), listBookings(db, vendorId)]);
  const people = chats.filter((chat) => chat.threadType === "user");
  const cards = [];
  for (const chat of people) {
    const profile = await getCustomerProfile(db, vendorId, chat.id);
    cards.push({
      conversationId: chat.id,
      zaloName: chat.title,
      displayName: profile?.displayName ?? "",
      phone: profile?.phone ?? "",
      orders: orders
        .filter((order) => order.conversationId === chat.id)
        .map((order) => ({
          id: order.id,
          serviceName: order.serviceName,
          staffName: order.staffName,
          whenText: order.whenText,
          status: order.status,
        })),
    });
  }
  return cards;
}

export async function updateCustomerCard(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  input: { displayName: string; phone: string; notes?: string },
) {
  await requireConversation(db, vendorId, conversationId);
  const existing = await getCustomerProfile(db, vendorId, conversationId);
  const saved = await saveCustomerProfile(db, vendorId, conversationId, {
    displayName: input.displayName,
    phone: input.phone,
    notes: input.notes ?? existing?.notes ?? "",
  });
  return {
    conversationId,
    displayName: saved.displayName ?? "",
    phone: saved.phone ?? "",
    notes: saved.notes ?? "",
  };
}
