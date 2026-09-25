import { afterEach, describe, expect, it } from "vitest";
import { AI_FAILURE_TEXT, ATTACHMENT_PLACEHOLDER, LOCAL_VENDOR_ID } from "../constants";
import type { AppDatabase } from "../db/client";
import { openTestDatabase } from "../db/test-support";
import { AppError } from "../errors";
import { createDeepInfraClient } from "../services/deepinfra";
import { ingestInbound } from "../services/inbound";
import { loginOperator } from "../services/auth";
import {
  enqueueOperatorMessage,
  listVendorConversations,
  listVendorMessages,
  setConversationAi,
} from "../services/conversations";
import { takeOutbox } from "../services/outbox";
import { findVendorByToken } from "../repositories/sessions";
import type { AiClient, ChatTurn, InboundInput } from "../types";

const OTHER_VENDOR = "other-vendor";

function tempDatabase(): Promise<{ db: AppDatabase; cleanup: () => Promise<void> }> {
  return openTestDatabase();
}

function inbound(overrides: Partial<InboundInput> = {}): InboundInput {
  return {
    threadId: "thread-1",
    threadType: "user",
    title: "An",
    avatarUrl: null,
    overwriteTitle: true,
    content: "xin chao",
    isText: true,
    isSelf: false,
    zaloMsgId: "m-1",
    timestamp: 1_700_000_000_000,
    ...overrides,
  };
}

function scriptedAi(reply = "chao ban"): { client: AiClient; prompts: ChatTurn[][] } {
  const prompts: ChatTurn[][] = [];
  return {
    prompts,
    client: {
      async complete(messages: ChatTurn[]) {
        prompts.push(messages);
        return reply;
      },
    },
  };
}

describe("inbound and ai toggle", () => {
  const opened: Array<{ cleanup: () => Promise<void> }> = [];

  afterEach(async () => {
    for (const item of opened) await item.cleanup();
    opened.length = 0;
  });

  async function open() {
    const handle = await tempDatabase();
    opened.push(handle);
    return handle.db;
  }

  it("stores nothing and skips the model when text is empty", async () => {
    const db = await open();
    const ai = scriptedAi();
    const result = await ingestInbound(db, LOCAL_VENDOR_ID, inbound({ content: "   " }), ai.client);
    expect(result).toEqual({ created: false, aiQueued: false });
    expect(ai.prompts).toHaveLength(0);
    expect(await listVendorConversations(db, LOCAL_VENDOR_ID)).toHaveLength(0);
  });

  it("stores an attachment placeholder and does not call the model", async () => {
    const db = await open();
    const ai = scriptedAi();
    const result = await ingestInbound(
      db,
      LOCAL_VENDOR_ID,
      inbound({ isText: false, content: "", zaloMsgId: "file-1" }),
      ai.client,
    );
    expect(result.aiQueued).toBe(false);
    expect(ai.prompts).toHaveLength(0);
    const [conversation] = await listVendorConversations(db, LOCAL_VENDOR_ID);
    const rows = await listVendorMessages(db, LOCAL_VENDOR_ID, conversation.id, 0);
    expect(rows[0]?.content).toBe(ATTACHMENT_PLACEHOLDER);
    expect(rows[0]?.status).toBe("received");
  });

  it("ignores a duplicate zalo message id", async () => {
    const db = await open();
    const ai = scriptedAi();
    await ingestInbound(db, LOCAL_VENDOR_ID, inbound(), ai.client);
    const second = await ingestInbound(db, LOCAL_VENDOR_ID, inbound(), ai.client);
    expect(second.created).toBe(false);
    const [conversation] = await listVendorConversations(db, LOCAL_VENDOR_ID);
    expect(await listVendorMessages(db, LOCAL_VENDOR_ID, conversation.id, 0)).toHaveLength(1);
  });

  it("does not queue a reply when ai is off", async () => {
    const db = await open();
    const ai = scriptedAi();
    const result = await ingestInbound(db, LOCAL_VENDOR_ID, inbound(), ai.client);
    expect(result.aiQueued).toBe(false);
    expect(ai.prompts).toHaveLength(0);
    expect(await takeOutbox(db, LOCAL_VENDOR_ID)).toHaveLength(0);
  });

  it("queues one model reply when ai is on", async () => {
    const db = await open();
    const ai = scriptedAi("mình đây");
    await ingestInbound(db, LOCAL_VENDOR_ID, inbound({ zaloMsgId: "seed" }), ai.client);
    const [conversation] = await listVendorConversations(db, LOCAL_VENDOR_ID);
    await setConversationAi(db, LOCAL_VENDOR_ID, conversation.id, true);
    const result = await ingestInbound(
      db,
      LOCAL_VENDOR_ID,
      inbound({ content: "bạn khỏe không", zaloMsgId: "m-2", timestamp: 1_700_000_000_100 }),
      ai.client,
    );
    expect(result.aiQueued).toBe(true);
    expect(ai.prompts[0]?.[0]?.role).toBe("system");
    expect(ai.prompts[0]?.[0]?.role).toBe("system");
    expect(ai.prompts[0]?.some((turn) => turn.content === "bạn khỏe không")).toBe(true);
    const queued = await takeOutbox(db, LOCAL_VENDOR_ID);
    expect(queued).toHaveLength(1);
    expect(queued[0]?.source).toBe("ai");
    expect(queued[0]?.content).toBe("mình đây");
  });

  it("keeps the inbound message and marks the reply failed when the model throws", async () => {
    const db = await open();
    const ai: AiClient = {
      async complete() {
        throw new Error("network down");
      },
    };
    await ingestInbound(db, LOCAL_VENDOR_ID, inbound({ zaloMsgId: "seed" }), ai);
    const [conversation] = await listVendorConversations(db, LOCAL_VENDOR_ID);
    await setConversationAi(db, LOCAL_VENDOR_ID, conversation.id, true);
    const result = await ingestInbound(
      db,
      LOCAL_VENDOR_ID,
      inbound({ zaloMsgId: "m-2", timestamp: 1_700_000_000_100 }),
      ai,
    );
    expect(result.created).toBe(true);
    expect(result.aiQueued).toBe(false);
    const rows = await listVendorMessages(db, LOCAL_VENDOR_ID, conversation.id, 0);
    expect(rows.some((row) => row.zaloMsgId === "m-2" && row.status === "received")).toBe(true);
    expect(rows.some((row) => row.source === "ai" && row.status === "failed")).toBe(true);
    expect(rows.find((row) => row.source === "ai")?.content).toBe(AI_FAILURE_TEXT);
    expect(await takeOutbox(db, LOCAL_VENDOR_ID)).toHaveLength(0);
  });

  it("caps model history at the system prompt plus 20 messages", async () => {
    const db = await open();
    const ai = scriptedAi();
    for (let index = 0; index < 25; index += 1) {
      await ingestInbound(
        db,
        LOCAL_VENDOR_ID,
        inbound({
          content: `tin ${index}`,
          zaloMsgId: `old-${index}`,
          timestamp: 1_700_000_000_000 + index,
        }),
        ai.client,
      );
    }
    const [conversation] = await listVendorConversations(db, LOCAL_VENDOR_ID);
    await setConversationAi(db, LOCAL_VENDOR_ID, conversation.id, true);
    await ingestInbound(
      db,
      LOCAL_VENDOR_ID,
      inbound({ content: "tin moi", zaloMsgId: "new", timestamp: 1_700_000_000_500 }),
      ai.client,
    );
    expect(ai.prompts[0]).toHaveLength(21);
  });

  it("runs one model call at a time for the same conversation", async () => {
    const db = await open();
    let active = 0;
    let maxActive = 0;
    const ai: AiClient = {
      async complete() {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 40));
        active -= 1;
        return "ok";
      },
    };
    await ingestInbound(db, LOCAL_VENDOR_ID, inbound({ zaloMsgId: "seed" }), ai);
    const [conversation] = await listVendorConversations(db, LOCAL_VENDOR_ID);
    await setConversationAi(db, LOCAL_VENDOR_ID, conversation.id, true);
    await Promise.all([
      ingestInbound(
        db,
        LOCAL_VENDOR_ID,
        inbound({ content: "mot", zaloMsgId: "a", timestamp: 1_700_000_000_100 }),
        ai,
      ),
      ingestInbound(
        db,
        LOCAL_VENDOR_ID,
        inbound({ content: "hai", zaloMsgId: "b", timestamp: 1_700_000_000_200 }),
        ai,
      ),
    ]);
    expect(maxActive).toBe(1);
    const queued = await takeOutbox(db, LOCAL_VENDOR_ID);
    expect(queued.filter((row) => row.source === "ai")).toHaveLength(2);
  });

  it("does not answer a message sent by the linked account", async () => {
    const db = await open();
    const ai = scriptedAi();
    await ingestInbound(db, LOCAL_VENDOR_ID, inbound({ zaloMsgId: "seed" }), ai.client);
    const [conversation] = await listVendorConversations(db, LOCAL_VENDOR_ID);
    await setConversationAi(db, LOCAL_VENDOR_ID, conversation.id, true);
    const result = await ingestInbound(
      db,
      LOCAL_VENDOR_ID,
      inbound({ isSelf: true, content: "tu gui", zaloMsgId: "self-1", timestamp: 1_700_000_000_100 }),
      ai.client,
    );
    expect(result.aiQueued).toBe(false);
    expect(ai.prompts).toHaveLength(0);
  });
});

describe("auth and tenant isolation", () => {
  const opened: Array<{ cleanup: () => Promise<void> }> = [];

  afterEach(async () => {
    for (const item of opened) await item.cleanup();
    opened.length = 0;
  });

  async function open() {
    const handle = await tempDatabase();
    opened.push(handle);
    return handle.db;
  }

  it("rejects a wrong password and an unknown token", async () => {
    const db = await open();
    expect(await loginOperator(db, LOCAL_VENDOR_ID, "nope", "secret")).toBeNull();
    const session = await loginOperator(db, LOCAL_VENDOR_ID, "secret", "secret");
    expect(session?.token).toBeTruthy();
    expect(await findVendorByToken(db, session?.token ?? "")).toBe(LOCAL_VENDOR_ID);
    expect(await findVendorByToken(db, "missing-token")).toBeNull();
  });

  it("hides another vendor's conversations and outbox", async () => {
    const db = await open();
    const ai = scriptedAi("khong duoc thay");
    await ingestInbound(db, OTHER_VENDOR, inbound({ threadId: "secret-thread" }), ai.client);
    const [hidden] = await listVendorConversations(db, OTHER_VENDOR);
    await setConversationAi(db, OTHER_VENDOR, hidden.id, true);
    await ingestInbound(
      db,
      OTHER_VENDOR,
      inbound({ threadId: "secret-thread", zaloMsgId: "m-2", timestamp: 1_700_000_000_100 }),
      ai.client,
    );
    expect(await listVendorConversations(db, LOCAL_VENDOR_ID)).toHaveLength(0);
    expect(await takeOutbox(db, LOCAL_VENDOR_ID)).toHaveLength(0);
    await expect(listVendorMessages(db, LOCAL_VENDOR_ID, hidden.id, 0)).rejects.toBeInstanceOf(AppError);
    await expect(enqueueOperatorMessage(db, LOCAL_VENDOR_ID, hidden.id, "chao")).rejects.toBeInstanceOf(AppError);
  });
});
