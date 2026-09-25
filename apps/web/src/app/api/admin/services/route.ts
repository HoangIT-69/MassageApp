import { z } from "zod";
import { addService } from "@/features/admin/server";
import { json, withOperator } from "@/lib/http";

const serviceSchema = z.object({
  name: z.string().min(1).max(120),
  durationMinutes: z.number().int().min(1).max(600),
  priceVnd: z.number().int().min(0).max(50_000_000),
  description: z.string().max(500),
  sortOrder: z.number().int().min(0).max(1000),
  active: z.boolean(),
});

export function POST(request: Request): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    const parsed = serviceSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Dữ liệu không hợp lệ" }, 400);
    return json(await addService(vendorId, parsed.data), 201);
  });
}
