import { z } from "zod";
import { setAllAi } from "@/features/chat";
import { json, withOperator } from "@/lib/http";

const aiAllSchema = z.object({ enabled: z.boolean() });

export function PATCH(request: Request): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Dữ liệu không hợp lệ" }, 400);
    }
    const parsed = aiAllSchema.safeParse(body);
    if (!parsed.success) return json({ error: "Dữ liệu không hợp lệ" }, 400);
    return json({ aiAll: await setAllAi(vendorId, parsed.data.enabled) });
  });
}
