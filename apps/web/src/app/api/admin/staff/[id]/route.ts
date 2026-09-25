import { changeStaff } from "@/features/admin/server";
import { staffSchema } from "@/features/admin/staff-schema";
import { json, withOperator } from "@/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export function PUT(request: Request, context: RouteContext): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    const { id } = await context.params;
    const parsed = staffSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Dữ liệu không hợp lệ" }, 400);
    return json(await changeStaff(vendorId, id, parsed.data));
  });
}
