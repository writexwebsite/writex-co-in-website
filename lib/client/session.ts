import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getClientCookieName,
  verifySignedSessionToken,
  type ClientSession
} from "@/lib/auth";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export async function getClientSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getClientCookieName())?.value;
  const session = verifySignedSessionToken<ClientSession>(token);

  if (!session || session.kind !== "client") return null;

  if (isDatabaseConfigured() && session.sessionId) {
    const result = await dbQuery<{ id: string }>(
      `
        select id
        from client_sessions
        where id = $1
          and session_token_hash = $2
          and expires_at > now()
        limit 1
      `,
      [session.sessionId, session.tokenHash]
    );

    if (!result.rows[0]) return null;
  }

  return session;
}

export async function requireClientSession() {
  const session = await getClientSessionFromCookies();
  if (!session) redirect("/client-login");
  return session;
}
