const STAGES = ["chao_hoi", "tu_van", "len_don", "cho_xac_nhan", "chot"] as const;

export type ChatStage = (typeof STAGES)[number];

export function samePersonName(left: string, right: string): boolean {
  const a = left.trim();
  const b = right.trim();
  if (a === "" || b === "") return false;
  return a.localeCompare(b, "vi", { sensitivity: "accent" }) === 0;
}

export function keepCustomerName(
  candidate: string,
  staffNames: string[],
  confirmedName: string,
  zaloName: string,
): string {
  const name = candidate.trim();
  if (name === "") return "";
  const staffHit = staffNames.some((staff) => samePersonName(staff, name));
  if (!staffHit) return name;
  if (samePersonName(confirmedName, name) || samePersonName(zaloName, name)) return name;
  return "";
}

export function isChatStage(value: string): value is ChatStage {
  return (STAGES as readonly string[]).includes(value);
}

export function forwardStage(current: string, target: ChatStage): ChatStage {
  const from = STAGES.indexOf(current as ChatStage);
  const to = STAGES.indexOf(target);
  if (from < 0) return target;
  return to > from ? target : STAGES[from];
}

export function suggestStage(input: {
  hasAdvice: boolean;
  hasDraft: boolean;
  bookingStatus: "cho_xac_nhan" | "da_chot" | null;
}): ChatStage {
  if (input.bookingStatus === "da_chot") return "chot";
  if (input.bookingStatus === "cho_xac_nhan") return "cho_xac_nhan";
  if (input.hasDraft) return "len_don";
  if (input.hasAdvice) return "tu_van";
  return "chao_hoi";
}
