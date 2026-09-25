import { afterEach, describe, expect, it } from "vitest";
import { LOCAL_VENDOR_ID } from "../constants";
import { closeDatabase, createIsolatedDatabase, dropIsolatedDatabase, type AppDatabase } from "../db/client";
import { AppError } from "../errors";
import { listBookings } from "../repositories/bookings";
import { listFactsForConversation, saveCustomerProfile } from "../repositories/memory";
import { confirmBooking } from "./booking-actions";
import { keepCustomerName } from "./customer-name";
import { peerAvatar } from "./peer";
import { applyBookingDraft, rememberConversation } from "./reply-side-effects";
import { ingestInbound } from "./inbound";
import { setConversationAi } from "./conversations";
import { listVendorConversations } from "./conversations";
import { takeOutbox } from "./outbox";
import { composeSystemPrompt, type ShopPromptInput } from "./prompt";
import { ensureShopSeed } from "./seed";
import { parseMemoryExtract, parseModelReply } from "./signals";
import type { AiClient, ChatTurn, InboundInput } from "../types";

const ADMIN_URL = process.env.DATABASE_URL ?? "mysql://root:zalo_root@127.0.0.1:3306/zalo_chat";
const OTHER_VENDOR = "other-vendor";

const promptBase: ShopPromptInput = {
  name: "Sen Vàng",
  tagline: "Phòng riêng",
  address: "Cầu Giấy",
  directions: "Vào ngõ",
  hotline: "0901",
  hours: { mon: "09:00-21:00", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
  intro: "Quán nhỏ",
  amenities: "Tắm",
  policyBooking: "Nhắn trước",
  policyCancel: "Báo sớm",
  policyLate: "15 phút",
  policyNewGuest: "Nói lực",
  voice: "Xưng mình",
  forbidden: "Không chẩn đoán",
  services: [{ name: "Body 60", durationMinutes: 60, priceVnd: 350000, description: "Dầu ấm", active: true }],
  staff: [
    {
      id: "staff-lan",
      name: "Lan",
      gender: "nu",
      specialties: "Body",
      yearsExperience: 6,
      bio: "Nhẹ tay",
      active: true,
      hasPhoto: true,
      shifts: [{ weekday: 1, startTime: "09:00", endTime: "15:00" }],
    },
  ],
  customerName: "An",
  zaloName: "Hoang Ngoc",
  nameConfirmed: true,
  customerPhone: "0902",
  notes: "Thích phòng yên",
  facts: [
    { kind: "name", content: "Tên máy" },
    { kind: "preference", content: "lực nhẹ" },
  ],
  summaries: [{ body: "Khách hỏi giá body." }],
  anchor: { serviceName: "Body 60", staffName: "Lan", whenText: "", missing: "giờ" },
};

function inbound(overrides: Partial<InboundInput> = {}): InboundInput {
  return {
    threadId: "thread-1",
    threadType: "user",
    title: "An",
    avatarUrl: null,
    overwriteTitle: true,
    content: "đặt body",
    isText: true,
    isSelf: false,
    zaloMsgId: "m-1",
    timestamp: 1_700_000_000_000,
    ...overrides,
  };
}

describe("prompt and reply signals", () => {
  it("puts shop, staff photo flag, and the manual customer name into the prompt", () => {
    const prompt = composeSystemPrompt(promptBase);
    expect(prompt).toContain("Sen Vàng");
    expect(prompt).toContain("Body 60");
    expect(prompt).toContain("HAS_PHOTO=true");
    expect(prompt).toContain("Tên đã xác nhận: An");
    expect(prompt).toContain("Không gọi khách bằng các tên này");
    expect(prompt).not.toContain("Tên máy");
    expect(prompt).toContain("lực nhẹ");
    expect(prompt).toContain("[SEND_PHOTOS:");
    expect(prompt).toContain("[BOOKING]");
  });

  it("asks the customer to confirm the Zalo name before using it", () => {
    const prompt = composeSystemPrompt({
      ...promptBase,
      customerName: "",
      nameConfirmed: false,
      zaloName: "Hoang Ngoc",
    });
    expect(prompt).toContain("Tên Zalo gợi ý: Hoang Ngoc");
    expect(prompt).toContain("Hỏi khách có đúng tên Zalo gợi ý không");
    expect(prompt).toContain("customerName để trống cho đến khi khách xác nhận tên");
  });

  it("strips photo and booking tags from the customer-visible text", () => {
    const parsed = parseModelReply(
      'Mình giữ giúp bạn.\n[SEND_PHOTOS:staff-lan]\n[BOOKING]{"serviceName":"Body 60","staffName":"Lan","whenText":"thứ 7 15:00","customerName":"An","phone":"0902"}[/BOOKING]',
    );
    expect(parsed.text).toBe("Mình giữ giúp bạn.");
    expect(parsed.text).not.toContain("SEND_PHOTOS");
    expect(parsed.text).not.toContain("BOOKING");
    expect(parsed.photoIds).toEqual(["staff-lan"]);
    expect(parsed.booking?.serviceName).toBe("Body 60");
  });

  it("reads a memory extract and ignores junk", () => {
    const extracted = parseMemoryExtract(
      '```json\n{"facts":[{"kind":"phone","content":"0902","confidence":0.9}],"summary":"Khách để số.","anchor":null}\n```',
    );
    expect(extracted?.facts[0]?.content).toBe("0902");
    expect(extracted?.summary).toBe("Khách để số.");
    expect(parseMemoryExtract("không phải json")).toBeNull();
  });
});

describe("booking draft and tenant isolation", () => {
  const opened: Array<{ cleanup: () => Promise<void> }> = [];

  afterEach(async () => {
    for (const item of opened) await item.cleanup();
    opened.length = 0;
  });

  async function open(): Promise<AppDatabase> {
    const created = await createIsolatedDatabase(ADMIN_URL);
    opened.push({
      cleanup: async () => {
        await closeDatabase(created.db);
        await dropIsolatedDatabase(ADMIN_URL, created.name);
      },
    });
    return created.db;
  }

  it("stores a clean reply and a pending booking, then confirms only for the owning vendor", async () => {
    const db = await open();
    await ensureShopSeed(db, LOCAL_VENDOR_ID);
    const prompts: ChatTurn[][] = [];
    const ai: AiClient = {
      async complete(messages) {
        prompts.push(messages);
        if (messages[0]?.content === "Bạn chỉ trả JSON.") return "{}";
        return 'Giữ chỗ giúp bạn [SEND_PHOTOS:missing]\n[BOOKING]{"serviceName":"Massage body 60 phút","staffName":"Lan","whenText":"thứ 7 15:00","customerName":"An","phone":"0902000000"}[/BOOKING]';
      },
    };
    await ingestInbound(db, LOCAL_VENDOR_ID, inbound({ zaloMsgId: "seed" }), ai);
    const [conversation] = await listVendorConversations(db, LOCAL_VENDOR_ID);
    await setConversationAi(db, LOCAL_VENDOR_ID, conversation.id, true);
    await saveCustomerProfile(db, LOCAL_VENDOR_ID, conversation.id, {
      displayName: "Chị An",
      phone: "",
      notes: "",
    });
    await ingestInbound(
      db,
      LOCAL_VENDOR_ID,
      inbound({ content: "chiều thứ 7", zaloMsgId: "m-2", timestamp: 1_700_000_000_100 }),
      ai,
    );
    const queued = await takeOutbox(db, LOCAL_VENDOR_ID);
    expect(queued.some((item) => item.content.includes("SEND_PHOTOS") || item.content.includes("BOOKING"))).toBe(false);
    expect(queued.some((item) => item.content === "Giữ chỗ giúp bạn")).toBe(true);
    expect(prompts[0]?.[0]?.content).toContain("Chị An");
    const pending = await listBookings(db, LOCAL_VENDOR_ID);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.status).toBe("cho_xac_nhan");
    expect(pending[0]?.staffName).toBe("Lan");
    const [booked] = await listVendorConversations(db, LOCAL_VENDOR_ID);
    expect(booked?.stage).toBe("cho_xac_nhan");
    await expect(confirmBooking(db, OTHER_VENDOR, pending[0]?.id ?? "")).rejects.toBeInstanceOf(AppError);
    await confirmBooking(db, LOCAL_VENDOR_ID, pending[0]?.id ?? "");
    const sent = await takeOutbox(db, LOCAL_VENDOR_ID);
    expect(sent.some((item) => item.content.includes("đã chốt lịch"))).toBe(true);
    expect(await listBookings(db, OTHER_VENDOR)).toHaveLength(0);
  });

  it("drops a staff name used as the customer name before the customer confirms", async () => {
    const db = await open();
    await ensureShopSeed(db, LOCAL_VENDOR_ID);
    await ingestInbound(db, LOCAL_VENDOR_ID, inbound({ title: "Hoang Ngoc" }), {
      async complete() {
        return "";
      },
    });
    const [conversation] = await listVendorConversations(db, LOCAL_VENDOR_ID);
    expect(keepCustomerName("Lan", ["Lan", "Minh"], "", "Hoang Ngoc")).toBe("");
    await rememberConversation(
      db,
      LOCAL_VENDOR_ID,
      conversation.id,
      {
        async complete() {
          return '{"facts":[{"kind":"name","content":"Lan","confidence":0.9}],"summary":"","anchor":null}';
        },
      },
      [],
    );
    expect(await listFactsForConversation(db, LOCAL_VENDOR_ID, conversation.id)).toHaveLength(0);
    await applyBookingDraft(db, LOCAL_VENDOR_ID, conversation.id, {
      text: "",
      photoIds: [],
      booking: {
        serviceName: "Massage body 60 phút",
        staffName: "Minh",
        whenText: "tối nay",
        customerName: "Lan",
        phone: "0903",
      },
    });
    const pending = await listBookings(db, LOCAL_VENDOR_ID);
    expect(pending[0]?.customerName).toBe("");
    expect(peerAvatar(undefined, { "peer-1": { avatar: "https://cdn.example/a.jpg" } }, "peer-1")).toBe(
      "https://cdn.example/a.jpg",
    );
  });
});
