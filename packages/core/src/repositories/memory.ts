import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { FACT_CONFIDENCE_FLOOR, FACT_INJECT_CAP, SUMMARY_INJECT_CAP } from "../constants";
import type { AppDatabase } from "../db/client";
import { bookingAnchors, conversationSummaries, customerFacts, customerProfiles } from "../db/schema";
import type { AnchorDraft, FactKind } from "../shop-types";

export async function getCustomerProfile(db: AppDatabase, vendorId: string, conversationId: string) {
  const rows = await db
    .select()
    .from(customerProfiles)
    .where(and(eq(customerProfiles.vendorId, vendorId), eq(customerProfiles.conversationId, conversationId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listCustomerProfiles(db: AppDatabase, vendorId: string) {
  return db.select().from(customerProfiles).where(eq(customerProfiles.vendorId, vendorId));
}

export async function saveCustomerProfile(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  input: { displayName: string; phone: string; notes: string },
) {
  const current = await getCustomerProfile(db, vendorId, conversationId);
  const row = {
    id: current?.id ?? randomUUID(),
    vendorId,
    conversationId,
    displayName: input.displayName.trim().slice(0, 120) || null,
    phone: input.phone.trim().slice(0, 32) || null,
    notes: input.notes.trim().slice(0, 4000) || null,
    updatedAt: Date.now(),
  };
  await db
    .insert(customerProfiles)
    .values(row)
    .onDuplicateKeyUpdate({
      set: {
        displayName: row.displayName,
        phone: row.phone,
        notes: row.notes,
        updatedAt: row.updatedAt,
      },
    });
  return row;
}

export async function listInjectFacts(db: AppDatabase, vendorId: string, conversationId: string) {
  const rows = await db
    .select()
    .from(customerFacts)
    .where(
      and(
        eq(customerFacts.vendorId, vendorId),
        eq(customerFacts.conversationId, conversationId),
        gt(customerFacts.confidence, FACT_CONFIDENCE_FLOOR - 1),
      ),
    )
    .orderBy(desc(customerFacts.createdAt))
    .limit(FACT_INJECT_CAP);
  return rows.reverse();
}

export async function listFactsForConversation(db: AppDatabase, vendorId: string, conversationId: string) {
  return db
    .select()
    .from(customerFacts)
    .where(and(eq(customerFacts.vendorId, vendorId), eq(customerFacts.conversationId, conversationId)))
    .orderBy(asc(customerFacts.createdAt));
}

export async function insertFact(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  fact: { kind: FactKind; content: string; confidence: number },
) {
  const row = {
    id: randomUUID(),
    vendorId,
    conversationId,
    kind: fact.kind,
    content: fact.content.slice(0, 500),
    confidence: Math.max(0, Math.min(100, Math.round(fact.confidence))),
    createdAt: Date.now(),
  };
  await db.insert(customerFacts).values(row);
  return row;
}

export async function listRecentSummaries(db: AppDatabase, vendorId: string, conversationId: string) {
  const rows = await db
    .select()
    .from(conversationSummaries)
    .where(and(eq(conversationSummaries.vendorId, vendorId), eq(conversationSummaries.conversationId, conversationId)))
    .orderBy(desc(conversationSummaries.createdAt))
    .limit(SUMMARY_INJECT_CAP);
  return rows.reverse();
}

export async function latestSummaryEnd(db: AppDatabase, vendorId: string, conversationId: string) {
  const rows = await db
    .select()
    .from(conversationSummaries)
    .where(and(eq(conversationSummaries.vendorId, vendorId), eq(conversationSummaries.conversationId, conversationId)))
    .orderBy(desc(conversationSummaries.toCreatedAt))
    .limit(1);
  return rows[0]?.toCreatedAt ?? 0;
}

export async function insertSummary(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  body: string,
  fromCreatedAt: number,
  toCreatedAt: number,
) {
  const row = {
    id: randomUUID(),
    vendorId,
    conversationId,
    body: body.slice(0, 4000),
    fromCreatedAt,
    toCreatedAt,
    createdAt: Date.now(),
  };
  await db.insert(conversationSummaries).values(row);
  return row;
}

export async function getAnchor(db: AppDatabase, vendorId: string, conversationId: string) {
  const rows = await db
    .select()
    .from(bookingAnchors)
    .where(and(eq(bookingAnchors.vendorId, vendorId), eq(bookingAnchors.conversationId, conversationId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteConversationMemory(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
): Promise<void> {
  const facts = and(eq(customerFacts.vendorId, vendorId), eq(customerFacts.conversationId, conversationId));
  const summaries = and(
    eq(conversationSummaries.vendorId, vendorId),
    eq(conversationSummaries.conversationId, conversationId),
  );
  const anchor = and(eq(bookingAnchors.vendorId, vendorId), eq(bookingAnchors.conversationId, conversationId));
  await db.delete(customerFacts).where(facts);
  await db.delete(conversationSummaries).where(summaries);
  await db.delete(bookingAnchors).where(anchor);
}

export async function saveAnchor(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
  anchor: AnchorDraft,
) {
  const row = {
    vendorId,
    conversationId,
    serviceName: anchor.serviceName.slice(0, 120),
    staffName: anchor.staffName.slice(0, 120),
    whenText: anchor.whenText.slice(0, 120),
    missing: anchor.missing.slice(0, 255),
    updatedAt: Date.now(),
  };
  await db
    .insert(bookingAnchors)
    .values(row)
    .onDuplicateKeyUpdate({
      set: {
        serviceName: row.serviceName,
        staffName: row.staffName,
        whenText: row.whenText,
        missing: row.missing,
        updatedAt: row.updatedAt,
      },
    });
  return row;
}
