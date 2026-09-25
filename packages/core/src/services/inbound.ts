import { AI_FAILURE_TEXT, ATTACHMENT_PLACEHOLDER, CHAT_SYSTEM_PROMPT } from "../constants";
import type { AppDatabase } from "../db/client";
import {
  findConversationByThread,
  getConversation,
  insertConversation,
  touchConversation,
  updateConversationTitle,
} from "../repositories/conversations";
import {
  attachZaloMsgId,
  findMessageByZaloId,
  findSelfEcho,
  insertMessage,
  listRecentMessages,
} from "../repositories/messages";
import type {
  AiClient,
  ChatTurn,
  InboundInput,
  IngestResult,
  MessageRecord,
  MessageStatus,
} from "../types";

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

function isUniqueConstraint(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  const code = error.code;
  return code === "SQLITE_CONSTRAINT_UNIQUE" || code === "SQLITE_CONSTRAINT";
}

export function buildChatMessages(history: MessageRecord[]): ChatTurn[] {
  return [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    ...history.map((message) => ({
      role: message.direction === "in" ? ("user" as const) : ("assistant" as const),
      content: message.content,
    })),
  ];
}

function openConversation(db: AppDatabase, vendorId: string, input: InboundInput) {
  const existing = findConversationByThread(db, vendorId, input.threadId);
  if (!existing) {
    try {
      return insertConversation(db, vendorId, input);
    } catch (error) {
      if (!isUniqueConstraint(error)) throw error;
      const raced = findConversationByThread(db, vendorId, input.threadId);
      if (!raced) throw error;
      return updateConversationTitle(db, raced, input);
    }
  }
  return updateConversationTitle(db, existing, input);
}

function storeInbound(db: AppDatabase, vendorId: string, conversationId: string, input: InboundInput) {
  const content = input.isText ? input.content : ATTACHMENT_PLACEHOLDER;
  const created = insertMessage(db, {
    vendorId,
    conversationId,
    direction: input.isSelf ? "out" : "in",
    source: "zalo",
    content,
    zaloMsgId: input.zaloMsgId,
    status: "received",
    createdAt: input.timestamp,
  });
  touchConversation(db, conversationId, content, input.timestamp);
  return created;
}

async function generateReply(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  ai: AiClient,
  timestamp: number,
): Promise<boolean> {
  const fresh = getConversation(db, vendorId, conversationId);
  if (!fresh?.aiEnabled) return false;
  const history = listRecentMessages(db, vendorId, conversationId);
  try {
    const reply = (await ai.complete(buildChatMessages(history))).trim();
    if (reply.length === 0) throw new Error("Empty model response");
    const createdAt = Math.max(Date.now(), timestamp + 1);
    insertMessage(db, {
      vendorId,
      conversationId,
      direction: "out",
      source: "ai",
      content: reply,
      zaloMsgId: null,
      status: "queued",
      createdAt,
    });
    touchConversation(db, conversationId, reply, createdAt);
    return true;
  } catch {
    const createdAt = Math.max(Date.now(), timestamp + 1);
    insertMessage(db, {
      vendorId,
      conversationId,
      direction: "out",
      source: "ai",
      content: AI_FAILURE_TEXT,
      zaloMsgId: null,
      status: "failed",
      createdAt,
    });
    touchConversation(db, conversationId, AI_FAILURE_TEXT, createdAt);
    return false;
  }
}

export async function ingestInbound(
  db: AppDatabase,
  vendorId: string,
  input: InboundInput,
  ai: AiClient,
): Promise<IngestResult> {
  if (input.isText && input.content.trim() === "") {
    return { created: false, aiQueued: false };
  }
  if (input.zaloMsgId && findMessageByZaloId(db, vendorId, input.zaloMsgId)) {
    return { created: false, aiQueued: false };
  }
  const conversation = openConversation(db, vendorId, input);
  if (input.isSelf && input.zaloMsgId) {
    const echo = findSelfEcho(db, vendorId, conversation.id, input.content, input.timestamp);
    if (echo) {
      attachZaloMsgId(db, vendorId, echo.id, input.zaloMsgId, echoStatus(echo.status));
      return { created: false, aiQueued: false };
    }
  }
  try {
    storeInbound(db, vendorId, conversation.id, input);
  } catch (error) {
    if (isUniqueConstraint(error)) return { created: false, aiQueued: false };
    throw error;
  }
  if (input.isSelf || !input.isText) return { created: true, aiQueued: false };
  const queued = await runExclusive(`${vendorId}:${conversation.id}`, () =>
    generateReply(db, vendorId, conversation.id, ai, input.timestamp),
  );
  return { created: true, aiQueued: queued };
}
