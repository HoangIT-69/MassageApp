import {
  bigint,
  boolean,
  index,
  int,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const id = (name: string) => varchar(name, { length: 64 });
const vendor = () => varchar("vendor_id", { length: 64 }).notNull();
const stamp = (name: string) => bigint(name, { mode: "number" }).notNull();

export const operatorSessions = mysqlTable(
  "operator_session",
  {
    id: id("id").primaryKey(),
    vendorId: vendor(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    createdAt: stamp("created_at"),
  },
  (table) => [index("operator_session_token").on(table.tokenHash)],
);

export const zaloControls = mysqlTable("zalo_control", {
  vendorId: varchar("vendor_id", { length: 64 }).primaryKey(),
  relink: int("relink").notNull().default(0),
});

export const zaloLinks = mysqlTable("zalo_link", {
  vendorId: varchar("vendor_id", { length: 64 }).primaryKey(),
  status: varchar("status", { length: 32 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  qrImage: text("qr_image"),
  updatedAt: stamp("updated_at"),
});

export const conversations = mysqlTable(
  "conversations",
  {
    id: id("id").primaryKey(),
    vendorId: vendor(),
    threadId: varchar("thread_id", { length: 128 }).notNull(),
    threadType: varchar("thread_type", { length: 16 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    avatarUrl: text("avatar_url"),
    lastMessage: text("last_message"),
    lastMessageAt: bigint("last_message_at", { mode: "number" }),
    aiEnabled: boolean("ai_enabled").notNull().default(false),
    stage: varchar("stage", { length: 32 }).notNull().default("chao_hoi"),
  },
  (table) => [uniqueIndex("conversations_vendor_thread").on(table.vendorId, table.threadId)],
);

export const messages = mysqlTable(
  "messages",
  {
    id: id("id").primaryKey(),
    vendorId: vendor(),
    conversationId: varchar("conversation_id", { length: 64 }).notNull(),
    direction: varchar("direction", { length: 8 }).notNull(),
    source: varchar("source", { length: 16 }).notNull(),
    content: text("content").notNull(),
    attachmentPath: varchar("attachment_path", { length: 255 }),
    zaloMsgId: varchar("zalo_msg_id", { length: 128 }),
    status: varchar("status", { length: 16 }).notNull(),
    createdAt: stamp("created_at"),
  },
  (table) => [
    uniqueIndex("messages_vendor_zalo_msg").on(table.vendorId, table.zaloMsgId),
    index("messages_conversation_time").on(table.vendorId, table.conversationId, table.createdAt),
  ],
);

export const shopProfiles = mysqlTable("shop_profiles", {
  vendorId: varchar("vendor_id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  tagline: varchar("tagline", { length: 255 }).notNull().default(""),
  address: varchar("address", { length: 255 }).notNull().default(""),
  directions: text("directions").notNull(),
  hotline: varchar("hotline", { length: 32 }).notNull().default(""),
  hoursJson: text("hours_json").notNull(),
  intro: text("intro").notNull(),
  amenities: text("amenities").notNull(),
  policyBooking: text("policy_booking").notNull(),
  policyCancel: text("policy_cancel").notNull(),
  policyLate: text("policy_late").notNull(),
  policyNewGuest: text("policy_new_guest").notNull(),
  voice: text("voice").notNull(),
  forbidden: text("forbidden").notNull(),
  aiAll: boolean("ai_all").notNull().default(false),
  updatedAt: stamp("updated_at"),
});

export const services = mysqlTable(
  "services",
  {
    id: id("id").primaryKey(),
    vendorId: vendor(),
    name: varchar("name", { length: 120 }).notNull(),
    durationMinutes: int("duration_minutes").notNull(),
    priceVnd: int("price_vnd").notNull(),
    description: varchar("description", { length: 500 }).notNull().default(""),
    sortOrder: int("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (table) => [index("services_vendor_sort").on(table.vendorId, table.sortOrder)],
);

export const staff = mysqlTable(
  "staff",
  {
    id: id("id").primaryKey(),
    vendorId: vendor(),
    name: varchar("name", { length: 120 }).notNull(),
    gender: varchar("gender", { length: 16 }).notNull(),
    specialties: varchar("specialties", { length: 255 }).notNull().default(""),
    yearsExperience: int("years_experience").notNull().default(0),
    bio: varchar("bio", { length: 500 }).notNull().default(""),
    active: boolean("active").notNull().default(true),
    photoPath: varchar("photo_path", { length: 255 }),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (table) => [index("staff_vendor_sort").on(table.vendorId, table.sortOrder)],
);

export const staffShifts = mysqlTable(
  "staff_shifts",
  {
    id: id("id").primaryKey(),
    vendorId: vendor(),
    staffId: varchar("staff_id", { length: 64 }).notNull(),
    weekday: int("weekday").notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull(),
    endTime: varchar("end_time", { length: 5 }).notNull(),
  },
  (table) => [index("staff_shifts_vendor_staff").on(table.vendorId, table.staffId)],
);

export const customerProfiles = mysqlTable(
  "customer_profiles",
  {
    id: id("id").primaryKey(),
    vendorId: vendor(),
    conversationId: varchar("conversation_id", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 120 }),
    phone: varchar("phone", { length: 32 }),
    notes: text("notes"),
    updatedAt: stamp("updated_at"),
  },
  (table) => [uniqueIndex("customer_profiles_vendor_chat").on(table.vendorId, table.conversationId)],
);

export const customerFacts = mysqlTable(
  "customer_facts",
  {
    id: id("id").primaryKey(),
    vendorId: vendor(),
    conversationId: varchar("conversation_id", { length: 64 }).notNull(),
    kind: varchar("kind", { length: 24 }).notNull(),
    content: varchar("content", { length: 500 }).notNull(),
    confidence: int("confidence").notNull(),
    createdAt: stamp("created_at"),
  },
  (table) => [index("customer_facts_vendor_chat").on(table.vendorId, table.conversationId, table.createdAt)],
);

export const conversationSummaries = mysqlTable(
  "conversation_summaries",
  {
    id: id("id").primaryKey(),
    vendorId: vendor(),
    conversationId: varchar("conversation_id", { length: 64 }).notNull(),
    body: text("body").notNull(),
    fromCreatedAt: bigint("from_created_at", { mode: "number" }).notNull(),
    toCreatedAt: bigint("to_created_at", { mode: "number" }).notNull(),
    createdAt: stamp("created_at"),
  },
  (table) => [index("summaries_vendor_chat").on(table.vendorId, table.conversationId, table.createdAt)],
);

export const bookingAnchors = mysqlTable(
  "booking_anchors",
  {
    vendorId: vendor(),
    conversationId: varchar("conversation_id", { length: 64 }).notNull(),
    serviceName: varchar("service_name", { length: 120 }).notNull().default(""),
    staffName: varchar("staff_name", { length: 120 }).notNull().default(""),
    whenText: varchar("when_text", { length: 120 }).notNull().default(""),
    missing: varchar("missing", { length: 255 }).notNull().default(""),
    updatedAt: stamp("updated_at"),
  },
  (table) => [primaryKey({ columns: [table.vendorId, table.conversationId] })],
);

export const bookings = mysqlTable(
  "bookings",
  {
    id: id("id").primaryKey(),
    vendorId: vendor(),
    conversationId: varchar("conversation_id", { length: 64 }).notNull(),
    serviceName: varchar("service_name", { length: 120 }).notNull(),
    staffId: varchar("staff_id", { length: 64 }),
    staffName: varchar("staff_name", { length: 120 }).notNull().default(""),
    whenText: varchar("when_text", { length: 120 }).notNull(),
    customerName: varchar("customer_name", { length: 120 }).notNull().default(""),
    phone: varchar("phone", { length: 32 }).notNull().default(""),
    status: varchar("status", { length: 32 }).notNull(),
    createdAt: stamp("created_at"),
    updatedAt: stamp("updated_at"),
  },
  (table) => [index("bookings_vendor_status").on(table.vendorId, table.status, table.createdAt)],
);
