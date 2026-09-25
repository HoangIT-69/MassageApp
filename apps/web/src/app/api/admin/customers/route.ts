import { readCustomers } from "@/features/admin/server";
import { json, withOperator } from "@/lib/http";

export function GET(request: Request): Promise<Response> {
  return withOperator(request, async (vendorId) => json({ customers: await readCustomers(vendorId) }));
}
