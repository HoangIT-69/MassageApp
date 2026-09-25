import { zaloStatus } from "@/features/chat";
import { json, withOperator } from "@/lib/http";

export function GET(request: Request): Promise<Response> {
  return withOperator(request, (vendorId) => json(zaloStatus(vendorId)));
}
