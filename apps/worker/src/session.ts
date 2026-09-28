import {
  CloseReason,
  LoginQRCallbackEventType,
  Zalo,
  type API,
  type LoginQRCallbackEvent,
} from "zca-js";
import {
  clearCredentials,
  createDeepInfraClient,
  ensureShopSeed,
  ingestInbound,
  openDatabase,
  readCredentials,
  readRelink,
  setAwaitingQr,
  setZaloConnected,
  toQrDataUrl,
  writeCredentials,
  type AiClient,
  type AppDatabase,
  type ZaloCredentials,
} from "@zalo/core";
import { ZALO_USER_AGENT, type WorkerEnv } from "./config";
import { toInbound } from "./map-message";
import { startOutboxLoop, type SenderRegistry } from "./outbox";
import { enrichInbound } from "./peer";
import { createFacebookSender } from "./senders/facebook";
import { createZaloSender } from "./senders/zalo";

const RELINK_POLL_MS = 1000;

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
    void setAwaitingQr(db, env.vendorId, toQrDataUrl(event.data.image))
      .then(() => {
        console.info("Đã tạo mã QR. Quét bằng ứng dụng Zalo.");
      })
      .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : "Không lưu được mã QR");
      });
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
    void enrichInbound(api, db, env.vendorId, toInbound(message))
      .then((input) => ingestInbound(db, env.vendorId, input, ai))
      .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : "inbound failed");
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

function waitForRelink(db: AppDatabase, vendorId: string, seenRelink: number, api: API): Promise<number> {
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      void readRelink(db, vendorId).then((current) => {
        if (current === seenRelink) return;
        clearInterval(timer);
        stopListener(api);
        resolve(current);
      });
    }, RELINK_POLL_MS);
    timer.unref?.();
  });
}

async function holdSession(
  api: API,
  db: AppDatabase,
  env: WorkerEnv,
  ai: AiClient,
  seenRelink: number,
  senders: SenderRegistry,
): Promise<number> {
  const profile = await api.fetchAccountInfo().catch(() => null);
  if ((await readRelink(db, env.vendorId)) !== seenRelink) {
    stopListener(api);
    return readRelink(db, env.vendorId);
  }
  await setZaloConnected(db, env.vendorId, displayNameFrom(profile));
  attachListener(api, db, env, ai);
  senders.add(createZaloSender(api, env));
  try {
    return await waitForRelink(db, env.vendorId, seenRelink, api);
  } finally {
    senders.remove("zalo");
  }
}

export async function startWorker(env: WorkerEnv): Promise<void> {
  const db = await openDatabase(env.databaseUrl);
  await ensureShopSeed(db, env.vendorId);
  const ai = createDeepInfraClient({ apiKey: env.deepinfraApiKey });
  // Bật hàng chờ gửi trước vòng lặp Zalo: connect() chặn cho đến khi quét QR xong,
  // nếu để sau thì Facebook không gửi được gì khi Zalo chưa liên kết.
  const senders = startOutboxLoop(db, env);
  if (env.facebookPageAccessToken) {
    senders.add(createFacebookSender(env.facebookPageAccessToken));
    console.info("Đã bật kênh Facebook.");
  }
  let seenRelink = await readRelink(db, env.vendorId);
  for (;;) {
    const api = await connect(env, db);
    const relinkNow = await readRelink(db, env.vendorId);
    if (relinkNow !== seenRelink) {
      seenRelink = relinkNow;
      clearCredentials(env.credentialsPath);
      continue;
    }
    seenRelink = await holdSession(api, db, env, ai, seenRelink, senders);
    clearCredentials(env.credentialsPath);
  }
}
