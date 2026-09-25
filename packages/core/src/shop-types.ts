import type { WEEKDAY_KEYS } from "./constants";

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export type ShopHours = Record<WeekdayKey, string>;

export type StaffGender = "nam" | "nu" | "khac";

export type FactKind = "name" | "phone" | "preference" | "intent";

export type BookingStatus = "cho_xac_nhan" | "da_chot" | "tu_choi" | "hoan_thanh" | "huy";

export type ShopProfileInput = {
  name: string;
  tagline: string;
  address: string;
  directions: string;
  hotline: string;
  hours: ShopHours;
  intro: string;
  amenities: string;
  policyBooking: string;
  policyCancel: string;
  policyLate: string;
  policyNewGuest: string;
  voice: string;
  forbidden: string;
};

export type ServiceInput = {
  name: string;
  durationMinutes: number;
  priceVnd: number;
  description: string;
  sortOrder: number;
  active: boolean;
};

export type ShiftInput = {
  weekday: number;
  startTime: string;
  endTime: string;
};

export type StaffInput = {
  name: string;
  gender: StaffGender;
  specialties: string;
  yearsExperience: number;
  bio: string;
  active: boolean;
  sortOrder: number;
  shifts: ShiftInput[];
};

export type BookingDraft = {
  serviceName: string;
  staffName: string;
  whenText: string;
  customerName: string;
  phone: string;
};

export type AnchorDraft = {
  serviceName: string;
  staffName: string;
  whenText: string;
  missing: string;
};
