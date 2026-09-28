import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FacebookConfig } from "@/config/env";

const state = vi.hoisted(() => ({
  facebook: null as FacebookConfig | null,
  db: vi.fn(),
  store: vi.fn(),
  reply: vi.fn(),
}));

vi.mock("@/config/env", () => ({
  getEnv: () => ({ vendorId: "local", deepinfraApiKey: "test-key", facebook: state.facebook }),
}));

vi.mock("@/lib/db", () => ({ getDb: state.db }));

vi.mock("@zalo/core", async (original) => ({
  ...(await original<typeof import("@zalo/core")>()),
  storeInboundMessage: state.store,
  replyToConversation: state.reply,
}));

const { GET, POST } = await import("@/app/api/facebook/webhook/route");

const CONFIG: FacebookConfig = {
  pageId: "page-1",
  pageAccessToken: "page-token",
  appSecret: "app-secret",
  verifyToken: "verify-me",
};

const URL_BASE = "http://localhost/api/facebook/webhook";

function verifyRequest(params: Record<string, string>): Request {
  return new Request(`${URL_BASE}?${new URLSearchParams(params).toString()}`);
}

function signedPost(body: string, secret = CONFIG.appSecret): Request {
  const signature = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return new Request(URL_BASE, {
    method: "POST",
    headers: { "x-hub-signature-256": `sha256=${signature}` },
    body,
  });
}

function textPayload(pageId = CONFIG.pageId): string {
  return JSON.stringify({
    object: "page",
    entry: [
      {
        id: pageId,
        messaging: [
          {
            sender: { id: "psid-1" },
            timestamp: 1_700_000_000_000,
            message: { mid: "mid-1", text: "xin chao" },
          },
        ],
      },
    ],
  });
}

beforeEach(() => {
  state.facebook = CONFIG;
  state.db.mockResolvedValue({});
  state.store.mockResolvedValue({ created: true, conversationId: "c-1", shouldReply: true });
  state.reply.mockResolvedValue(true);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("facebook webhook verification (GET)", () => {
  it("echoes the challenge when the verify token matches", async () => {
    const response = GET(
      verifyRequest({ "hub.mode": "subscribe", "hub.verify_token": "verify-me", "hub.challenge": "42" }),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("42");
  });

  it("refuses a wrong token, a wrong mode, or a missing challenge", () => {
    const wrongToken = GET(
      verifyRequest({ "hub.mode": "subscribe", "hub.verify_token": "nope", "hub.challenge": "42" }),
    );
    const wrongMode = GET(
      verifyRequest({ "hub.mode": "unsubscribe", "hub.verify_token": "verify-me", "hub.challenge": "42" }),
    );
    const noChallenge = GET(verifyRequest({ "hub.mode": "subscribe", "hub.verify_token": "verify-me" }));
    expect([wrongToken.status, wrongMode.status, noChallenge.status]).toEqual([403, 403, 403]);
  });

  it("answers 503 while facebook is not configured", () => {
    state.facebook = null;
    expect(GET(verifyRequest({ "hub.mode": "subscribe" })).status).toBe(503);
  });
});

describe("facebook webhook delivery (POST)", () => {
  it("rejects a missing or forged signature before touching the database", async () => {
    const unsigned = await POST(new Request(URL_BASE, { method: "POST", body: textPayload() }));
    const forged = await POST(signedPost(textPayload(), "attacker-secret"));
    expect(unsigned.status).toBe(401);
    expect(forged.status).toBe(401);
    expect(state.db).not.toHaveBeenCalled();
    expect(state.store).not.toHaveBeenCalled();
  });

  it("answers 503 while facebook is not configured", async () => {
    state.facebook = null;
    expect((await POST(signedPost(textPayload()))).status).toBe(503);
  });

  it("stores the message, replies without blocking, and acknowledges", async () => {
    const response = await POST(signedPost(textPayload()));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("EVENT_RECEIVED");
    expect(state.store).toHaveBeenCalledWith(
      {},
      "local",
      expect.objectContaining({ channel: "facebook", threadId: "psid-1", externalMsgId: "mid-1" }),
    );
    expect(state.reply).toHaveBeenCalledWith({}, "local", "c-1", expect.anything(), 1_700_000_000_000);
  });

  it("acknowledges even when the detached reply later fails", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    state.reply.mockRejectedValue(new Error("model down"));
    const response = await POST(signedPost(textPayload()));
    expect(response.status).toBe(200);
    await vi.waitFor(() => expect(errors).toHaveBeenCalledWith("model down"));
    errors.mockRestore();
  });

  it("skips the reply for duplicates and ignores events for another page", async () => {
    state.store.mockResolvedValue({ created: false, conversationId: null, shouldReply: false });
    expect((await POST(signedPost(textPayload()))).status).toBe(200);
    expect(state.reply).not.toHaveBeenCalled();
    state.store.mockClear();
    expect((await POST(signedPost(textPayload("page-other")))).status).toBe(200);
    expect(state.store).not.toHaveBeenCalled();
    expect(state.db).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when storing fails so facebook retries", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    state.store.mockRejectedValue(new Error("db down"));
    const response = await POST(signedPost(textPayload()));
    expect(response.status).toBe(500);
    expect(state.reply).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
