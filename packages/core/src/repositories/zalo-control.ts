import { eq } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { zaloControls } from "../db/schema";

export function readRelink(db: AppDatabase, vendorId: string): number {
  const row = db.select().from(zaloControls).where(eq(zaloControls.vendorId, vendorId)).get();
  return row?.relink ?? 0;
}

export function bumpRelink(db: AppDatabase, vendorId: string): number {
  const relink = readRelink(db, vendorId) + 1;
  db.insert(zaloControls)
    .values({ vendorId, relink })
    .onConflictDoUpdate({
      target: zaloControls.vendorId,
      set: { relink },
    })
    .run();
  return relink;
}
