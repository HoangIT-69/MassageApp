import type { AppDatabase } from "../db/client";
import { requireConversation } from "../repositories/conversations";
import { listFactsForConversation, listRecentSummaries } from "../repositories/memory";
import { isChatStage, type ChatStage } from "./customer-name";

export type ConversationSession = {
  zaloName: string;
  aiEnabled: boolean;
  stage: ChatStage;
  facts: { id: string; kind: string; content: string }[];
  summary: string;
};

export async function readConversationSession(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
): Promise<ConversationSession> {
  const conversation = await requireConversation(db, vendorId, conversationId);
  const [facts, summaries] = await Promise.all([
    listFactsForConversation(db, vendorId, conversationId),
    listRecentSummaries(db, vendorId, conversationId),
  ]);
  const uniqueFacts = new Map<string, { id: string; kind: string; content: string }>();
  for (const fact of facts) {
    uniqueFacts.set(`${fact.kind}\u0000${fact.content}`, { id: fact.id, kind: fact.kind, content: fact.content });
  }
  return {
    zaloName: conversation.title,
    aiEnabled: Boolean(conversation.aiEnabled),
    stage: isChatStage(conversation.stage) ? conversation.stage : "chao_hoi",
    facts: [...uniqueFacts.values()],
    summary: summaries.at(-1)?.body ?? "",
  };
}
