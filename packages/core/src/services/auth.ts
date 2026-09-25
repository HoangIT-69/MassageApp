import type { AppDatabase } from "../db/client";
import { createSession, secretsMatch } from "../repositories/sessions";

export async function loginOperator(
  db: AppDatabase,
  vendorId: string,
  password: string,
  expectedPassword: string,
): Promise<{ token: string } | null> {
  if (!secretsMatch(password, expectedPassword)) return null;
  return createSession(db, vendorId);
}
