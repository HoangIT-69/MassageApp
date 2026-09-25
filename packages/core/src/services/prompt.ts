import { WEEKDAY_KEYS, WEEKDAY_LABELS } from "../constants";
import type { AnchorDraft, FactKind, ShopHours } from "../shop-types";

const GENDER_LABEL: Record<string, string> = {
  nam: "Nam",
  nu: "Nữ",
  khac: "Khác",
};

export type PromptService = {
  name: string;
  durationMinutes: number;
  priceVnd: number;
  description: string;
  active: boolean;
};

export type PromptShift = {
  weekday: number;
  startTime: string;
  endTime: string;
};

export type PromptStaff = {
  id: string;
  name: string;
  gender: string;
  specialties: string;
  yearsExperience: number;
  bio: string;
  active: boolean;
  hasPhoto: boolean;
  shifts: PromptShift[];
};

export type PromptFact = {
  kind: FactKind;
  content: string;
};

export type PromptSummary = {
  body: string;
};

export type ShopPromptInput = {
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
  services: PromptService[];
  staff: PromptStaff[];
  customerName: string;
  zaloName: string;
  nameConfirmed: boolean;
  customerPhone: string;
  notes: string;
  facts: PromptFact[];
  summaries: PromptSummary[];
  anchor: AnchorDraft | null;
};

export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

function hoursBlock(hours: ShopHours): string {
  return WEEKDAY_KEYS.map((key, index) => {
    const value = hours[key]?.trim() || "nghỉ";
    return `${WEEKDAY_LABELS[index + 1]}: ${value}`;
  }).join("\n");
}

function shiftLine(shifts: PromptShift[]): string {
  if (shifts.length === 0) return "chưa có ca";
  return shifts
    .map((shift) => `${WEEKDAY_LABELS[shift.weekday] ?? "Ngày"} ${shift.startTime}-${shift.endTime}`)
    .join(", ");
}

function customerBlock(input: ShopPromptInput): string {
  const prefs = input.facts.filter((fact) => fact.kind === "preference").map((fact) => fact.content);
  const intents = input.facts.filter((fact) => fact.kind === "intent").map((fact) => fact.content);
  const lines = [
    `Tên Zalo gợi ý: ${input.zaloName || "chưa rõ"}`,
    input.nameConfirmed
      ? `Tên đã xác nhận: ${input.customerName}`
      : "Tên đã xác nhận: chưa. Hỏi khách có đúng tên Zalo gợi ý không trước khi gọi tên.",
    `Số điện thoại: ${input.customerPhone || "chưa rõ"}`,
    `Sở thích: ${prefs.join("; ") || "chưa rõ"}`,
    `Ý định: ${intents.join("; ") || "chưa rõ"}`,
  ];
  if (input.notes.trim()) lines.push(`Ghi chú admin: ${input.notes.trim()}`);
  if (input.summaries.length > 0) {
    lines.push("Tóm tắt hội thoại:");
    for (const summary of input.summaries) lines.push(`- ${summary.body}`);
  }
  if (input.anchor) {
    lines.push(
      `Lịch đang dở: gói ${input.anchor.serviceName || "?"}, nhân viên ${input.anchor.staffName || "?"}, giờ ${input.anchor.whenText || "?"}, còn thiếu ${input.anchor.missing || "không"}`,
    );
  }
  return lines.join("\n");
}

export function composeSystemPrompt(input: ShopPromptInput): string {
  const services = input.services
    .filter((service) => service.active)
    .map(
      (service) =>
        `- ${service.name}: ${service.durationMinutes} phút, ${formatVnd(service.priceVnd)}. ${service.description}`.trim(),
    )
    .join("\n");
  const staff = input.staff
    .map(
      (person) =>
        `- id=${person.id}; tên=${person.name}; giới=${GENDER_LABEL[person.gender] ?? person.gender}; chuyên môn=${person.specialties}; ${person.yearsExperience} năm; ca=${shiftLine(person.shifts)}; nhận khách=${person.active ? "có" : "không"}; HAS_PHOTO=${person.hasPhoto ? "true" : "false"}; ${person.bio}`,
    )
    .join("\n");
  return [
    "Bạn là lễ tân của một quán massage, trả lời tin Zalo.",
    input.voice.trim() || "Xưng hô nhẹ nhàng, ngắn, tiếng Việt.",
    "Không nói rằng bạn là mô hình ngôn ngữ. Không báo lịch đã được chốt. Chỉ nói sẽ nhờ quán xác nhận.",
    `Không được hứa: ${input.forbidden.trim() || "giá ngoài menu, chẩn đoán bệnh, dịch vụ không có trong menu."}`,
    "Khi khách muốn xem nhân viên và người đó HAS_PHOTO true, thêm cuối câu trả lời [SEND_PHOTOS:id]. Nhiều người thì cách nhau bằng dấu phẩy. Chỉ dùng id có trong danh sách.",
    'Khi khách đang đặt lịch, thêm đúng một khối [BOOKING]{"serviceName":"","staffName":"","whenText":"","customerName":"","phone":""}[/BOOKING]. Chỉ điền trường khách đã nói, trường chưa biết để chuỗi rỗng. customerName để trống cho đến khi khách xác nhận tên.',
    "",
    "=== QUÁN ===",
    `Tên: ${input.name}`,
    input.tagline ? `Giới thiệu ngắn: ${input.tagline}` : "",
    `Địa chỉ: ${input.address}`,
    `Cách đi: ${input.directions}`,
    `Hotline: ${input.hotline}`,
    "Giờ mở cửa:",
    hoursBlock(input.hours),
    `Giới thiệu: ${input.intro}`,
    `Tiện nghi: ${input.amenities}`,
    `Đặt trước: ${input.policyBooking}`,
    `Hủy lịch: ${input.policyCancel}`,
    `Đến trễ: ${input.policyLate}`,
    `Khách mới: ${input.policyNewGuest}`,
    "",
    "=== DỊCH VỤ ===",
    services || "Chưa có dịch vụ.",
    "",
    "=== NHÂN VIÊN ===",
    "Tên dưới đây chỉ là kỹ thuật viên. Không gọi khách bằng các tên này và không ghi vào customerName.",
    staff || "Chưa có nhân viên.",
    "",
    "=== KHÁCH ===",
    customerBlock(input),
  ]
    .filter((line) => line !== "")
    .join("\n");
}
