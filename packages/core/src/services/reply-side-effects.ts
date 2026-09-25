import { FACTS_PER_TURN, SUMMARY_EVERY_N } from "../constants";
import type { AppDatabase } from "../db/client";
import { getStaff, listStaff } from "../repositories/catalog";
import { getConversation } from "../repositories/conversations";
import { countMessagesSince, insertMessage } from "../repositories/messages";
import {
  getCustomerProfile,
  insertFact,
  insertSummary,
  latestSummaryEnd,
  listFactsForConversation,
  saveAnchor,
} from "../repositories/memory";
import { saveDraftBooking } from "../repositories/bookings";
import type { AiClient, MessageRecord } from "../types";
import { keepCustomerName } from "./customer-name";
import { memoryExtractPrompt } from "./memory-prompt";
import { syncConversationStage } from "./session-stage";
import { anchorFromDraft, bookingIsReady, parseMemoryExtract, type ParsedReply } from "./signals";

export async function queueVisibleReply(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  parsed: ParsedReply,
  createdAt: number,
): Promise<{ preview: string; queued: boolean }> {
  let preview = "";
  let queued = false;
  if (parsed.text) {
    await insertMessage(db, {
      vendorId,
      conversationId,
      direction: "out",
      source: "ai",
      content: parsed.text,
      zaloMsgId: null,
      status: "queued",
      createdAt,
    });
    preview = parsed.text;
    queued = true;
  }
  const people = await listStaff(db, vendorId);
  const allowed = new Map(people.filter((person) => person.photoPath).map((person) => [person.id, person]));
  let offset = 1;
  for (const staffId of parsed.photoIds) {
    const person = allowed.get(staffId);
    if (!person?.photoPath) continue;
    const at = createdAt + offset;
    offset += 1;
    await insertMessage(db, {
      vendorId,
      conversationId,
      direction: "out",
      source: "ai",
      content: `Ảnh ${person.name}`,
      attachmentPath: person.photoPath,
      zaloMsgId: null,
      status: "queued",
      createdAt: at,
    });
    preview = `Ảnh ${person.name}`;
    queued = true;
  }
  return { preview, queued };
}

export async function applyBookingDraft(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  parsed: ParsedReply,
): Promise<void> {
  if (!parsed.booking) return;
  const [people, profile, conversation] = await Promise.all([
    listStaff(db, vendorId),
    getCustomerProfile(db, vendorId, conversationId),
    getConversation(db, vendorId, conversationId),
  ]);
  const customerName = keepCustomerName(
    parsed.booking.customerName,
    people.map((person) => person.name),
    profile?.displayName?.trim() ?? "",
    conversation?.title ?? "",
  );
  const booking = { ...parsed.booking, customerName };
  const anchor = anchorFromDraft(booking);
  await saveAnchor(db, vendorId, conversationId, anchor);
  if (!bookingIsReady(booking)) {
    await syncConversationStage(db, vendorId, conversationId);
    return;
  }
  const match = people.find(
    (person) => person.name.localeCompare(booking.staffName, "vi", { sensitivity: "accent" }) === 0,
  );
  await saveDraftBooking(db, vendorId, conversationId, {
    ...booking,
    staffId: match?.id ?? null,
    staffName: match?.name ?? booking.staffName,
  });
  await syncConversationStage(db, vendorId, conversationId);
}

export async function rememberConversation(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  ai: AiClient,
  history: MessageRecord[],
): Promise<void> {
  const [coveredUntil, people, profile, conversation, storedFacts] = await Promise.all([
    latestSummaryEnd(db, vendorId, conversationId),
    listStaff(db, vendorId),
    getCustomerProfile(db, vendorId, conversationId),
    getConversation(db, vendorId, conversationId),
    listFactsForConversation(db, vendorId, conversationId),
  ]);
  const uncovered = await countMessagesSince(db, vendorId, conversationId, coveredUntil);
  const needSummary = uncovered.length >= SUMMARY_EVERY_N;
  const chunk = needSummary ? uncovered.slice(0, SUMMARY_EVERY_N) : history.slice(-8);
  const staffNames = people.map((person) => person.name);
  const raw = await ai.complete([
    { role: "system", content: "Bạn chỉ trả JSON." },
    {
      role: "user",
      content: memoryExtractPrompt(chunk, needSummary, { staffNames, zaloName: conversation?.title ?? "" }),
    },
  ]);
  const extracted = parseMemoryExtract(raw);
  if (!extracted) return;
  for (const fact of extracted.facts.slice(0, FACTS_PER_TURN)) {
    if (fact.confidence < 0.5) continue;
    const content =
      fact.kind === "name"
        ? keepCustomerName(fact.content, staffNames, profile?.displayName?.trim() ?? "", conversation?.title ?? "")
        : fact.content;
    if (content === "") continue;
    if (storedFacts.some((stored) => stored.kind === fact.kind && stored.content === content)) continue;
    const saved = await insertFact(db, vendorId, conversationId, {
      kind: fact.kind,
      content,
      confidence: fact.confidence * 100,
    });
    storedFacts.push(saved);
  }
  if (needSummary && extracted.summary && chunk.length > 0) {
    const fromCreatedAt = chunk[0]?.createdAt ?? coveredUntil;
    const toCreatedAt = chunk[chunk.length - 1]?.createdAt ?? fromCreatedAt;
    await insertSummary(db, vendorId, conversationId, extracted.summary, fromCreatedAt, toCreatedAt);
  }
  if (extracted.anchor) await saveAnchor(db, vendorId, conversationId, extracted.anchor);
  await syncConversationStage(db, vendorId, conversationId);
}

export async function staffOwnsPhoto(db: AppDatabase, vendorId: string, staffId: string): Promise<boolean> {
  const person = await getStaff(db, vendorId, staffId);
  return Boolean(person?.photoPath);
}
