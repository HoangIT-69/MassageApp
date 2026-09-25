import { describe, expect, it } from "vitest";
import { DEEPINFRA_MODEL } from "@zalo/core";
import { GET as listConversations } from "@/app/api/conversations/route";
import { POST as sendMessage } from "@/app/api/conversations/[id]/messages/route";
import { PATCH as setAi } from "@/app/api/conversations/[id]/route";
import { POST as logoutZalo } from "@/app/api/zalo/logout/route";
import { GET as readQr } from "@/app/api/zalo/qr/route";
import { GET as readStatus } from "@/app/api/zalo/status/route";
import { getAiClient, modelName } from "@/features/ai";

describe("protected routes", () => {
  it("rejects requests without a token", async () => {
    const list = await listConversations(new Request("http://localhost/api/conversations"));
    const status = await readStatus(new Request("http://localhost/api/zalo/status"));
    const qr = await readQr(new Request("http://localhost/api/zalo/qr"));
    const logout = await logoutZalo(new Request("http://localhost/api/zalo/logout", { method: "POST" }));
    const context = { params: Promise.resolve({ id: "missing" }) };
    const patch = await setAi(
      new Request("http://localhost/api/conversations/missing", { method: "PATCH" }),
      context,
    );
    const post = await sendMessage(
      new Request("http://localhost/api/conversations/missing/messages", { method: "POST" }),
      context,
    );
    expect(list.status).toBe(401);
    expect(status.status).toBe(401);
    expect(qr.status).toBe(401);
    expect(logout.status).toBe(401);
    expect(patch.status).toBe(401);
    expect(post.status).toBe(401);
  });

  it("points the server model at DeepSeek V4.1 Flash", () => {
    expect(modelName()).toBe(DEEPINFRA_MODEL);
    expect(typeof getAiClient).toBe("function");
  });
});
