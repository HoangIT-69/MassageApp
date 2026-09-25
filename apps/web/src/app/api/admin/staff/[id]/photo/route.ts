import { readStaffPhoto, storeStaffPhoto } from "@/features/admin/server";
import { json, withOperator } from "@/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export function GET(request: Request, context: RouteContext): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    const { id } = await context.params;
    const photo = await readStaffPhoto(vendorId, id);
    if (!photo) return json({ error: "Chưa có ảnh" }, 404);
    return new Response(new Uint8Array(photo.bytes), { headers: { "Content-Type": photo.type } });
  });
}

export function POST(request: Request, context: RouteContext): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    const { id } = await context.params;
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return json({ error: "Thiếu ảnh" }, 400);
    return json(await storeStaffPhoto(vendorId, id, file));
  });
}
