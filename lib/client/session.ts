import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  assertCustomerClientSession,
  assertInvoiceClientSession,
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

export async function requireInvoiceClientSession() {
  const session = await requireClientSession();
  if (session.authScope !== "invoice") redirect("/my-writex");
  return assertInvoiceClientSession(session);
}

export async function requireCustomerClientSession() {
  const session = await requireClientSession();
  if (session.authScope !== "customer") redirect("/client/overview");
  return assertCustomerClientSession(session);
}
