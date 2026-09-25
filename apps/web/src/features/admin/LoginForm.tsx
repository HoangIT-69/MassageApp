"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, inputClass, saveToken } from "./client";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || typeof body !== "object" || body === null || !("token" in body)) {
        setError("Sai mật khẩu");
        return;
      }
      saveToken(String(body.token));
      router.replace("/admin/quan");
    } catch {
      setError("Không đăng nhập được");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Đăng nhập admin</h1>
        <p className="mt-2 text-sm text-zinc-600">Hồ sơ quán, nhân viên, khách và đơn đặt lịch.</p>
      </div>
      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Mật khẩu
          <input
            className={inputClass}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button className={buttonClass} type="submit" disabled={pending}>
          {pending ? "Đang vào..." : "Vào admin"}
        </button>
      </form>
    </main>
  );
}
