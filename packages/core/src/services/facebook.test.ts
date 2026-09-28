import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { FACEBOOK_GRAPH_URL } from "../constants";
import { parseFacebookWebhook, sendFacebookText, verifyFacebookSignature } from "./facebook";

const SECRET = "app-secret";
const PAGE_ID = "page-1";

function sign(body: string, secret = SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

function webhook(messaging: unknown[], pageId = PAGE_ID): string {
  return JSON.stringify({ object: "page", entry: [{ id: pageId, time: 1, messaging }] });
}

function textEvent(overrides: Record<string, unknown> = {}, message: Record<string, unknown> = {}) {
  return {
    sender: { id: "psid-123456789" },
    recipient: { id: PAGE_ID },
    timestamp: 1_700_000_000_000,
    message: { mid: "mid-1", text: "xin chao", ...message },
    ...overrides,
  };
}

describe("verifyFacebookSignature", () => {
  const body = webhook([textEvent()]);

  it("accepts a valid signature with and without the sha256= prefix", () => {
    const header = sign(body);
    expect(verifyFacebookSignature(body, header, SECRET)).toBe(true);
    expect(verifyFacebookSignature(body, header.slice("sha256=".length), SECRET)).toBe(true);
  });

  it("rejects a wrong secret, a tampered body, and a truncated signature", () => {
    expect(verifyFacebookSignature(body, sign(body, "other-secret"), SECRET)).toBe(false);
    expect(verifyFacebookSignature(`${body} `, sign(body), SECRET)).toBe(false);
    expect(verifyFacebookSignature(body, sign(body).slice(0, 20), SECRET)).toBe(false);
  });

  it("rejects a missing header and never passes with an empty secret", () => {
    expect(verifyFacebookSignature(body, null, SECRET)).toBe(false);
    expect(verifyFacebookSignature(body, "", SECRET)).toBe(false);
    expect(verifyFacebookSignature(body, sign(body, ""), "")).toBe(false);
  });
});

describe("parseFacebookWebhook", () => {
  it("maps a customer text message to a facebook inbound input", () => {
    const [input] = parseFacebookWebhook(webhook([textEvent()]), PAGE_ID);
    expect(input).toEqual({
      channel: "facebook",
      threadId: "psid-123456789",
      threadType: "user",
      title: "Khách 456789",
      avatarUrl: null,
      overwriteTitle: false,
      content: "xin chao",
      isText: true,
      isSelf: false,
      externalMsgId: "mid-1",
      timestamp: 1_700_000_000_000,
    });
  });

  it("drops echoes, postbacks, delivery receipts, and blank text", () => {
    const events = [
      textEvent({}, { is_echo: true }),
      textEvent({ message: undefined, postback: { title: "Mua", payload: "BUY" } }),
      textEvent({ message: undefined, delivery: { mids: ["mid-1"] } }),
      textEvent({}, { text: "   " }),
      textEvent({}, { text: undefined, attachments: [{ type: "image" }] }),
    ];
    expect(parseFacebookWebhook(webhook(events), PAGE_ID)).toEqual([]);
  });

  it("ignores entries for another page and events without a sender", () => {
    expect(parseFacebookWebhook(webhook([textEvent()], "page-other"), PAGE_ID)).toEqual([]);
    expect(parseFacebookWebhook(webhook([textEvent({ sender: undefined })]), PAGE_ID)).toEqual([]);
  });

  it("returns nothing for malformed or empty payloads", () => {
    expect(parseFacebookWebhook("not json", PAGE_ID)).toEqual([]);
    expect(parseFacebookWebhook("{}", PAGE_ID)).toEqual([]);
    expect(parseFacebookWebhook(JSON.stringify({ entry: [{ id: PAGE_ID }] }), PAGE_ID)).toEqual([]);
    expect(parseFacebookWebhook(webhook([]), PAGE_ID)).toEqual([]);
  });

  it("keeps every message of a batched delivery and falls back on a missing timestamp", () => {
    const parsed = parseFacebookWebhook(
      webhook([
        textEvent({ timestamp: undefined }, { mid: "mid-a" }),
        textEvent({}, { mid: undefined, text: "lan hai" }),
      ]),
      PAGE_ID,
    );
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.timestamp).toBeGreaterThan(0);
    expect(parsed[1]?.externalMsgId).toBeNull();
  });
});

describe("sendFacebookText", () => {
  it("posts the text to the Send API with the token in a header, not the URL", async () => {
    let url = "";
    let init: RequestInit | undefined;
    await sendFacebookText({
      pageAccessToken: "page-token",
      psid: "psid-1",
      text: "chao ban",
      fetchImpl: async (input, requestInit) => {
        url = String(input);
        init = requestInit;
        return new Response("{}", { status: 200 });
      },
    });
    expect(url).toBe(`${FACEBOOK_GRAPH_URL}/me/messages`);
    expect(url).not.toContain("page-token");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer page-token");
    expect(JSON.parse(String(init?.body))).toEqual({
      recipient: { id: "psid-1" },
      message: { text: "chao ban" },
    });
  });

  it("throws on an HTTP error and on a network failure", async () => {
    await expect(
      sendFacebookText({
        pageAccessToken: "page-token",
        psid: "psid-1",
        text: "chao",
        fetchImpl: async () => new Response("bad", { status: 400 }),
      }),
    ).rejects.toThrow("Facebook HTTP 400");
    await expect(
      sendFacebookText({
        pageAccessToken: "page-token",
        psid: "psid-1",
        text: "chao",
        fetchImpl: async () => {
          throw new Error("network down");
        },
      }),
    ).rejects.toThrow("network down");
  });

  it("aborts a request that outlives the timeout", async () => {
    await expect(
      sendFacebookText({
        pageAccessToken: "page-token",
        psid: "psid-1",
        text: "chao",
        timeoutMs: 5,
        fetchImpl: (_input, requestInit) =>
          new Promise((_resolve, reject) => {
            requestInit?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
          }),
      }),
    ).rejects.toThrow("aborted");
  });
});
