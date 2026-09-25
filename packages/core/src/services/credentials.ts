import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ZaloCredentials } from "../types";

function isCredentials(value: unknown): value is ZaloCredentials {
  if (typeof value !== "object" || value === null) return false;
  if (!("imei" in value) || typeof value.imei !== "string" || value.imei.trim() === "") return false;
  if (!("userAgent" in value) || typeof value.userAgent !== "string" || value.userAgent === "") {
    return false;
  }
  if (!("cookie" in value) || value.cookie == null) return false;
  return true;
}

export function readCredentials(filePath: string): ZaloCredentials | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    return isCredentials(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCredentials(filePath: string, credentials: ZaloCredentials): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(credentials), { encoding: "utf8", mode: 0o600 });
}

export function clearCredentials(filePath: string): void {
  rmSync(filePath, { force: true });
}
