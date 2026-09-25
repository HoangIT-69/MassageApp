import type { AnchorDraft, BookingDraft, FactKind } from "../shop-types";

const PHOTO_TAG = /\[SEND_PHOTOS:([a-zA-Z0-9_,-]+)\]/g;
const BOOKING_TAG = /\[BOOKING\]([\s\S]*?)\[\/BOOKING\]/g;
const FACT_KINDS = new Set<FactKind>(["name", "phone", "preference", "intent"]);

export type ParsedReply = {
  text: string;
  photoIds: string[];
  booking: BookingDraft | null;
};

export type ExtractedFact = {
  kind: FactKind;
  content: string;
  confidence: number;
};

export type ExtractedMemory = {
  facts: ExtractedFact[];
  summary: string | null;
  anchor: AnchorDraft | null;
};

function emptyDraft(): BookingDraft {
  return { serviceName: "", staffName: "", whenText: "", customerName: "", phone: "" };
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function bookingIsReady(draft: BookingDraft): boolean {
  return draft.serviceName !== "" && draft.whenText !== "" && (draft.customerName !== "" || draft.phone !== "");
}

export function missingBookingFields(draft: BookingDraft): string {
  const missing: string[] = [];
  if (!draft.serviceName) missing.push("gói");
  if (!draft.whenText) missing.push("giờ");
  if (!draft.customerName && !draft.phone) missing.push("tên hoặc số điện thoại");
  return missing.join(", ");
}

function readDraft(raw: string): BookingDraft | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    return {
      serviceName: asText(record.serviceName),
      staffName: asText(record.staffName),
      whenText: asText(record.whenText),
      customerName: asText(record.customerName),
      phone: asText(record.phone),
    };
  } catch {
    return null;
  }
}

export function parseModelReply(raw: string): ParsedReply {
  const photoIds: string[] = [];
  for (const match of raw.matchAll(PHOTO_TAG)) {
    for (const id of (match[1] ?? "").split(",")) {
      const trimmed = id.trim();
      if (trimmed) photoIds.push(trimmed);
    }
  }
  let booking: BookingDraft | null = null;
  for (const match of raw.matchAll(BOOKING_TAG)) {
    const draft = readDraft(match[1] ?? "");
    if (draft) booking = draft;
  }
  const text = raw.replace(PHOTO_TAG, "").replace(BOOKING_TAG, "").replace(/\n{3,}/g, "\n\n").trim();
  return { text, photoIds, booking };
}

function readAnchor(value: unknown): AnchorDraft | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const anchor = {
    serviceName: asText(record.serviceName),
    staffName: asText(record.staffName),
    whenText: asText(record.whenText),
    missing: asText(record.missing),
  };
  if (!anchor.serviceName && !anchor.staffName && !anchor.whenText && !anchor.missing) return null;
  return anchor;
}

export function parseMemoryExtract(raw: string): ExtractedMemory | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    const facts: ExtractedFact[] = [];
    if (Array.isArray(record.facts)) {
      for (const item of record.facts) {
        if (typeof item !== "object" || item === null) continue;
        const fact = item as Record<string, unknown>;
        const kind = asText(fact.kind);
        const content = asText(fact.content);
        const confidence = typeof fact.confidence === "number" ? fact.confidence : 0;
        if (!FACT_KINDS.has(kind as FactKind) || content === "") continue;
        facts.push({ kind: kind as FactKind, content, confidence });
      }
    }
    const summary = asText(record.summary);
    return {
      facts,
      summary: summary === "" ? null : summary,
      anchor: readAnchor(record.anchor),
    };
  } catch {
    return null;
  }
}

export function anchorFromDraft(draft: BookingDraft): AnchorDraft {
  return {
    serviceName: draft.serviceName,
    staffName: draft.staffName,
    whenText: draft.whenText,
    missing: missingBookingFields(draft),
  };
}

export { emptyDraft };
