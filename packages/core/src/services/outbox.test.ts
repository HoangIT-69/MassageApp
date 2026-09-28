import { afterEach, describe, expect, it } from "vitest";
import { LOCAL_VENDOR_ID } from "../constants";
import type { AppDatabase } from "../db/client";
import { openTestDatabase } from "../db/test-support";
import { enqueueOperatorMessage, listVendorConversations, listVendorMessages } from "./conversations";
import { ingestInbound } from "./inbound";
import {
  routeOutbox,
  takeOutbox,
  type ChannelSender,
  type FlushOutcome,
  type OutboxItem,
} from "./outbox";
import type { AiClient, ChannelName, InboundInput } from "../types";

const silentAi: AiClient = {
  async complete() {
    return "";
  },
};

function inbound(channel: ChannelName, threadId: string): InboundInput {
  return {
    channel,
    threadId,
    threadType: "user",
    title: "An",
    avatarUrl: null,
    overwriteTitle: false,
    content: "xin chao",
    isText: true,
    isSelf: false,
    externalMsgId: `${channel}-${threadId}`,
    timestamp: 1_700_000_000_000,
  };
}

function recordingSender(channel: ChannelName, sent: OutboxItem[]): ChannelSender {
  return {
    channel,
    async send(item) {
      sent.push(item);
    },
  };
}

describe("outbox routing", () => {
  const opened: Array<{ cleanup: () => Promise<void> }> = [];

  afterEach(async () => {
    for (const handle of opened) await handle.cleanup();
    opened.length = 0;
  });

  async function queueOnBothChannels(): Promise<{ db: AppDatabase; zaloId: string; facebookId: string }> {
    const handle = await openTestDatabase();
    opened.push(handle);
    const { db } = handle;
    await ingestInbound(db, LOCAL_VENDOR_ID, inbound("zalo", "z-1"), silentAi);
    await ingestInbound(db, LOCAL_VENDOR_ID, inbound("facebook", "psid-1"), silentAi);
    const conversations = await listVendorConversations(db, LOCAL_VENDOR_ID);
    const zaloId = conversations.find((row) => row.channel === "zalo")?.id ?? "";
    const facebookId = conversations.find((row) => row.channel === "facebook")?.id ?? "";
    await enqueueOperatorMessage(db, LOCAL_VENDOR_ID, zaloId, "gui zalo");
    await enqueueOperatorMessage(db, LOCAL_VENDOR_ID, facebookId, "gui facebook");
    return { db, zaloId, facebookId };
  }

  async function statusOf(db: AppDatabase, conversationId: string, content: string): Promise<string> {
    const rows = await listVendorMessages(db, LOCAL_VENDOR_ID, conversationId, 0);
    return rows.find((row) => row.content === content)?.status ?? "missing";
  }

  it("tags each queued item with its conversation channel", async () => {
    const { db } = await queueOnBothChannels();
    const batch = await takeOutbox(db, LOCAL_VENDOR_ID);
    expect(batch.map((item) => [item.channel, item.content]).sort()).toEqual([
      ["facebook", "gui facebook"],
      ["zalo", "gui zalo"],
    ]);
    expect(batch.find((item) => item.channel === "facebook")?.threadId).toBe("psid-1");
  });

  it("sends through the matching sender and leaves other channels queued", async () => {
    const { db, zaloId, facebookId } = await queueOnBothChannels();
    const sent: OutboxItem[] = [];
    const senders = new Map<ChannelName, ChannelSender>([
      ["facebook", recordingSender("facebook", sent)],
    ]);
    const outcomes: Array<[ChannelName, FlushOutcome]> = [];
    for (const item of await takeOutbox(db, LOCAL_VENDOR_ID)) {
      outcomes.push([item.channel, await routeOutbox(db, LOCAL_VENDOR_ID, senders, item)]);
    }
    expect(outcomes.sort()).toEqual([
      ["facebook", "sent"],
      ["zalo", "waiting"],
    ]);
    expect(sent.map((item) => item.content)).toEqual(["gui facebook"]);
    expect(await statusOf(db, facebookId, "gui facebook")).toBe("sent");
    expect(await statusOf(db, zaloId, "gui zalo")).toBe("queued");
  });

  it("marks the message failed and rethrows when the sender fails", async () => {
    const { db, facebookId } = await queueOnBothChannels();
    const broken: ChannelSender = {
      channel: "facebook",
      async send() {
        throw new Error("Facebook HTTP 500");
      },
    };
    const batch = await takeOutbox(db, LOCAL_VENDOR_ID);
    const item = batch.find((row) => row.channel === "facebook");
    if (!item) throw new Error("facebook item missing");
    await expect(
      routeOutbox(db, LOCAL_VENDOR_ID, new Map<ChannelName, ChannelSender>([["facebook", broken]]), item),
    ).rejects.toThrow("Facebook HTTP 500");
    expect(await statusOf(db, facebookId, "gui facebook")).toBe("failed");
  });
});
