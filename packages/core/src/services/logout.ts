import type { AppDatabase } from "../db/client";
import { deleteVendorChats } from "../repositories/conversations";
import { bumpRelink } from "../repositories/zalo-control";
import { clearCredentials } from "./credentials";
import { setZaloDisconnected } from "./zalo-link";

export function requestZaloLogout(db: AppDatabase, vendorId: string, credentialsPath: string): void {
  clearCredentials(credentialsPath);
  deleteVendorChats(db, vendorId);
  setZaloDisconnected(db, vendorId);
  bumpRelink(db, vendorId);
}
