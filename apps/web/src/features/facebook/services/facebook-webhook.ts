import {
  parseFacebookWebhook,
  replyToConversation,
  storeInboundMessage,
  verifyFacebookSignature,
} from "@zalo/core";
import { getAiClient } from "@/features/ai";
import { getEnv, type FacebookConfig } from "@/config/env";
import { getDb } from "@/lib/db";

export function facebookConfig(): FacebookConfig | null {
  return getEnv().facebook;
}

export function verifySubscription(
  config: FacebookConfig,
  params: URLSearchParams,
): string | null {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode !== "subscribe" || token !== config.verifyToken || !challenge) return null;
  return challenge;
}

export function signatureIsValid(
  config: FacebookConfig,
  rawBody: string,
  header: string | null,
): boolean {
  return verifyFacebookSignature(rawBody, header, config.appSecret);
}

// Lưu tin xong là trả 200 ngay; Facebook bỏ cuộc sau khoảng 20 giây còn AI có thể mất 30.
// Phần sinh reply chạy rời khỏi request, dedupe theo mid đã commit nên lần retry của
// Facebook không tạo tin trùng.
export async function receiveFacebookEvents(
  config: FacebookConfig,
  rawBody: string,
): Promise<void> {
  const events = parseFacebookWebhook(rawBody, config.pageId);
  if (events.length === 0) return;
  const db = await getDb();
  const { vendorId } = getEnv();
  const ai = getAiClient();
  for (const event of events) {
    const stored = await storeInboundMessage(db, vendorId, event);
    if (!stored.shouldReply || !stored.conversationId) continue;
    void replyToConversation(db, vendorId, stored.conversationId, ai, event.timestamp).catch(
      (error: unknown) => {
        console.error(error instanceof Error ? error.message : "facebook reply failed");
      },
    );
  }
}
