import { z } from "zod";

const shiftSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const staffSchema = z.object({
  name: z.string().min(1).max(120),
  gender: z.enum(["nam", "nu", "khac"]),
  specialties: z.string().max(255),
  yearsExperience: z.number().int().min(0).max(60),
  bio: z.string().max(500),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
  shifts: z.array(shiftSchema).max(14),
});
