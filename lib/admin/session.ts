import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getAuthCookieName,
  verifySignedSessionToken,
  type AdminSession
} from "@/lib/auth";
import { ApiError } from "@/lib/api/response";
import { enrichAdminSessionWithHiringAccess } from "@/lib/hiring/access";

export async function getAdminSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  const session = verifySignedSessionToken<AdminSession>(token);

  if (!session || session.kind !== "admin") {
    return null;
  }

  try {
    return await enrichAdminSessionWithHiringAccess(session);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
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
