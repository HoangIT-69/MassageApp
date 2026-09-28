import { AI_FAILURE_TEXT, ATTACHMENT_PLACEHOLDER } from "../constants";
import type { AppDatabase } from "../db/client";
import { isUniqueConstraint } from "../db/sql";
import {
  findConversationByThread,
  getConversation,
  insertConversation,
  touchConversation,
  updateConversationTitle,
} from "../repositories/conversations";
import {
  attachExternalMsgId,
  findMessageByExternalId,
  findSelfEcho,
  insertMessage,
  listRecentMessages,
} from "../repositories/messages";
import type {
  AiClient,
  ChannelName,
  ChatTurn,
  InboundInput,
  IngestResult,
  MessageRecord,
  MessageStatus,
} from "../types";

export type StoredInbound = {
  created: boolean;
  conversationId: string | null;
  shouldReply: boolean;
};
import { readShopAiAll } from "../repositories/catalog";
import { loadSystemPrompt } from "./shop-context";
import { applyBookingDraft, queueVisibleReply, rememberConversation } from "./reply-side-effects";
import { parseModelReply } from "./signals";

const tails = new Map<string, Promise<unknown>>();

function echoStatus(status: string): MessageStatus {
  if (status === "queued") return "sent";
  if (status === "sent" || status === "failed" || status === "received") return status;
  return "received";
}

function runExclusive<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();
  const run = previous.then(task, task);
  tails.set(key, run);
  void run.then(
    () => {
      if (tails.get(key) === run) tails.delete(key);
    },
    () => {
      if (tails.get(key) === run) tails.delete(key);
    },
  );
  return run;
}

export function buildChatMessages(history: MessageRecord[], systemPrompt: string): ChatTurn[] {
  return [
    { role: "system", content: systemPrompt },
    ...history.map((message) => ({
      role: message.direction === "in" ? ("user" as const) : ("assistant" as const),
      content: message.content,
    })),
  ];
}

async function openConversation(db: AppDatabase, vendorId: string, input: InboundInput) {
  const existing = await findConversationByThread(db, vendorId, input.channel, input.threadId);
  if (!existing) {
    try {
      const aiEnabled = await readShopAiAll(db, vendorId);
      return await insertConversation(db, vendorId, input, aiEnabled);
    } catch (error) {
      if (!isUniqueConstraint(error)) throw error;
      const raced = await findConversationByThread(db, vendorId, input.channel, input.threadId);
      if (!raced) throw error;
      return await updateConversationTitle(db, raced, input);
    }
  }
  return await updateConversationTitle(db, existing, input);
}

async function storeInbound(db: AppDatabase, vendorId: string, conversationId: string, input: InboundInput) {
  const content = input.isText ? input.content : ATTACHMENT_PLACEHOLDER;
  const created = await insertMessage(db, {
    vendorId,
    channel: input.channel,
    conversationId,
    direction: input.isSelf ? "out" : "in",
    source: "customer",
    content,
    externalMsgId: input.externalMsgId,
    status: "received",
    createdAt: input.timestamp,
  });
  await touchConversation(db, vendorId, conversationId, content, input.timestamp);
  return created;
}

async function failReply(
  db: AppDatabase,
  vendorId: string,
  channel: ChannelName,
  conversationId: string,
  timestamp: number,
): Promise<void> {
  const createdAt = Math.max(Date.now(), timestamp + 1);
  await insertMessage(db, {
    vendorId,
    channel,
    conversationId,
    direction: "out",
    source: "ai",
    content: AI_FAILURE_TEXT,
    externalMsgId: null,
    status: "failed",
    createdAt,
  });
  await touchConversation(db, vendorId, conversationId, AI_FAILURE_TEXT, createdAt);
}

async function generateReply(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  ai: AiClient,
  timestamp: number,
): Promise<boolean> {
  const fresh = await getConversation(db, vendorId, conversationId);
  if (!fresh?.aiEnabled) return false;
  const channel = fresh.channel as ChannelName;
  const history = await listRecentMessages(db, vendorId, conversationId);
  try {
    const systemPrompt = await loadSystemPrompt(db, vendorId, conversationId);
    const reply = (await ai.complete(buildChatMessages(history, systemPrompt))).trim();
    const parsed = parseModelReply(reply);
    if (parsed.text.length === 0 && parsed.photoIds.length === 0) throw new Error("Empty model response");
    const createdAt = Math.max(Date.now(), timestamp + 1);
    const queued = await queueVisibleReply(db, vendorId, channel, conversationId, parsed, createdAt);
    if (!queued.queued) throw new Error("Empty model response");
    await touchConversation(db, vendorId, conversationId, queued.preview, createdAt);
    await applyBookingDraft(db, vendorId, conversationId, parsed);
    const nextHistory = await listRecentMessages(db, vendorId, conversationId);
    await rememberConversation(db, vendorId, conversationId, ai, nextHistory).catch(() => undefined);
    return true;
  } catch {
    await failReply(db, vendorId, channel, conversationId, timestamp);
    return false;
  }
}

export async function storeInboundMessage(
  db: AppDatabase,
  vendorId: string,
  input: InboundInput,
): Promise<StoredInbound> {
  if (input.isText && input.content.trim() === "") {
    return { created: false, conversationId: null, shouldReply: false };
  }
  if (
    input.externalMsgId &&
    (await findMessageByExternalId(db, vendorId, input.channel, input.externalMsgId))
  ) {
    return { created: false, conversationId: null, shouldReply: false };
  }
  const conversation = await openConversation(db, vendorId, input);
  if (input.isSelf && input.externalMsgId) {
    const echo = await findSelfEcho(db, vendorId, conversation.id, input.content, input.timestamp);
    if (echo) {
      await attachExternalMsgId(db, vendorId, echo.id, input.externalMsgId, echoStatus(echo.status));
      return { created: false, conversationId: conversation.id, shouldReply: false };
    }
  }
  try {
    await storeInbound(db, vendorId, conversation.id, input);
  } catch (error) {
    if (isUniqueConstraint(error)) {
      return { created: false, conversationId: conversation.id, shouldReply: false };
    }
    throw error;
  }
  return {
    created: true,
    conversationId: conversation.id,
    shouldReply: !input.isSelf && input.isText,
  };
}

export function replyToConversation(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  ai: AiClient,
  timestamp: number,
): Promise<boolean> {
  return runExclusive(`${vendorId}:${conversationId}`, () =>
    generateReply(db, vendorId, conversationId, ai, timestamp),
  );
}

export async function ingestInbound(
  db: AppDatabase,
  vendorId: string,
  input: InboundInput,
  ai: AiClient,
): Promise<IngestResult> {
  const stored = await storeInboundMessage(db, vendorId, input);
  if (!stored.shouldReply || !stored.conversationId) {
    return { created: stored.created, aiQueued: false };
  }
  const queued = await replyToConversation(
    db,
    vendorId,
    stored.conversationId,
    ai,
    input.timestamp,
  );
  return { created: stored.created, aiQueued: queued };
}
