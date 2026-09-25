import type { AppDatabase } from "../db/client";
import { getShopProfile, listServices, listShifts, listStaff, parseHours, emptyHours } from "../repositories/catalog";
import { getConversation } from "../repositories/conversations";
import { getAnchor, getCustomerProfile, listInjectFacts, listRecentSummaries } from "../repositories/memory";
import type { FactKind } from "../shop-types";
import { composeSystemPrompt, type ShopPromptInput } from "./prompt";

const FACT_KINDS = new Set<FactKind>(["name", "phone", "preference", "intent"]);

export async function loadSystemPrompt(
  db: AppDatabase,
  vendorId: string,
  conversationId: string,
): Promise<string> {
  const [profile, serviceRows, staffRows, shiftRows, conversation, customer, facts, summaries, anchor] = await Promise.all([
    getShopProfile(db, vendorId),
    listServices(db, vendorId),
    listStaff(db, vendorId),
    listShifts(db, vendorId),
    getConversation(db, vendorId, conversationId),
    getCustomerProfile(db, vendorId, conversationId),
    listInjectFacts(db, vendorId, conversationId),
    listRecentSummaries(db, vendorId, conversationId),
    getAnchor(db, vendorId, conversationId),
  ]);
  const confirmedFact = [...facts].reverse().find((fact) => fact.kind === "name")?.content ?? "";
  const confirmedName = customer?.displayName?.trim() || confirmedFact;
  const machinePhone = [...facts].reverse().find((fact) => fact.kind === "phone")?.content ?? "";
  const input: ShopPromptInput = {
    name: profile?.name ?? "Quán massage",
    tagline: profile?.tagline ?? "",
    address: profile?.address ?? "",
    directions: profile?.directions ?? "",
    hotline: profile?.hotline ?? "",
    hours: profile ? parseHours(profile.hoursJson) : emptyHours(),
    intro: profile?.intro ?? "",
    amenities: profile?.amenities ?? "",
    policyBooking: profile?.policyBooking ?? "",
    policyCancel: profile?.policyCancel ?? "",
    policyLate: profile?.policyLate ?? "",
    policyNewGuest: profile?.policyNewGuest ?? "",
    voice: profile?.voice ?? "",
    forbidden: profile?.forbidden ?? "",
    services: serviceRows,
    staff: staffRows.map((person) => ({
      id: person.id,
      name: person.name,
      gender: person.gender,
      specialties: person.specialties,
      yearsExperience: person.yearsExperience,
      bio: person.bio,
      active: person.active,
      hasPhoto: Boolean(person.photoPath),
      shifts: shiftRows.filter((shift) => shift.staffId === person.id),
    })),
    customerName: confirmedName,
    zaloName: conversation?.title ?? "",
    nameConfirmed: confirmedName !== "",
    customerPhone: customer?.phone?.trim() || machinePhone,
    notes: customer?.notes ?? "",
    facts: facts.flatMap((fact) => {
      if (!FACT_KINDS.has(fact.kind as FactKind)) return [];
      if (fact.kind === "name" && customer?.displayName?.trim()) return [];
      if (fact.kind === "phone" && customer?.phone?.trim()) return [];
      return [{ kind: fact.kind as FactKind, content: fact.content }];
    }),
    summaries: summaries.map((summary) => ({ body: summary.body })),
    anchor: anchor
      ? {
          serviceName: anchor.serviceName,
          staffName: anchor.staffName,
          whenText: anchor.whenText,
          missing: anchor.missing,
        }
      : null,
  };
  return composeSystemPrompt(input);
}
