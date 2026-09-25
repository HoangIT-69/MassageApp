import { eq } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { zaloLinks } from "../db/schema";
import type { ZaloLinkRecord, ZaloLinkStatus } from "../types";

const DISCONNECTED: ZaloLinkStatus = "disconnected";

export function getZaloLink(db: AppDatabase, vendorId: string): ZaloLinkRecord {
  const row = db.select().from(zaloLinks).where(eq(zaloLinks.vendorId, vendorId)).get();
  if (row) return row;
  return {
    vendorId,
    status: DISCONNECTED,
    displayName: null,
    qrImage: null,
    updatedAt: 0,
  };
}

export function saveZaloLink(
  db: AppDatabase,
  vendorId: string,
  status: ZaloLinkStatus,
  displayName: string | null,
  qrImage: string | null,
): ZaloLinkRecord {
  const updatedAt = Date.now();
  db.insert(zaloLinks)
    .values({ vendorId, status, displayName, qrImage, updatedAt })
    .onConflictDoUpdate({
      target: zaloLinks.vendorId,
      set: { status, displayName, qrImage, updatedAt },
    })
    .run();
  return { vendorId, status, displayName, qrImage, updatedAt };
}
