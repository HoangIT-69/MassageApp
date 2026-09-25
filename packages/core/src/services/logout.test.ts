import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LOCAL_VENDOR_ID } from "../constants";
import { closeDatabase, openDatabase, type AppDatabase } from "../db/client";
import { readRelink } from "../repositories/zalo-control";
import { readCredentials, writeCredentials } from "./credentials";
import { ingestInbound } from "./inbound";
import { listVendorConversations } from "./conversations";
import { requestZaloLogout } from "./logout";
import { readZaloLink, setZaloConnected } from "./zalo-link";
import type { AiClient, InboundInput } from "../types";

const OTHER_VENDOR = "other-vendor";

function tempDatabase(): { db: AppDatabase; cleanup: () => void } {
  const dir = mkdtempSync(path.join(tmpdir(), "zalo-logout-"));
  const db = openDatabase(path.join(dir, "app.sqlite"));
  return {
    db,
    cleanup: () => {
      closeDatabase(db);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

function inbound(vendorThread: string): InboundInput {
  return {
    threadId: vendorThread,
    threadType: "user",
    title: "An",
    avatarUrl: null,
    overwriteTitle: true,
    content: "xin chao",
    isText: true,
    isSelf: false,
    zaloMsgId: vendorThread,
    timestamp: 1_700_000_000_000,
  };
}

const silentAi: AiClient = {
  async complete() {
    return "";
  },
};

describe("zalo logout", () => {
  const opened: Array<{ cleanup: () => void }> = [];

  afterEach(() => {
    for (const handle of opened) handle.cleanup();
    opened.length = 0;
  });

  it("drops only the current vendor session and asks for a new QR", async () => {
    const handle = tempDatabase();
    opened.push(handle);
    const dir = mkdtempSync(path.join(tmpdir(), "zalo-creds-"));
    const credentialsPath = path.join(dir, "zalo-credentials.json");
    writeCredentials(credentialsPath, { imei: "imei-1", userAgent: "agent", cookie: [] });
    setZaloConnected(handle.db, LOCAL_VENDOR_ID, "Tai khoan");
    await ingestInbound(handle.db, LOCAL_VENDOR_ID, inbound("local-thread"), silentAi);
    await ingestInbound(handle.db, OTHER_VENDOR, inbound("other-thread"), silentAi);

    requestZaloLogout(handle.db, LOCAL_VENDOR_ID, credentialsPath);

    expect(readCredentials(credentialsPath)).toBeNull();
    expect(readZaloLink(handle.db, LOCAL_VENDOR_ID).status).toBe("disconnected");
    expect(readZaloLink(handle.db, LOCAL_VENDOR_ID).displayName).toBeNull();
    expect(listVendorConversations(handle.db, LOCAL_VENDOR_ID)).toHaveLength(0);
    expect(listVendorConversations(handle.db, OTHER_VENDOR)).toHaveLength(1);
    expect(readRelink(handle.db, LOCAL_VENDOR_ID)).toBe(1);
    expect(readRelink(handle.db, OTHER_VENDOR)).toBe(0);

    requestZaloLogout(handle.db, LOCAL_VENDOR_ID, credentialsPath);
    expect(readRelink(handle.db, LOCAL_VENDOR_ID)).toBe(2);
    rmSync(dir, { recursive: true, force: true });
  });
});
