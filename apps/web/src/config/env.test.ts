import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getEnv, loadRootEnv } from "./env";

const BASE_ENV: Record<string, string> = {
  APP_PASSWORD: "pw",
  DATABASE_URL: "mysql://user:pass@127.0.0.1:3306/db",
  ZALO_CREDENTIALS_PATH: "data/zalo-credentials.json",
  MINIO_ENDPOINT: "127.0.0.1:9000",
  MINIO_ACCESS_KEY: "key",
  MINIO_SECRET_KEY: "secret",
  MINIO_BUCKET: "bucket",
};

const FACEBOOK_ENV: Record<string, string> = {
  FB_PAGE_ID: " page-1 ",
  FB_PAGE_ACCESS_TOKEN: "page-token",
  FB_APP_SECRET: "app-secret",
  FB_VERIFY_TOKEN: "verify-me",
};

// Nạp .env.local một lần trước, để các stub bên dưới không bị override: true ghi đè.
beforeAll(() => {
  loadRootEnv();
});

beforeEach(() => {
  for (const [name, value] of Object.entries({ ...BASE_ENV, ...FACEBOOK_ENV })) {
    vi.stubEnv(name, value);
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("facebook config", () => {
  it("is enabled and trimmed when all four variables are set", () => {
    expect(getEnv().facebook).toEqual({
      pageId: "page-1",
      pageAccessToken: "page-token",
      appSecret: "app-secret",
      verifyToken: "verify-me",
    });
  });

  it.each(Object.keys(FACEBOOK_ENV))("stays disabled when %s is missing", (name) => {
    vi.stubEnv(name, "  ");
    expect(getEnv().facebook).toBeNull();
  });

  it("does not stop the app from booting when facebook is absent", () => {
    for (const name of Object.keys(FACEBOOK_ENV)) vi.stubEnv(name, "");
    const env = getEnv();
    expect(env.facebook).toBeNull();
    expect(env.databaseUrl).toBe(BASE_ENV.DATABASE_URL);
  });
});
