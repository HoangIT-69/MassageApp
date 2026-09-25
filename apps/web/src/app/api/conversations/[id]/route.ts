import { z } from "zod";
import { setChatAi } from "@/features/chat";
import { json, withOperator } from "@/lib/http";

const aiSchema = z.object({ aiEnabled: z.boolean() });

type RouteContext = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Dữ liệu không hợp lệ" }, 400);
    }
    const parsed = aiSchema.safeParse(body);
    if (!parsed.success) return json({ error: "Dữ liệu không hợp lệ" }, 400);
    return json(setChatAi(vendorId, id, parsed.data.aiEnabled));
  });
}
