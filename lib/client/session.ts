import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getClientCookieName,
  getClientSessionFromOpaqueToken
} from "@/lib/auth";

export async function getClientSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getClientCookieName())?.value;
  return getClientSessionFromOpaqueToken(token);
}

export async function requireClientSession() {
  const session = await getClientSessionFromCookies();
  if (!session) redirect("/client-login");
  return session;
}
