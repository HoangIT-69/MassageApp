import type { AppDatabase } from "../db/client";
import { getZaloLink, saveZaloLink } from "../repositories/zalo-link";
import type { ZaloLinkRecord } from "../types";

export function readZaloLink(db: AppDatabase, vendorId: string): ZaloLinkRecord {
  return getZaloLink(db, vendorId);
}

export function setAwaitingQr(db: AppDatabase, vendorId: string, qrImage: string): ZaloLinkRecord {
  return saveZaloLink(db, vendorId, "awaiting_qr", null, qrImage);
}

export function setZaloConnected(
  db: AppDatabase,
  vendorId: string,
  displayName: string,
): ZaloLinkRecord {
  return saveZaloLink(db, vendorId, "connected", displayName, null);
}

export function setZaloDisconnected(db: AppDatabase, vendorId: string): ZaloLinkRecord {
  return saveZaloLink(db, vendorId, "disconnected", null, null);
}

export function toQrDataUrl(image: string): string {
  const trimmed = image.trim();
  if (trimmed.startsWith("data:")) return trimmed;
  return `data:image/png;base64,${trimmed}`;
}
