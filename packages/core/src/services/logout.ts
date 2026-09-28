import type { AppDatabase } from "../db/client";
import { deleteVendorChats } from "../repositories/conversations";
import { bumpRelink } from "../repositories/zalo-control";
import { clearCredentials } from "./credentials";
import { setZaloDisconnected } from "./zalo-link";

export async function requestZaloLogout(
  db: AppDatabase,
  vendorId: string,
  credentialsPath: string,
): Promise<void> {
  clearCredentials(credentialsPath);
  await deleteVendorChats(db, vendorId, "zalo");
  await setZaloDisconnected(db, vendorId);
  await bumpRelink(db, vendorId);
}
