import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import type { ObjectStoreConfig } from "@zalo/core";

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
  databaseUrl: string;
  dataDir: string;
  credentialsPath: string;
  vendorId: string;
  deepinfraApiKey: string;
  objectStore: ObjectStoreConfig;
};

function objectStoreFromEnv(): ObjectStoreConfig {
  const endpoint = required("MINIO_ENDPOINT");
  const useSSL = process.env.MINIO_USE_SSL === "true";
  const [host, portText] = endpoint.split(":");
  const port = Number(portText || (useSSL ? 443 : 9000));
  if (!host || !Number.isInteger(port) || port < 1) throw new Error("MINIO_ENDPOINT không hợp lệ");
  return {
    endPoint: host,
    port,
    useSSL,
    accessKey: required("MINIO_ACCESS_KEY"),
    secretKey: required("MINIO_SECRET_KEY"),
    bucket: required("MINIO_BUCKET"),
  };
}

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
    databaseUrl: required("DATABASE_URL"),
    dataDir: path.join(root, "data"),
    credentialsPath: path.resolve(root, required("ZALO_CREDENTIALS_PATH")),
    vendorId: process.env.VENDOR_ID?.trim() || "local",
    deepinfraApiKey: process.env.DEEPINFRA_API_KEY?.trim() ?? "",
    objectStore: objectStoreFromEnv(),
  };
}
