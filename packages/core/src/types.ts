import type { conversations, messages, zaloLinks } from "./db/schema";

export type ConversationRecord = typeof conversations.$inferSelect;
export type MessageRecord = typeof messages.$inferSelect;
export type ZaloLinkRecord = typeof zaloLinks.$inferSelect;

export type ChannelName = "zalo" | "facebook";
export type ThreadTypeName = "user" | "group";
export type Direction = "in" | "out";
export type MessageSource = "customer" | "operator" | "ai";
export type MessageStatus = "received" | "queued" | "sent" | "failed";
export type ZaloLinkStatus = "disconnected" | "awaiting_qr" | "connected";

export type InboundInput = {
  channel: ChannelName;
  threadId: string;
  threadType: ThreadTypeName;
  title: string;
  avatarUrl: string | null;
  overwriteTitle: boolean;
  content: string;
  isText: boolean;
  isSelf: boolean;
  externalMsgId: string | null;
  timestamp: number;
};

export type IngestResult = {
  created: boolean;
  aiQueued: boolean;
};

export type ChatRole = "system" | "user" | "assistant";

export type ChatTurn = {
  role: ChatRole;
  content: string;
};

export type AiClient = {
  complete(messages: ChatTurn[]): Promise<string>;
};

export type ZaloCredentials = {
  imei: string;
  userAgent: string;
  cookie: unknown;
  language?: string;
};
