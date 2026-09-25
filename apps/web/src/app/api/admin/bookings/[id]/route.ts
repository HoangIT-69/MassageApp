import { z } from "zod";
import { acceptBooking, declineBooking, moveBooking, reviseBooking } from "@/features/admin/server";
import { json, withOperator } from "@/lib/http";

const patchSchema = z.object({
  whenText: z.string().min(1).max(120).optional(),
  staffId: z.string().min(1).max(64).nullable().optional(),
  action: z.enum(["confirm", "reject", "complete", "cancel"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    const { id } = await context.params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Dữ liệu không hợp lệ" }, 400);
    if (parsed.data.action === "confirm") return json(await acceptBooking(vendorId, id));
    if (parsed.data.action === "reject") return json(await declineBooking(vendorId, id));
    if (parsed.data.action === "complete") return json(await moveBooking(vendorId, id, "hoan_thanh"));
    if (parsed.data.action === "cancel") return json(await moveBooking(vendorId, id, "huy"));
    return json(await reviseBooking(vendorId, id, { whenText: parsed.data.whenText, staffId: parsed.data.staffId }));
  });
}
