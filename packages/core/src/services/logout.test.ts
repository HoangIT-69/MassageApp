import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LOCAL_VENDOR_ID } from "../constants";
import { openTestDatabase } from "../db/test-support";
import { readRelink } from "../repositories/zalo-control";
import { readCredentials, writeCredentials } from "./credentials";
import { ingestInbound } from "./inbound";
import { listVendorConversations } from "./conversations";
import { requestZaloLogout } from "./logout";
import { readZaloLink, setZaloConnected } from "./zalo-link";
import type { AiClient, InboundInput } from "../types";

const OTHER_VENDOR = "other-vendor";

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
  const opened: Array<{ cleanup: () => Promise<void> }> = [];

  afterEach(async () => {
    for (const handle of opened) await handle.cleanup();
    opened.length = 0;
  });

  it("drops only the current vendor session and asks for a new QR", async () => {
    const handle = await openTestDatabase();
    opened.push(handle);
    const dir = mkdtempSync(path.join(tmpdir(), "zalo-creds-"));
    const credentialsPath = path.join(dir, "zalo-credentials.json");
    writeCredentials(credentialsPath, { imei: "imei-1", userAgent: "agent", cookie: [] });
    await setZaloConnected(handle.db, LOCAL_VENDOR_ID, "Tai khoan");
    await ingestInbound(handle.db, LOCAL_VENDOR_ID, inbound("local-thread"), silentAi);
    await ingestInbound(handle.db, OTHER_VENDOR, inbound("other-thread"), silentAi);

    await requestZaloLogout(handle.db, LOCAL_VENDOR_ID, credentialsPath);

    expect(readCredentials(credentialsPath)).toBeNull();
    expect((await readZaloLink(handle.db, LOCAL_VENDOR_ID)).status).toBe("disconnected");
    expect((await readZaloLink(handle.db, LOCAL_VENDOR_ID)).displayName).toBeNull();
    expect(await listVendorConversations(handle.db, LOCAL_VENDOR_ID)).toHaveLength(0);
    expect(await listVendorConversations(handle.db, OTHER_VENDOR)).toHaveLength(1);
    expect(await readRelink(handle.db, LOCAL_VENDOR_ID)).toBe(1);
    expect(await readRelink(handle.db, OTHER_VENDOR)).toBe(0);

    await requestZaloLogout(handle.db, LOCAL_VENDOR_ID, credentialsPath);
    expect(await readRelink(handle.db, LOCAL_VENDOR_ID)).toBe(2);
    rmSync(dir, { recursive: true, force: true });
  });
});
