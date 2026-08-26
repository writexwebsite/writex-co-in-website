import "server-only";

import { createHash } from "crypto";
import type { NextRequest } from "next/server";

type SubmissionRecord<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const globalForSubmissions = globalThis as typeof globalThis & {
  writexSubmissionRecords?: Map<string, SubmissionRecord<unknown>>;
};

const submissionRecords =
  globalForSubmissions.writexSubmissionRecords ??
  new Map<string, SubmissionRecord<unknown>>();

globalForSubmissions.writexSubmissionRecords = submissionRecords;

function pruneExpired(now: number) {
  for (const [key, record] of submissionRecords) {
    if (record.expiresAt <= now) submissionRecords.delete(key);
  }
}

export function getSubmissionKey(
  request: NextRequest,
  scope: string,
  payload: unknown
) {
  const supplied = request.headers.get("idempotency-key")?.trim();
  const source = supplied && /^[A-Za-z0-9_-]{16,128}$/.test(supplied)
    ? supplied
    : createHash("sha256").update(JSON.stringify(payload)).digest("hex");

  return `${scope}:${source}`;
}

export async function runSubmissionOnce<T>({
  key,
  task,
  ttlMs = 10 * 60 * 1000
}: {
  key: string;
  task: () => Promise<T>;
  ttlMs?: number;
}) {
  const now = Date.now();
  pruneExpired(now);

  const existing = submissionRecords.get(key) as SubmissionRecord<T> | undefined;
  if (existing) {
    return { value: await existing.promise, replayed: true };
  }

  const promise = task();
  submissionRecords.set(key, { expiresAt: now + ttlMs, promise });

  try {
    return { value: await promise, replayed: false };
  } catch (error) {
    submissionRecords.delete(key);
    throw error;
  }
}
