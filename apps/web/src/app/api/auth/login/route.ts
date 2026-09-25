import { loginOperator } from "@zalo/core";
import { z } from "zod";
import { getEnv } from "@/config/env";
import { getDb } from "@/lib/db";
import { json } from "@/lib/http";

const loginSchema = z.object({
  password: z.string().min(1).max(200),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Dữ liệu không hợp lệ" }, 400);
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Dữ liệu không hợp lệ" }, 400);
  const env = getEnv();
  const session = await loginOperator(await getDb(), env.vendorId, parsed.data.password, env.appPassword);
  if (!session) return json({ error: "Sai mật khẩu" }, 401);
  return json(session);
}
