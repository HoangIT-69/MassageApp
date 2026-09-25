export type Hours = {
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  sat: string;
  sun: string;
};

export type ShopProfile = {
  name: string;
  tagline: string;
  address: string;
  directions: string;
  hotline: string;
  hours: Hours;
  intro: string;
  amenities: string;
  policyBooking: string;
  policyCancel: string;
  policyLate: string;
  policyNewGuest: string;
  voice: string;
  forbidden: string;
};

export type ServiceRow = {
  id: string;
  name: string;
  durationMinutes: number;
  priceVnd: number;
  description: string;
  sortOrder: number;
  active: boolean;
};

export type Shift = { weekday: number; startTime: string; endTime: string };

export type StaffGender = "nam" | "nu" | "khac";

export type StaffRow = {
  id: string;
  name: string;
  gender: StaffGender;
  specialties: string;
  yearsExperience: number;
  bio: string;
  active: boolean;
  sortOrder: number;
  photoPath: string | null;
  shifts: Shift[];
};

export type CustomerOrder = {
  id: string;
  serviceName: string;
  staffName: string;
  whenText: string;
  status: string;
};

export type CustomerCard = {
  conversationId: string;
  zaloName: string;
  displayName: string;
  phone: string;
  orders: CustomerOrder[];
};

export type BookingRow = {
  id: string;
  conversationId: string;
  serviceName: string;
  staffId: string | null;
  staffName: string;
  whenText: string;
  customerName: string;
  phone: string;
  status: string;
};

export const WEEKDAYS = [
  ["mon", "Thứ 2"],
  ["tue", "Thứ 3"],
  ["wed", "Thứ 4"],
  ["thu", "Thứ 5"],
  ["fri", "Thứ 6"],
  ["sat", "Thứ 7"],
  ["sun", "Chủ nhật"],
] as const;

export const SHIFT_DAYS = ["", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

export const STATUS_LABEL: Record<string, string> = {
  cho_xac_nhan: "Chờ xác nhận",
  da_chot: "Đã chốt",
  tu_choi: "Từ chối",
  hoan_thanh: "Hoàn thành",
  huy: "Hủy",
};

export const FACT_LABEL: Record<string, string> = {
  name: "Tên",
  phone: "Số điện thoại",
  preference: "Sở thích",
  intent: "Ý định",
};

export function emptyHours(): Hours {
  return { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" };
}

export function blankShifts(): Shift[] {
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startTime: "", endTime: "" }));
}
