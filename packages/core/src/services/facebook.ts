import { createHmac, timingSafeEqual } from "node:crypto";
import {
  FACEBOOK_GRAPH_URL,
  FACEBOOK_GUEST_NAME_PREFIX,
  FACEBOOK_PSID_TAIL,
  FACEBOOK_SEND_TIMEOUT_MS,
} from "../constants";
import type { InboundInput } from "../types";

const SIGNATURE_PREFIX = "sha256=";

type MessengerMessage = {
  mid?: unknown;
  text?: unknown;
  is_echo?: unknown;
};

type MessengerEvent = {
  sender?: { id?: unknown };
  timestamp?: unknown;
  message?: MessengerMessage;
};

type MessengerEntry = {
  id?: unknown;
  messaging?: unknown;
};

type MessengerWebhook = {
  object?: unknown;
  entry?: unknown;
};

export function verifyFacebookSignature(
  rawBody: string,
  header: string | null,
  appSecret: string,
): boolean {
  if (!header || appSecret === "") return false;
  const provided = header.startsWith(SIGNATURE_PREFIX)
    ? header.slice(SIGNATURE_PREFIX.length)
    : header;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));
}

function guestTitle(psid: string): string {
  return `${FACEBOOK_GUEST_NAME_PREFIX}${psid.slice(-FACEBOOK_PSID_TAIL)}`;
}

function toInbound(event: MessengerEvent): InboundInput | null {
  const message = event.message;
  if (!message || message.is_echo === true) return null;
  const psid = typeof event.sender?.id === "string" ? event.sender.id : "";
  const text = typeof message.text === "string" ? message.text : "";
  if (psid === "" || text.trim() === "") return null;
  const timestamp = Number(event.timestamp);
  return {
    channel: "facebook",
    threadId: psid,
    threadType: "user",
    title: guestTitle(psid),
    avatarUrl: null,
    overwriteTitle: false,
    content: text,
    isText: true,
    isSelf: false,
    externalMsgId: typeof message.mid === "string" ? message.mid : null,
    timestamp: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now(),
  };
}

// Bỏ qua mọi thứ ngoài tin nhắn văn bản của khách: echo là tin do chính page gửi,
// còn postback/delivery/read chưa nằm trong phạm vi kênh này.
export function parseFacebookWebhook(rawBody: string, pageId: string): InboundInput[] {
  let payload: MessengerWebhook;
  try {
    payload = JSON.parse(rawBody) as MessengerWebhook;
  } catch {
    return [];
  }
  if (!Array.isArray(payload.entry)) return [];
  const inbound: InboundInput[] = [];
  for (const raw of payload.entry) {
    const entry = raw as MessengerEntry;
    if (entry.id !== pageId) continue;
    if (!Array.isArray(entry.messaging)) continue;
    for (const event of entry.messaging) {
      const mapped = toInbound(event as MessengerEvent);
      if (mapped) inbound.push(mapped);
    }
  }
  return inbound;
}

export async function sendFacebookText(options: {
  pageAccessToken: string;
  psid: string;
  text: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? FACEBOOK_SEND_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${FACEBOOK_GRAPH_URL}/me/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Header thay vì ?access_token= để token không lọt vào log hay thông báo lỗi chứa URL.
        Authorization: `Bearer ${options.pageAccessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: options.psid },
        message: { text: options.text },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Facebook HTTP ${response.status}`);
  } finally {
    clearTimeout(timer);
  }
}
