export { LOCAL_VENDOR_ID } from "./constants";
export {
  AI_FAILURE_TEXT,
  ATTACHMENT_PLACEHOLDER,
  CHAT_SYSTEM_PROMPT,
  DEEPINFRA_MODEL,
  DEEPINFRA_URL,
  HISTORY_LIMIT,
  MAX_MESSAGE_LENGTH,
} from "./constants";
export { AppError } from "./errors";
export { closeDatabase, openDatabase, type AppDatabase } from "./db/client";
export { findVendorByToken } from "./repositories/sessions";
export { getConversation } from "./repositories/conversations";
export { loginOperator } from "./services/auth";
export {
  readZaloLink,
  setAwaitingQr,
  setZaloConnected,
  setZaloDisconnected,
  toQrDataUrl,
} from "./services/zalo-link";
export {
  enqueueOperatorMessage,
  listVendorConversations,
  listVendorMessages,
  setConversationAi,
} from "./services/conversations";
export { buildChatMessages, ingestInbound } from "./services/inbound";
export { createDeepInfraClient } from "./services/deepinfra";
export { clearCredentials, readCredentials, writeCredentials } from "./services/credentials";
export { requestZaloLogout } from "./services/logout";
export { readRelink } from "./repositories/zalo-control";
export { completeOutboxSend, takeOutbox } from "./services/outbox";
export type {
  AiClient,
  ChatTurn,
  ConversationRecord,
  InboundInput,
  IngestResult,
  MessageRecord,
  ZaloCredentials,
  ZaloLinkRecord,
} from "./types";
