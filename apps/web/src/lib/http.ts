import { AppError, findVendorByToken } from "@zalo/core";
import { getDb } from "@/lib/db";

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export function readBearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function withOperator(
  request: Request,
  action: (vendorId: string) => Promise<Response> | Response,
): Promise<Response> {
  const token = readBearer(request);
  if (!token) return json({ error: "Chưa đăng nhập" }, 401);
  const vendorId = findVendorByToken(getDb(), token);
  if (!vendorId) return json({ error: "Chưa đăng nhập" }, 401);
  try {
    return await action(vendorId);
  } catch (error) {
    if (error instanceof AppError) return json({ error: error.message }, error.status);
    console.error(error instanceof Error ? error.name : "request failed");
    return json({ error: "Lỗi máy chủ" }, 500);
  }
}
