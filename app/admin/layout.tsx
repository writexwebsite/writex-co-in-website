import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminSessionFromCookies } from "@/lib/admin/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-writex-pathname") || "";
  const session = await getAdminSessionFromCookies();
  const hiringOnly = session?.role !== "super_admin" && Boolean(session?.hiringRole);
  const allowedHiringPath =
    pathname.startsWith("/admin/hiring") ||
    pathname === "/admin/change-password" ||
    pathname === "/admin/login";

  if (hiringOnly && !allowedHiringPath) {
    redirect("/admin/hiring");
  }

  return children;
}
