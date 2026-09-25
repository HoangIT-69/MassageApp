import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { operatorSessions } from "../db/schema";

const TOKEN_BYTES = 32;

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function secretsMatch(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function createSession(db: AppDatabase, vendorId: string): { token: string } {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  db.insert(operatorSessions)
    .values({
      id: randomBytes(16).toString("hex"),
      vendorId,
      tokenHash: hashSecret(token),
      createdAt: Date.now(),
    })
    .run();
  return { token };
}

export function findVendorByToken(db: AppDatabase, token: string): string | null {
  const row = db
    .select()
    .from(operatorSessions)
    .where(eq(operatorSessions.tokenHash, hashSecret(token)))
    .get();
  return row?.vendorId ?? null;
}
