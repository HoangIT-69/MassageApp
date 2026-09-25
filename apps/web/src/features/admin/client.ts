export const TOKEN_KEY = "zalo-admin-token";

export const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900";

export const buttonClass =
  "rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900";

export const quietButtonClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900";

export function readToken(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function saveToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${readToken()}`);
  const response = await fetch(path, { ...init, headers });
  if (response.status === 401) {
    window.location.assign("/admin/login");
    throw new Error("Chưa đăng nhập");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body === "object" && body && "error" in body ? String(body.error) : "Không thực hiện được";
    throw new Error(message);
  }
  return body as T;
}
