import { eq } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { zaloLinks } from "../db/schema";
import type { ZaloLinkRecord, ZaloLinkStatus } from "../types";

const DISCONNECTED: ZaloLinkStatus = "disconnected";

export async function getZaloLink(db: AppDatabase, vendorId: string): Promise<ZaloLinkRecord> {
  const rows = await db.select().from(zaloLinks).where(eq(zaloLinks.vendorId, vendorId)).limit(1);
  if (rows[0]) return rows[0];
  return {
    vendorId,
    status: DISCONNECTED,
    displayName: null,
    qrImage: null,
    updatedAt: 0,
  };
}

export async function saveZaloLink(
  db: AppDatabase,
  vendorId: string,
  status: ZaloLinkStatus,
  displayName: string | null,
  qrImage: string | null,
): Promise<ZaloLinkRecord> {
  const updatedAt = Date.now();
  await db
    .insert(zaloLinks)
    .values({ vendorId, status, displayName, qrImage, updatedAt })
    .onDuplicateKeyUpdate({ set: { status, displayName, qrImage, updatedAt } });
  return { vendorId, status, displayName, qrImage, updatedAt };
}
