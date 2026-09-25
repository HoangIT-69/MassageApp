import { logoutZalo } from "@/features/chat";
import { json, withOperator } from "@/lib/http";

export function POST(request: Request): Promise<Response> {
  return withOperator(request, (vendorId) => json(logoutZalo(vendorId)));
}
