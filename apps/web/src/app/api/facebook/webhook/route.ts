import {
  facebookConfig,
  receiveFacebookEvents,
  signatureIsValid,
  verifySubscription,
} from "@/features/facebook";

// Route công khai có chủ đích: Facebook không gửi được bearer token của operator.
// Chốt bảo vệ là verify token ở GET và HMAC chữ ký ở POST.
export function GET(request: Request): Response {
  const config = facebookConfig();
  if (!config) return new Response("Chưa cấu hình Facebook", { status: 503 });
  const challenge = verifySubscription(config, new URL(request.url).searchParams);
  if (!challenge) return new Response("Forbidden", { status: 403 });
  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const config = facebookConfig();
  if (!config) return new Response("Chưa cấu hình Facebook", { status: 503 });
  const rawBody = await request.text();
  if (!signatureIsValid(config, rawBody, request.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  try {
    await receiveFacebookEvents(config, rawBody);
  } catch (error) {
    // Trả lỗi để Facebook gửi lại: dedupe theo mid đã chặn trùng, im lặng thì mất tin.
    console.error(error instanceof Error ? error.message : "facebook webhook failed");
    return new Response("Lỗi máy chủ", { status: 500 });
  }
  return new Response("EVENT_RECEIVED", { status: 200 });
}
