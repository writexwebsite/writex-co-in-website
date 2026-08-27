import "server-only";

import type { ClientSession } from "@/lib/auth";
import { hashValue, randomToken } from "@/lib/security";
import { isMyWritexDevFixtureEnabled } from "@/lib/my-writex/dev-fixture";

type DevelopmentSessionRecord = {
  session: ClientSession;
  absoluteExpiresAt: number;
  idleExpiresAt: number;
  revokedAt?: number;
};

declare global {
  var __myWritexDevelopmentSessions:
    | Map<string, DevelopmentSessionRecord>
    | undefined;
}

function store() {
  if (!globalThis.__myWritexDevelopmentSessions) {
    globalThis.__myWritexDevelopmentSessions = new Map();
  }
  return globalThis.__myWritexDevelopmentSessions;
}

function assertEnabled() {
  if (!isMyWritexDevFixtureEnabled()) {
    throw new Error("My WriteX development sessions are disabled.");
  }
}

export function createDevelopmentClientSession({
  session,
  maxAgeSeconds,
  idleSeconds
}: {
  session: Omit<ClientSession, "sessionId" | "tokenHash">;
  maxAgeSeconds: number;
  idleSeconds: number;
}) {
  assertEnabled();
  const sessionToken = randomToken();
  const tokenHash = hashValue(sessionToken);
  const now = Date.now();
  const sessionId = crypto.randomUUID();
  const completeSession: ClientSession = {
    ...session,
    sessionId,
    tokenHash
  };
  store().set(tokenHash, {
    session: completeSession,
    absoluteExpiresAt: now + maxAgeSeconds * 1000,
    idleExpiresAt: now + Math.min(idleSeconds, maxAgeSeconds) * 1000
  });
  return {
    sessionId,
    sessionToken,
    tokenHash,
    expiresAt: new Date(now + maxAgeSeconds * 1000)
  };
}

export function getDevelopmentClientSession(
  token: string | undefined,
  idleSeconds: number
) {
  if (!token || !isMyWritexDevFixtureEnabled()) return null;
  const record = store().get(hashValue(token));
  const now = Date.now();
  if (
    !record ||
    record.revokedAt ||
    record.absoluteExpiresAt <= now ||
    record.idleExpiresAt <= now
  ) {
    return null;
  }
  record.idleExpiresAt = Math.min(
    record.absoluteExpiresAt,
    now + idleSeconds * 1000
  );
  return record.session;
}

export function revokeDevelopmentClientSession(token: string | undefined) {
  if (!token || !isMyWritexDevFixtureEnabled()) return false;
  const record = store().get(hashValue(token));
  if (!record) return false;
  record.revokedAt = Date.now();
  return true;
}

export function rotateDevelopmentClientSession(token: string | undefined) {
  if (!token || !isMyWritexDevFixtureEnabled()) return null;
  const oldHash = hashValue(token);
  const record = store().get(oldHash);
  if (!record || record.revokedAt || record.absoluteExpiresAt <= Date.now()) {
    return null;
  }
  const nextToken = randomToken();
  const nextHash = hashValue(nextToken);
  store().delete(oldHash);
  record.session = { ...record.session, tokenHash: nextHash };
  store().set(nextHash, record);
  return nextToken;
}

export function clearDevelopmentClientSessionsForTests() {
  if (process.env.NODE_ENV !== "production") store().clear();
}
