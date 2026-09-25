import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { WEEKDAY_KEYS } from "../constants";
import type { AppDatabase } from "../db/client";
import { conversations, services, shopProfiles, staff, staffShifts } from "../db/schema";
import { AppError } from "../errors";
import type { ServiceInput, ShiftInput, ShopHours, ShopProfileInput, StaffGender, StaffInput } from "../shop-types";

const TEXT_LIMIT = 4000;
const NAME_LIMIT = 120;

function clip(value: string, limit: number): string {
  return value.trim().slice(0, limit);
}

function requireName(value: string, label: string): string {
  const name = clip(value, NAME_LIMIT);
  if (name === "") throw new AppError(`Thiếu ${label}`, 400);
  return name;
}

export function emptyHours(): ShopHours {
  return { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" };
}

export function parseHours(raw: string): ShopHours {
  const hours = emptyHours();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return hours;
    const record = parsed as Record<string, unknown>;
    for (const key of WEEKDAY_KEYS) {
      const value = record[key];
      hours[key] = typeof value === "string" ? value.trim().slice(0, 40) : "";
    }
  } catch {
    return hours;
  }
  return hours;
}

function assertGender(value: string): StaffGender {
  if (value === "nam" || value === "nu" || value === "khac") return value;
  throw new AppError("Giới tính không hợp lệ", 400);
}

function assertShift(shift: ShiftInput): ShiftInput {
  if (shift.weekday < 1 || shift.weekday > 7) throw new AppError("Thứ không hợp lệ", 400);
  if (!/^\d{2}:\d{2}$/.test(shift.startTime) || !/^\d{2}:\d{2}$/.test(shift.endTime)) {
    throw new AppError("Giờ ca không hợp lệ", 400);
  }
  return shift;
}

export async function getShopProfile(db: AppDatabase, vendorId: string) {
  const rows = await db.select().from(shopProfiles).where(eq(shopProfiles.vendorId, vendorId)).limit(1);
  return rows[0] ?? null;
}

export async function saveShopProfile(db: AppDatabase, vendorId: string, input: ShopProfileInput) {
  const row = {
    vendorId,
    name: requireName(input.name, "tên quán"),
    tagline: clip(input.tagline, 255),
    address: clip(input.address, 255),
    directions: clip(input.directions, TEXT_LIMIT),
    hotline: clip(input.hotline, 32),
    hoursJson: JSON.stringify(parseHours(JSON.stringify(input.hours))),
    intro: clip(input.intro, TEXT_LIMIT),
    amenities: clip(input.amenities, TEXT_LIMIT),
    policyBooking: clip(input.policyBooking, TEXT_LIMIT),
    policyCancel: clip(input.policyCancel, TEXT_LIMIT),
    policyLate: clip(input.policyLate, TEXT_LIMIT),
    policyNewGuest: clip(input.policyNewGuest, TEXT_LIMIT),
    voice: clip(input.voice, TEXT_LIMIT),
    forbidden: clip(input.forbidden, TEXT_LIMIT),
    aiAll: false,
    updatedAt: Date.now(),
  };
  await db.insert(shopProfiles).values(row).onDuplicateKeyUpdate({
    set: {
      name: row.name,
      tagline: row.tagline,
      address: row.address,
      directions: row.directions,
      hotline: row.hotline,
      hoursJson: row.hoursJson,
      intro: row.intro,
      amenities: row.amenities,
      policyBooking: row.policyBooking,
      policyCancel: row.policyCancel,
      policyLate: row.policyLate,
      policyNewGuest: row.policyNewGuest,
      voice: row.voice,
      forbidden: row.forbidden,
      updatedAt: row.updatedAt,
    },
  });
  return row;
}

export async function readShopAiAll(db: AppDatabase, vendorId: string): Promise<boolean> {
  const profile = await getShopProfile(db, vendorId);
  return Boolean(profile?.aiAll);
}

export async function setShopAiAll(db: AppDatabase, vendorId: string, enabled: boolean): Promise<boolean> {
  const profile = await getShopProfile(db, vendorId);
  if (!profile) throw new AppError("Chưa có hồ sơ quán", 404);
  await db
    .update(shopProfiles)
    .set({ aiAll: enabled, updatedAt: Date.now() })
    .where(eq(shopProfiles.vendorId, vendorId));
  await db.update(conversations).set({ aiEnabled: enabled }).where(eq(conversations.vendorId, vendorId));
  return enabled;
}

export async function listServices(db: AppDatabase, vendorId: string) {
  return db.select().from(services).where(eq(services.vendorId, vendorId)).orderBy(asc(services.sortOrder));
}

export async function insertService(db: AppDatabase, vendorId: string, input: ServiceInput) {
  const created = {
    id: randomUUID(),
    vendorId,
    name: requireName(input.name, "tên dịch vụ"),
    durationMinutes: input.durationMinutes,
    priceVnd: input.priceVnd,
    description: clip(input.description, 500),
    sortOrder: input.sortOrder,
    active: input.active,
  };
  if (created.durationMinutes < 1 || created.priceVnd < 0) throw new AppError("Giá hoặc thời lượng không hợp lệ", 400);
  await db.insert(services).values(created);
  return created;
}

export async function updateService(db: AppDatabase, vendorId: string, serviceId: string, input: ServiceInput) {
  const current = await db
    .select()
    .from(services)
    .where(and(eq(services.vendorId, vendorId), eq(services.id, serviceId)))
    .limit(1);
  if (!current[0]) throw new AppError("Không tìm thấy dịch vụ", 404);
  const next = {
    name: requireName(input.name, "tên dịch vụ"),
    durationMinutes: input.durationMinutes,
    priceVnd: input.priceVnd,
    description: clip(input.description, 500),
    sortOrder: input.sortOrder,
    active: input.active,
  };
  if (next.durationMinutes < 1 || next.priceVnd < 0) throw new AppError("Giá hoặc thời lượng không hợp lệ", 400);
  await db.update(services).set(next).where(and(eq(services.vendorId, vendorId), eq(services.id, serviceId)));
  return { ...current[0], ...next };
}

export async function deleteService(db: AppDatabase, vendorId: string, serviceId: string) {
  await db.delete(services).where(and(eq(services.vendorId, vendorId), eq(services.id, serviceId)));
}

export async function listStaff(db: AppDatabase, vendorId: string) {
  return db.select().from(staff).where(eq(staff.vendorId, vendorId)).orderBy(asc(staff.sortOrder));
}

export async function listShifts(db: AppDatabase, vendorId: string) {
  return db.select().from(staffShifts).where(eq(staffShifts.vendorId, vendorId)).orderBy(asc(staffShifts.weekday));
}

export async function getStaff(db: AppDatabase, vendorId: string, staffId: string) {
  const rows = await db
    .select()
    .from(staff)
    .where(and(eq(staff.vendorId, vendorId), eq(staff.id, staffId)))
    .limit(1);
  return rows[0] ?? null;
}

async function replaceShifts(db: AppDatabase, vendorId: string, staffId: string, shifts: ShiftInput[]) {
  await db.delete(staffShifts).where(and(eq(staffShifts.vendorId, vendorId), eq(staffShifts.staffId, staffId)));
  if (shifts.length === 0) return;
  await db.insert(staffShifts).values(
    shifts.map((shift) => {
      const valid = assertShift(shift);
      return {
        id: randomUUID(),
        vendorId,
        staffId,
        weekday: valid.weekday,
        startTime: valid.startTime,
        endTime: valid.endTime,
      };
    }),
  );
}

function staffValues(vendorId: string, input: StaffInput) {
  return {
    vendorId,
    name: requireName(input.name, "tên nhân viên"),
    gender: assertGender(input.gender),
    specialties: clip(input.specialties, 255),
    yearsExperience: Math.max(0, input.yearsExperience),
    bio: clip(input.bio, 500),
    active: input.active,
    sortOrder: input.sortOrder,
  };
}

export async function insertStaff(db: AppDatabase, vendorId: string, input: StaffInput) {
  const created = { id: randomUUID(), photoPath: null, ...staffValues(vendorId, input) };
  await db.insert(staff).values(created);
  await replaceShifts(db, vendorId, created.id, input.shifts);
  return created;
}

export async function updateStaff(db: AppDatabase, vendorId: string, staffId: string, input: StaffInput) {
  const current = await getStaff(db, vendorId, staffId);
  if (!current) throw new AppError("Không tìm thấy nhân viên", 404);
  const next = staffValues(vendorId, input);
  await db.update(staff).set(next).where(and(eq(staff.vendorId, vendorId), eq(staff.id, staffId)));
  await replaceShifts(db, vendorId, staffId, input.shifts);
  return { ...current, ...next };
}

export async function setStaffPhoto(db: AppDatabase, vendorId: string, staffId: string, photoPath: string | null) {
  const current = await getStaff(db, vendorId, staffId);
  if (!current) throw new AppError("Không tìm thấy nhân viên", 404);
  await db.update(staff).set({ photoPath }).where(and(eq(staff.vendorId, vendorId), eq(staff.id, staffId)));
  return { ...current, photoPath };
}
