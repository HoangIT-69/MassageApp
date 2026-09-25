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
