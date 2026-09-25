import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { bookings } from "../db/schema";
import { AppError } from "../errors";
import type { BookingDraft, BookingStatus } from "../shop-types";

export async function listBookings(db: AppDatabase, vendorId: string) {
  return db
    .select()
    .from(bookings)
    .where(eq(bookings.vendorId, vendorId))
    .orderBy(desc(bookings.createdAt));
}

export async function getBooking(db: AppDatabase, vendorId: string, bookingId: string) {
  const rows = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.vendorId, vendorId), eq(bookings.id, bookingId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findOpenBooking(db: AppDatabase, vendorId: string, conversationId: string) {
  const rows = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.vendorId, vendorId),
        eq(bookings.conversationId, conversationId),
        eq(bookings.status, "cho_xac_nhan"),
      ),
    )
    .orderBy(desc(bookings.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveDraftBooking(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  draft: BookingDraft & { staffId: string | null },
) {
  const open = await findOpenBooking(db, vendorId, conversationId);
  const now = Date.now();
  if (open) {
    const next = {
      serviceName: draft.serviceName.slice(0, 120),
      staffId: draft.staffId,
      staffName: draft.staffName.slice(0, 120),
      whenText: draft.whenText.slice(0, 120),
      customerName: draft.customerName.slice(0, 120),
      phone: draft.phone.slice(0, 32),
      updatedAt: now,
    };
    await db.update(bookings).set(next).where(and(eq(bookings.vendorId, vendorId), eq(bookings.id, open.id)));
    return { ...open, ...next };
  }
  const created = {
    id: randomUUID(),
    vendorId,
    conversationId,
    serviceName: draft.serviceName.slice(0, 120),
    staffId: draft.staffId,
    staffName: draft.staffName.slice(0, 120),
    whenText: draft.whenText.slice(0, 120),
    customerName: draft.customerName.slice(0, 120),
    phone: draft.phone.slice(0, 32),
    status: "cho_xac_nhan" as const,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(bookings).values(created);
  return created;
}

export async function setBookingStatus(
  db: AppDatabase,
  vendorId: string,
  bookingId: string,
  status: BookingStatus,
  from: BookingStatus[],
) {
  const current = await getBooking(db, vendorId, bookingId);
  if (!current) throw new AppError("Không tìm thấy đơn", 404);
  if (!from.includes(current.status as BookingStatus)) throw new AppError("Không đổi được trạng thái này", 400);
  const updatedAt = Date.now();
  await db
    .update(bookings)
    .set({ status, updatedAt })
    .where(and(eq(bookings.vendorId, vendorId), eq(bookings.id, bookingId)));
  return { ...current, status, updatedAt };
}

export async function patchOpenBooking(
  db: AppDatabase,
  vendorId: string,
  bookingId: string,
  patch: { whenText?: string; staffId?: string | null; staffName?: string },
) {
  const current = await getBooking(db, vendorId, bookingId);
  if (!current) throw new AppError("Không tìm thấy đơn", 404);
  if (current.status !== "cho_xac_nhan") throw new AppError("Chỉ sửa đơn đang chờ xác nhận", 400);
  const next = {
    whenText: patch.whenText?.trim().slice(0, 120) || current.whenText,
    staffId: patch.staffId === undefined ? current.staffId : patch.staffId,
    staffName: patch.staffName === undefined ? current.staffName : patch.staffName.slice(0, 120),
    updatedAt: Date.now(),
  };
  await db.update(bookings).set(next).where(and(eq(bookings.vendorId, vendorId), eq(bookings.id, bookingId)));
  return { ...current, ...next };
}
