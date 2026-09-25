import { describe, expect, it } from "vitest";
import { DEEPINFRA_MODEL } from "@zalo/core";
import { GET as listConversations } from "@/app/api/conversations/route";
import { POST as sendMessage } from "@/app/api/conversations/[id]/messages/route";
import { DELETE as removeChat, PATCH as setAi } from "@/app/api/conversations/[id]/route";
import { POST as logoutZalo } from "@/app/api/zalo/logout/route";
import { GET as readQr } from "@/app/api/zalo/qr/route";
import { GET as readShop } from "@/app/api/admin/shop/route";
import { GET as readStaff } from "@/app/api/admin/staff/route";
import { GET as readBookings } from "@/app/api/admin/bookings/route";
import { GET as readCustomers } from "@/app/api/admin/customers/route";
import { GET as readStatus } from "@/app/api/zalo/status/route";
import { PATCH as setAllAi } from "@/app/api/zalo/ai/route";
import { DELETE as clearContext } from "@/app/api/conversations/[id]/context/route";
import { GET as readSession } from "@/app/api/conversations/[id]/session/route";
import { getAiClient, modelName } from "@/features/ai";

describe("protected routes", () => {
  it("rejects requests without a token", async () => {
    const list = await listConversations(new Request("http://localhost/api/conversations"));
    const status = await readStatus(new Request("http://localhost/api/zalo/status"));
    const qr = await readQr(new Request("http://localhost/api/zalo/qr"));
    const logout = await logoutZalo(new Request("http://localhost/api/zalo/logout", { method: "POST" }));
    const context = { params: Promise.resolve({ id: "missing" }) };
    const session = await readSession(
      new Request("http://localhost/api/conversations/missing/session"),
      context,
    );
    const removed = await removeChat(
      new Request("http://localhost/api/conversations/missing", { method: "DELETE" }),
      context,
    );
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
    expect(removed.status).toBe(401);
    expect(session.status).toBe(401);
    const shop = await readShop(new Request("http://localhost/api/admin/shop"));
    const staff = await readStaff(new Request("http://localhost/api/admin/staff"));
    const bookings = await readBookings(new Request("http://localhost/api/admin/bookings"));
    const customers = await readCustomers(new Request("http://localhost/api/admin/customers"));
    const allAi = await setAllAi(new Request("http://localhost/api/zalo/ai", { method: "PATCH" }));
    const cleared = await clearContext(
      new Request("http://localhost/api/conversations/missing/context", { method: "DELETE" }),
      context,
    );
    expect(post.status).toBe(401);
    expect(allAi.status).toBe(401);
    expect(cleared.status).toBe(401);
    expect(shop.status).toBe(401);
    expect(staff.status).toBe(401);
    expect(bookings.status).toBe(401);
    expect(customers.status).toBe(401);
  });

  it("points the server model at DeepSeek V4.1 Flash", () => {
    expect(modelName()).toBe(DEEPINFRA_MODEL);
    expect(typeof getAiClient).toBe("function");
  });
});
