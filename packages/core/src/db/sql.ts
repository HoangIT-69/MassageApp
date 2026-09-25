export function affectedRows(result: unknown): number {
  if (Array.isArray(result)) return affectedRows(result[0]);
  if (typeof result !== "object" || result === null || !("affectedRows" in result)) return 0;
  const value = result.affectedRows;
  return typeof value === "number" ? value : Number(value) || 0;
}

export function isUniqueConstraint(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (typeof current === "object" && current !== null && !seen.has(current)) {
    seen.add(current);
    const record = current as { code?: unknown; errno?: unknown; cause?: unknown };
    if (record.code === "ER_DUP_ENTRY" || record.errno === 1062) return true;
    if (record.code === "SQLITE_CONSTRAINT_UNIQUE" || record.code === "SQLITE_CONSTRAINT") return true;
    current = record.cause;
  }
  return false;
}
