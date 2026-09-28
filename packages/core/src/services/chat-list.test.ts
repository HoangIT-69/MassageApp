import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { LOCAL_VENDOR_ID } from "../constants";
import { messages } from "../db/schema";
import { openTestDatabase } from "../db/test-support";
import { listVendorConversations, listVendorMessages } from "../services/conversations";
import { ingestInbound } from "../services/inbound";
import { peerFromChangedProfiles, peerLabel, shouldRefreshPeer } from "../services/peer";
import { clearConversationContext, removeConversation } from "../services/session-context";
import { listBookings, saveDraftBooking } from "../repositories/bookings";
import { attachmentPayload, loadPhotoBytes } from "../services/uploads";
import { ensureShopSeed } from "../services/seed";
import { insertFact, listFactsForConversation } from "../repositories/memory";
import { setShopAiAll } from "../repositories/catalog";
import type { AiClient, InboundInput } from "../types";
import type { ObjectStore } from "../services/object-store";

const OTHER_VENDOR = "other-vendor";

function inbound(overrides: Partial<InboundInput> = {}): InboundInput {
  return {
    threadId: "thread-1",
    threadType: "user",
    title: "Lan",
    avatarUrl: null,
    channel: "zalo",
    overwriteTitle: true,
    content: "xin chao",
    isText: true,
    isSelf: false,
    externalMsgId: "m-1",
    timestamp: 1_700_000_000_000,
    ...overrides,
  };
}

const silentAi: AiClient = { async complete() { return ""; } };

describe("chat list, photos, and session context", () => {
  const opened: Array<{ cleanup: () => Promise<void> }> = [];

  afterEach(async () => {
    for (const item of opened) await item.cleanup();
    opened.length = 0;
  });

  async function open() {
    const handle = await openTestDatabase();
    opened.push(handle);
    return handle.db;
  }

  it("does not replace the customer title when the inbound message is from self", async () => {
    const db = await open();
    await ingestInbound(db, LOCAL_VENDOR_ID, inbound(), silentAi);
    await ingestInbound(
      db,
      LOCAL_VENDOR_ID,
      inbound({
        title: "Chu tai khoan",
        overwriteTitle: false,
        isSelf: true,
        content: "da nhan",
        externalMsgId: "m-2",
      }),
      silentAi,
    );
    const rows = await listVendorConversations(db, LOCAL_VENDOR_ID);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Lan");
  });

  it("maps getUserInfo changed profiles to the other person's name and avatar", () => {
    const profile = peerFromChangedProfiles(
      {
        "peer-1": { displayName: "Mai", avatar: "https://cdn.example/mai.jpg", userId: "peer-1" },
      },
      "peer-1",
    );
    expect(peerLabel(profile ?? {})).toEqual({
      title: "Mai",
      avatarUrl: "https://cdn.example/mai.jpg",
    });
    expect(shouldRefreshPeer("user", { title: "Chu tai khoan", avatarUrl: null }, "Chu tai khoan")).toBe(true);
    expect(shouldRefreshPeer("user", { title: "Mai", avatarUrl: "https://cdn.example/mai.jpg" }, "Chu tai khoan")).toBe(
      false,
    );
    expect(shouldRefreshPeer("group", null, "Chu tai khoan")).toBe(false);
  });

  it("enables AI on a new conversation when the shop flag is on", async () => {
    const db = await open();
    await ensureShopSeed(db, LOCAL_VENDOR_ID);
    await setShopAiAll(db, LOCAL_VENDOR_ID, true);
    await ingestInbound(db, LOCAL_VENDOR_ID, inbound(), silentAi);
    const rows = await listVendorConversations(db, LOCAL_VENDOR_ID);
    expect(Boolean(rows[0]?.aiEnabled)).toBe(true);
  });

  it("clears messages and facts for one session without touching another vendor", async () => {
    const db = await open();
    await ingestInbound(db, LOCAL_VENDOR_ID, inbound(), silentAi);
    await ingestInbound(db, OTHER_VENDOR, inbound({ threadId: "thread-2", externalMsgId: "m-other" }), silentAi);
    const local = (await listVendorConversations(db, LOCAL_VENDOR_ID))[0];
    const other = (await listVendorConversations(db, OTHER_VENDOR))[0];
    if (!local || !other) throw new Error("missing conversation");
    await insertFact(db, LOCAL_VENDOR_ID, local.id, { kind: "name", content: "Lan", confidence: 80 });
    await insertFact(db, OTHER_VENDOR, other.id, { kind: "name", content: "Hoa", confidence: 80 });
    await clearConversationContext(db, LOCAL_VENDOR_ID, local.id);
    expect(await listVendorMessages(db, LOCAL_VENDOR_ID, local.id, 0)).toHaveLength(0);
    expect(await listFactsForConversation(db, LOCAL_VENDOR_ID, local.id)).toHaveLength(0);
    expect(await listVendorMessages(db, OTHER_VENDOR, other.id, 0)).toHaveLength(1);
    expect(await listFactsForConversation(db, OTHER_VENDOR, other.id)).toHaveLength(1);
    const kept = await listVendorConversations(db, LOCAL_VENDOR_ID);
    expect(kept[0]?.id).toBe(local.id);
    expect(kept[0]?.lastMessage).toBeNull();
  });

  it("removes one conversation and its messages without touching another vendor or saved bookings", async () => {
    const db = await open();
    await ingestInbound(db, LOCAL_VENDOR_ID, inbound(), silentAi);
    await ingestInbound(db, OTHER_VENDOR, inbound({ threadId: "thread-2", externalMsgId: "m-other" }), silentAi);
    const local = (await listVendorConversations(db, LOCAL_VENDOR_ID))[0];
    const other = (await listVendorConversations(db, OTHER_VENDOR))[0];
    if (!local || !other) throw new Error("missing conversation");
    await saveDraftBooking(db, LOCAL_VENDOR_ID, local.id, {
      serviceName: "Body",
      staffId: null,
      staffName: "",
      whenText: "toi nay",
      customerName: "Lan",
      phone: "",
    });
    await removeConversation(db, LOCAL_VENDOR_ID, local.id);
    expect(await listVendorConversations(db, LOCAL_VENDOR_ID)).toHaveLength(0);
    const leftover = await db
      .select()
      .from(messages)
      .where(and(eq(messages.vendorId, LOCAL_VENDOR_ID), eq(messages.conversationId, local.id)));
    expect(leftover).toHaveLength(0);
    expect(await listVendorConversations(db, OTHER_VENDOR)).toHaveLength(1);
    expect(await listBookings(db, LOCAL_VENDOR_ID)).toHaveLength(1);
  });

  it("builds a Zalo attachment from stored bytes without a filesystem path", async () => {
    const body = Buffer.from("jpeg-bytes");
    const store: ObjectStore = {
      async get(key) {
        return key === "staff/local/lan.jpg" ? { body, contentType: "image/jpeg" } : null;
      },
      async put() {
        throw new Error("put should not run when the object exists");
      },
    };
    const bytes = await loadPhotoBytes(store, path.join(tmpdir(), "missing-uploads"), "staff/local/lan.jpg");
    const payload = attachmentPayload("staff/local/lan.jpg", bytes);
    expect(payload.data).toEqual(body);
    expect(payload.filename).toBe("lan.jpg");
    expect(payload.metadata.totalSize).toBe(body.length);
  });

  it("uploads a local photo once when the object store does not have it", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "zalo-photo-"));
    const key = "staff/local/lan.jpg";
    const absolute = path.join(dir, "uploads", "staff", "local", "lan.jpg");
    await writeFileNested(absolute, Buffer.from("from-disk"));
    const saved: Buffer[] = [];
    const store: ObjectStore = {
      async get() {
        return null;
      },
      async put(_key, body) {
        saved.push(body);
      },
    };
    const bytes = await loadPhotoBytes(store, dir, key);
    expect(bytes.toString()).toBe("from-disk");
    expect(saved[0]?.toString()).toBe("from-disk");
  });
});

async function writeFileNested(file: string, body: Buffer): Promise<void> {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}
