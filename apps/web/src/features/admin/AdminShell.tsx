"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { readToken } from "./client";

const LINKS = [
  { href: "/admin/quan", label: "Quán" },
  { href: "/admin/nhan-vien", label: "Nhân viên" },
  { href: "/admin/khach", label: "Khách" },
  { href: "/admin/don", label: "Đơn" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!readToken()) router.replace("/admin/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Admin</p>
            <h1 className="text-lg font-semibold">Sen Vàng · quán massage</h1>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Mục quản trị">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
