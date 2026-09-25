import { zaloQr } from "@/features/chat";
import { json, withOperator } from "@/lib/http";

export function GET(request: Request): Promise<Response> {
  return withOperator(request, (vendorId) => {
    const qr = zaloQr(vendorId);
    if (!qr) return json({ error: "Chưa có mã QR" }, 404);
    return json(qr);
  });
}
