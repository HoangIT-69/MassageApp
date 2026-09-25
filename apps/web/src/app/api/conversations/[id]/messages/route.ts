import { z } from "zod";
import { MAX_MESSAGE_LENGTH } from "@zalo/core";
import { listChatMessages, sendChatMessage } from "@/features/chat";
import { json, withOperator } from "@/lib/http";

const sendSchema = z.object({
  content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

type RouteContext = { params: Promise<{ id: string }> };

function readAfter(request: Request): number | null {
  const raw = new URL(request.url).searchParams.get("after");
  if (raw === null || raw === "") return 0;
  const after = Number(raw);
  if (!Number.isFinite(after) || after < 0) return null;
  return after;
}

export function GET(request: Request, context: RouteContext): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    const after = readAfter(request);
    if (after === null) return json({ error: "Dữ liệu không hợp lệ" }, 400);
    const { id } = await context.params;
    return json({ messages: await listChatMessages(vendorId, id, after) });
  });
}

export function POST(request: Request, context: RouteContext): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Dữ liệu không hợp lệ" }, 400);
    }
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) return json({ error: "Dữ liệu không hợp lệ" }, 400);
    return json(await sendChatMessage(vendorId, id, parsed.data.content), 201);
  });
}
