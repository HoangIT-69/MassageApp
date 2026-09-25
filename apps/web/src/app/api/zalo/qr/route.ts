import { zaloQr } from "@/features/chat";
import { json, withOperator } from "@/lib/http";

export function GET(request: Request): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    const qr = await zaloQr(vendorId);
    if (!qr) return json({ error: "Chưa có mã QR" }, 404);
    return json(qr);
  });
}
