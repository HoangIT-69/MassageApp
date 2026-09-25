import { eq } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { zaloControls } from "../db/schema";

export async function readRelink(db: AppDatabase, vendorId: string): Promise<number> {
  const rows = await db.select().from(zaloControls).where(eq(zaloControls.vendorId, vendorId)).limit(1);
  return rows[0]?.relink ?? 0;
}

export async function bumpRelink(db: AppDatabase, vendorId: string): Promise<number> {
  const relink = (await readRelink(db, vendorId)) + 1;
  await db
    .insert(zaloControls)
    .values({ vendorId, relink })
    .onDuplicateKeyUpdate({ set: { relink } });
  return relink;
}
