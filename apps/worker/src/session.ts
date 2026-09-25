import {
  CloseReason,
  LoginQRCallbackEventType,
  ThreadType,
  Zalo,
  type API,
  type LoginQRCallbackEvent,
} from "zca-js";
import {
  clearCredentials,
  completeOutboxSend,
  createDeepInfraClient,
  ingestInbound,
  openDatabase,
  readCredentials,
  readRelink,
  setAwaitingQr,
  setZaloConnected,
  takeOutbox,
  toQrDataUrl,
  writeCredentials,
  type AiClient,
  type AppDatabase,
  type ZaloCredentials,
} from "@zalo/core";
import { ZALO_USER_AGENT, type WorkerEnv } from "./config";
import { toInbound } from "./map-message";

const OUTBOX_POLL_MS = 1000;

function cookieJar(value: unknown): unknown {
  if (typeof value === "object" && value !== null && "cookies" in value) return value.cookies;
  return value;
}

function displayNameFrom(value: unknown): string {
  if (typeof value !== "object" || value === null) return "Zalo";
  const root = value as { profile?: unknown; displayName?: unknown; zaloName?: unknown };
  const profile = typeof root.profile === "object" && root.profile ? root.profile : root;
  if (typeof profile !== "object" || profile === null) return "Zalo";
  const named = profile as { displayName?: unknown; zaloName?: unknown };
  if (typeof named.displayName === "string" && named.displayName.trim()) return named.displayName;
  if (typeof named.zaloName === "string" && named.zaloName.trim()) return named.zaloName;
  return "Zalo";
}

function saveSession(filePath: string, api: API): void {
  const context = api.getContext();
  writeCredentials(filePath, {
    imei: context.imei,
    userAgent: context.userAgent,
    language: context.language,
    cookie: cookieJar(api.getCookie().toJSON()),
  });
}

async function connect(env: WorkerEnv, db: AppDatabase): Promise<API> {
  const zalo = new Zalo({ logging: false, selfListen: true });
  const saved = readCredentials(env.credentialsPath);
  if (saved) {
    const api = await zalo.login(saved as Parameters<Zalo["login"]>[0]);
    saveSession(env.credentialsPath, api);
    return api;
  }
  const api = await zalo.loginQR({ userAgent: ZALO_USER_AGENT }, (event) => {
    rememberQr(env, db, event);
  });
  saveSession(env.credentialsPath, api);
  return api;
}

function rememberQr(env: WorkerEnv, db: AppDatabase, event: LoginQRCallbackEvent): void {
  if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
    setAwaitingQr(db, env.vendorId, toQrDataUrl(event.data.image));
    console.info("Đã tạo mã QR. Quét bằng ứng dụng Zalo.");
    return;
  }
  if (event.type === LoginQRCallbackEventType.QRCodeExpired) {
    event.actions.retry();
    return;
  }
  if (event.type === LoginQRCallbackEventType.GotLoginInfo) {
    const credentials: ZaloCredentials = {
      imei: event.data.imei,
      userAgent: event.data.userAgent,
      cookie: event.data.cookie,
    };
    writeCredentials(env.credentialsPath, credentials);
  }
}

function stopListener(api: API): void {
  try {
    api.listener.stop();
  } catch (error) {
    console.error(error instanceof Error ? error.name : "stop failed");
  }
}

function attachListener(api: API, db: AppDatabase, env: WorkerEnv, ai: AiClient): void {
  api.listener.on("message", (message) => {
    void ingestInbound(db, env.vendorId, toInbound(message), ai).catch((error: unknown) => {
      console.error(error instanceof Error ? error.name : "inbound failed");
    });
  });
  api.listener.on("closed", (code) => {
    if (code === CloseReason.DuplicateConnection) {
      console.error("Listener dừng vì Zalo Web hoặc Zalo PC đang mở cùng tài khoản.");
    }
  });
  api.listener.start({ retryOnClose: true });
  console.info("Đã kết nối Zalo. Đang nghe tin nhắn.");
}

function watchOutbox(api: API, db: AppDatabase, env: WorkerEnv, seenRelink: number): () => void {
  let flushing = false;
  const timer = setInterval(() => {
    if (flushing || readRelink(db, env.vendorId) !== seenRelink) return;
    flushing = true;
    void flushOutbox(api, db, env.vendorId).finally(() => {
      flushing = false;
    });
  }, OUTBOX_POLL_MS);
  timer.unref?.();
  return () => clearInterval(timer);
}

function waitForRelink(db: AppDatabase, vendorId: string, seenRelink: number, api: API): Promise<number> {
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      const current = readRelink(db, vendorId);
      if (current === seenRelink) return;
      clearInterval(timer);
      stopListener(api);
      resolve(current);
    }, OUTBOX_POLL_MS);
    timer.unref?.();
  });
}

async function holdSession(
  api: API,
  db: AppDatabase,
  env: WorkerEnv,
  ai: AiClient,
  seenRelink: number,
): Promise<number> {
  const profile = await api.fetchAccountInfo().catch(() => null);
  if (readRelink(db, env.vendorId) !== seenRelink) {
    stopListener(api);
    return readRelink(db, env.vendorId);
  }
  setZaloConnected(db, env.vendorId, displayNameFrom(profile));
  attachListener(api, db, env, ai);
  const stopFlush = watchOutbox(api, db, env, seenRelink);
  const nextRelink = await waitForRelink(db, env.vendorId, seenRelink, api);
  stopFlush();
  return nextRelink;
}

export async function startWorker(env: WorkerEnv): Promise<void> {
  const db = openDatabase(env.databasePath);
  const ai = createDeepInfraClient({ apiKey: env.deepinfraApiKey });
  let seenRelink = readRelink(db, env.vendorId);
  for (;;) {
    const api = await connect(env, db);
    const relinkNow = readRelink(db, env.vendorId);
    if (relinkNow !== seenRelink) {
      seenRelink = relinkNow;
      clearCredentials(env.credentialsPath);
      continue;
    }
    seenRelink = await holdSession(api, db, env, ai, seenRelink);
    clearCredentials(env.credentialsPath);
  }
}

async function flushOutbox(api: API, db: AppDatabase, vendorId: string): Promise<void> {
  const batch = takeOutbox(db, vendorId);
  for (const item of batch) {
    const type = item.threadType === "group" ? ThreadType.Group : ThreadType.User;
    try {
      await api.sendMessage({ msg: item.content }, item.threadId, type);
      completeOutboxSend(db, vendorId, item.id, true);
    } catch (error) {
      completeOutboxSend(db, vendorId, item.id, false);
      console.error(error instanceof Error ? error.name : "send failed");
    }
  }
}
