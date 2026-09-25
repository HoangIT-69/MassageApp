import path from "node:path";
import {
  confirmBooking,
  deleteService,
  editOpenBooking,
  finishBooking,
  getShopProfile,
  insertService,
  insertStaff,
  listBookings,
  listCustomerCards,
  listServices,
  listShifts,
  listStaff,
  parseHours,
  createObjectStore,
  loadPhotoBytes,
  photoExtension,
  rejectBooking,
  saveShopProfile,
  setStaffPhoto,
  staffPhotoRelative,
  updateCustomerCard,
  updateService,
  updateStaff,
  assertPhotoSize,
  type BookingStatus,
  type ServiceInput,
  type ShopProfileInput,
  type StaffInput,
} from "@zalo/core";
import { getEnv } from "@/config/env";
import { getDb } from "@/lib/db";

export async function readShop(vendorId: string) {
  const db = await getDb();
  const profile = await getShopProfile(db, vendorId);
  const serviceRows = await listServices(db, vendorId);
  return {
    profile: profile
      ? {
          name: profile.name,
          tagline: profile.tagline,
          address: profile.address,
          directions: profile.directions,
          hotline: profile.hotline,
          hours: parseHours(profile.hoursJson),
          intro: profile.intro,
          amenities: profile.amenities,
          policyBooking: profile.policyBooking,
          policyCancel: profile.policyCancel,
          policyLate: profile.policyLate,
          policyNewGuest: profile.policyNewGuest,
          voice: profile.voice,
          forbidden: profile.forbidden,
        }
      : null,
    services: serviceRows,
  };
}

export async function writeShop(vendorId: string, input: ShopProfileInput) {
  return saveShopProfile(await getDb(), vendorId, input);
}

export async function addService(vendorId: string, input: ServiceInput) {
  return insertService(await getDb(), vendorId, input);
}

export async function changeService(vendorId: string, serviceId: string, input: ServiceInput) {
  return updateService(await getDb(), vendorId, serviceId, input);
}

export async function removeService(vendorId: string, serviceId: string) {
  await deleteService(await getDb(), vendorId, serviceId);
}

export async function readStaff(vendorId: string) {
  const db = await getDb();
  const people = await listStaff(db, vendorId);
  const shifts = await listShifts(db, vendorId);
  return people.map((person) => ({
    ...person,
    shifts: shifts
      .filter((shift) => shift.staffId === person.id)
      .map((shift) => ({ weekday: shift.weekday, startTime: shift.startTime, endTime: shift.endTime })),
  }));
}

export async function addStaff(vendorId: string, input: StaffInput) {
  return insertStaff(await getDb(), vendorId, input);
}

export async function changeStaff(vendorId: string, staffId: string, input: StaffInput) {
  return updateStaff(await getDb(), vendorId, staffId, input);
}

export async function storeStaffPhoto(vendorId: string, staffId: string, file: File) {
  assertPhotoSize(file.size);
  const ext = photoExtension(file.type);
  const relative = staffPhotoRelative(vendorId, staffId, ext);
  const bytes = Buffer.from(await file.arrayBuffer());
  await createObjectStore(getEnv().objectStore).put(relative, bytes, file.type);
  return setStaffPhoto(await getDb(), vendorId, staffId, relative);
}

export async function readStaffPhoto(vendorId: string, staffId: string) {
  const people = await readStaff(vendorId);
  const person = people.find((item) => item.id === staffId);
  if (!person?.photoPath) return null;
  const env = getEnv();
  const bytes = await loadPhotoBytes(createObjectStore(env.objectStore), env.dataDir, person.photoPath);
  const ext = path.posix.extname(person.photoPath).slice(1);
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { bytes, type };
}

export async function readCustomers(vendorId: string) {
  return listCustomerCards(await getDb(), vendorId);
}

export async function writeCustomer(
  vendorId: string,
  conversationId: string,
  input: { displayName: string; phone: string; notes?: string },
) {
  return updateCustomerCard(await getDb(), vendorId, conversationId, input);
}

export async function readBookings(vendorId: string) {
  return listBookings(await getDb(), vendorId);
}

export async function acceptBooking(vendorId: string, bookingId: string) {
  return confirmBooking(await getDb(), vendorId, bookingId);
}

export async function declineBooking(vendorId: string, bookingId: string) {
  return rejectBooking(await getDb(), vendorId, bookingId);
}

export async function moveBooking(vendorId: string, bookingId: string, status: BookingStatus) {
  return finishBooking(await getDb(), vendorId, bookingId, status);
}

export async function reviseBooking(
  vendorId: string,
  bookingId: string,
  patch: { whenText?: string; staffId?: string | null },
) {
  return editOpenBooking(await getDb(), vendorId, bookingId, patch);
}
