import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin/AdminShell";

export default function AdminDeskLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
