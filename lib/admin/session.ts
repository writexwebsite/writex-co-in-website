import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getAuthCookieName,
  verifySignedSessionToken,
  type AdminSession
} from "@/lib/auth";
import { enrichAdminSessionWithHiringAccess } from "@/lib/hiring/access";

export async function getAdminSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  const session = verifySignedSessionToken<AdminSession>(token);

  if (!session || session.kind !== "admin") {
    return null;
  }

  return enrichAdminSessionWithHiringAccess(session);
}

export async function requireAdminSession() {
  const session = await getAdminSessionFromCookies();

  if (!session) {
    redirect("/admin/login");
  }

  if (session.mustChangePassword) {
    redirect("/admin/change-password");
  }

  return session;
}
