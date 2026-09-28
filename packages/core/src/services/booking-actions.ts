import type { AppDatabase } from "../db/client";
import { AppError } from "../errors";
import { getBooking, patchOpenBooking, setBookingStatus } from "../repositories/bookings";
import { getStaff } from "../repositories/catalog";
import { requireConversation, touchConversation } from "../repositories/conversations";
import { insertMessage } from "../repositories/messages";
import type { BookingStatus } from "../shop-types";
import type { ChannelName } from "../types";
import { syncConversationStage } from "./session-stage";

function confirmationText(booking: {
  serviceName: string;
  whenText: string;
  staffName: string;
  customerName: string;
}): string {
  const staff = booking.staffName ? ` với ${booking.staffName}` : "";
  const name = booking.customerName ? `${booking.customerName} ơi, ` : "";
  return `${name}quán đã chốt lịch ${booking.serviceName} vào ${booking.whenText}${staff}. Nhờ bạn đến đúng giờ.`;
}

export async function confirmBooking(db: AppDatabase, vendorId: string, bookingId: string) {
  const booking = await setBookingStatus(db, vendorId, bookingId, "da_chot", ["cho_xac_nhan"]);
  const conversation = await requireConversation(db, vendorId, booking.conversationId);
  const content = confirmationText(booking);
  const createdAt = Date.now();
  await insertMessage(db, {
    vendorId,
    channel: conversation.channel as ChannelName,
    conversationId: booking.conversationId,
    direction: "out",
    source: "operator",
    content,
    externalMsgId: null,
    status: "queued",
    createdAt,
  });
  await touchConversation(db, vendorId, booking.conversationId, content, createdAt);
  await syncConversationStage(db, vendorId, booking.conversationId);
  return booking;
}

export async function rejectBooking(db: AppDatabase, vendorId: string, bookingId: string) {
  return setBookingStatus(db, vendorId, bookingId, "tu_choi", ["cho_xac_nhan"]);
}

export async function finishBooking(db: AppDatabase, vendorId: string, bookingId: string, status: BookingStatus) {
  if (status !== "hoan_thanh" && status !== "huy") throw new AppError("Trạng thái không hợp lệ", 400);
  return setBookingStatus(db, vendorId, bookingId, status, ["da_chot", "cho_xac_nhan"]);
}

export async function editOpenBooking(
  db: AppDatabase,
  vendorId: string,
  bookingId: string,
  patch: { whenText?: string; staffId?: string | null },
) {
  let staffName: string | undefined;
  if (patch.staffId) {
    const person = await getStaff(db, vendorId, patch.staffId);
    if (!person) throw new AppError("Không tìm thấy nhân viên", 404);
    staffName = person.name;
  }
  if (patch.staffId === null) staffName = "";
  const booking = await patchOpenBooking(db, vendorId, bookingId, { ...patch, staffName });
  const check = await getBooking(db, vendorId, booking.id);
  if (!check || check.vendorId !== vendorId) throw new AppError("Không tìm thấy đơn", 404);
  return booking;
}
