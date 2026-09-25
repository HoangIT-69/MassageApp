export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000";

export const POLL_INTERVAL_MS = 2000;

export const AI_PENDING_MS = 30_000;

export type Conversation = {
  id: string;
  title: string;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: number | null;
  aiEnabled: boolean;
  threadType: string;
};

export type ChatMessage = {
  id: string;
  direction: "in" | "out";
  source: "zalo" | "operator" | "ai";
  content: string;
  status: "received" | "queued" | "sent" | "failed";
  createdAt: number;
};

export type ZaloStatus = {
  status: "disconnected" | "awaiting_qr" | "connected";
  displayName: string | null;
  aiAll: boolean;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ErrorBody = { error?: string };

export async function api<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Không kết nối được máy chủ", 0);
  }
  const payload = (await response.json().catch(() => ({}))) as T & ErrorBody;
  if (!response.ok) {
    throw new ApiError(payload.error ?? "Lỗi máy chủ", response.status);
  }
  return payload;
}

export async function apiUpload<T>(path: string, token: string, file: { uri: string; name: string; type: string }): Promise<T> {
  const body = new FormData();
  // React Native FormData nhận mô tả file {uri,name,type}, không phải Blob trình duyệt.
  body.append("file", file as unknown as Blob);
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { method: "POST", headers, body });
  } catch {
    throw new ApiError("Không kết nối được máy chủ", 0);
  }
  const payload = (await response.json().catch(() => ({}))) as T & ErrorBody;
  if (!response.ok) throw new ApiError(payload.error ?? "Lỗi máy chủ", response.status);
  return payload;
}

export async function apiImage(path: string, token: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { Accept: "image/*", Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Không kết nối được máy chủ", 0);
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ErrorBody;
    throw new ApiError(payload.error ?? "Lỗi máy chủ", response.status);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const type = response.headers.get("Content-Type") ?? "image/jpeg";
  return `data:${type};base64,${bytesToBase64(bytes)}`;
}

const BASE64_CHUNK = 8192;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + BASE64_CHUNK));
  }
  return btoa(binary);
}
