import { readChatSession } from "@/features/chat";
import { json, withOperator } from "@/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export function GET(request: Request, context: RouteContext): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    const { id } = await context.params;
    return json(await readChatSession(vendorId, id));
  });
}
