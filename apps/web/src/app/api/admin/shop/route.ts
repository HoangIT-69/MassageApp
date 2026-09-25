import {
  WEEKDAY_KEYS,
  type ShopProfileInput,
} from "@zalo/core";
import { z } from "zod";
import { readShop, writeShop } from "@/features/admin/server";
import { json, withOperator } from "@/lib/http";

const hoursSchema = z.object({
  mon: z.string().max(40),
  tue: z.string().max(40),
  wed: z.string().max(40),
  thu: z.string().max(40),
  fri: z.string().max(40),
  sat: z.string().max(40),
  sun: z.string().max(40),
});

const shopSchema = z.object({
  name: z.string().min(1).max(120),
  tagline: z.string().max(255),
  address: z.string().max(255),
  directions: z.string().max(4000),
  hotline: z.string().max(32),
  hours: hoursSchema,
  intro: z.string().max(4000),
  amenities: z.string().max(4000),
  policyBooking: z.string().max(4000),
  policyCancel: z.string().max(4000),
  policyLate: z.string().max(4000),
  policyNewGuest: z.string().max(4000),
  voice: z.string().max(4000),
  forbidden: z.string().max(4000),
});

export function GET(request: Request): Promise<Response> {
  return withOperator(request, async (vendorId) => json(await readShop(vendorId)));
}

export function PUT(request: Request): Promise<Response> {
  return withOperator(request, async (vendorId) => {
    const parsed = shopSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Dữ liệu không hợp lệ" }, 400);
    const hours = Object.fromEntries(WEEKDAY_KEYS.map((key) => [key, parsed.data.hours[key]])) as ShopProfileInput["hours"];
    return json(await writeShop(vendorId, { ...parsed.data, hours }));
  });
}
