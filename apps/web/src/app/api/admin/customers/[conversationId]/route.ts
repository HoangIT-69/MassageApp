import { z } from "zod";
import { writeCustomer } from "@/features/admin/server";
import { json, withOperator } from "@/lib/http";

const customerSchema = z.object({
  displayName: z.string().max(120),
  phone: z.string().max(32),
  notes: z.string().max(4000).optional(),
});

type RouteContext = { params: Promise<{ conversationId: string }> };

export function PUT(request: Request, context: RouteContext): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    const { conversationId } = await context.params;
    const parsed = customerSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Dữ liệu không hợp lệ" }, 400);
    return json(await writeCustomer(vendorId, conversationId, parsed.data));
  });
}
