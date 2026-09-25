import { addStaff, readStaff } from "@/features/admin/server";
import { staffSchema } from "@/features/admin/staff-schema";
import { json, withOperator } from "@/lib/http";

export function GET(request: Request): Promise<Response> {
  return withOperator(request, async (vendorId) => json({ staff: await readStaff(vendorId) }));
}

export function POST(request: Request): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    const parsed = staffSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Dữ liệu không hợp lệ" }, 400);
    return json(await addStaff(vendorId, parsed.data), 201);
  });
}
