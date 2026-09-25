import { clearChatContext } from "@/features/chat";
import { AppError } from "@zalo/core";
import { json, withOperator } from "@/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    const { id } = await context.params;
    try {
      await clearChatContext(vendorId, id);
      return json({ ok: true });
    } catch (error) {
      if (error instanceof AppError) return json({ error: error.message }, error.status);
      throw error;
    }
  });
}
