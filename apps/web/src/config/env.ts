import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

const WALK_LIMIT = 8;

export function repoRoot(): string {
  let dir = process.cwd();
  for (let step = 0; step < WALK_LIMIT; step += 1) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Không thấy pnpm-workspace.yaml");
}

let loaded = false;

export function loadRootEnv(): void {
  if (loaded) return;
  const root = repoRoot();
  loadDotenv({ path: path.join(root, ".env") });
  loadDotenv({ path: path.join(root, ".env.local"), override: true });
  loaded = true;
}

export type WebEnv = {
  appPassword: string;
  databasePath: string;
  credentialsPath: string;
  vendorId: string;
  deepinfraApiKey: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Thiếu biến môi trường ${name}`);
  }
  return value.trim();
}

export function getEnv(): WebEnv {
  loadRootEnv();
  const root = repoRoot();
  return {
    appPassword: required("APP_PASSWORD"),
    databasePath: path.resolve(root, required("DATABASE_PATH")),
    credentialsPath: path.resolve(root, required("ZALO_CREDENTIALS_PATH")),
    vendorId: process.env.VENDOR_ID?.trim() || "local",
    deepinfraApiKey: process.env.DEEPINFRA_API_KEY?.trim() ?? "",
  };
}
