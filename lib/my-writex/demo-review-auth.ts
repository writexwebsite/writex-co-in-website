import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { unauthorized } from "@/lib/api/response";
import { isMyWritexDemoFixtureEnabled } from "@/lib/my-writex/dev-fixture";
import { hashValue, safeCompare } from "@/lib/security";

export const MY_WRITEX_DEMO_REVIEW_COOKIE = "__Host-my_writex_demo_review";
const REVIEW_MAX_AGE_SECONDS = 2 * 60 * 60;

function reviewSessionToken() {
  return process.env.MY_WRITEX_DEMO_REVIEW_SESSION_TOKEN?.trim() || "";
}

function reviewCodeHash() {
  return process.env.MY_WRITEX_DEMO_REVIEW_CODE_HASH?.trim().toLowerCase() || "";
}

function validSessionToken(token: string | undefined) {
  const expected = reviewSessionToken();
  return Boolean(
    isMyWritexDemoFixtureEnabled() &&
      token &&
      expected.length >= 32 &&
      safeCompare(token, expected),
  );
}

export function isValidMyWritexDemoReviewCode(code: string) {
  const expectedHash = reviewCodeHash();
  return Boolean(
    isMyWritexDemoFixtureEnabled() &&
      expectedHash.length === 64 &&
      safeCompare(hashValue(code.trim()), expectedHash),
  );
}

export async function hasMyWritexDemoReviewAccessFromCookies() {
  const store = await cookies();
  return validSessionToken(store.get(MY_WRITEX_DEMO_REVIEW_COOKIE)?.value);
}

export function assertMyWritexDemoReviewAccess(request: NextRequest) {
  if (!validSessionToken(request.cookies.get(MY_WRITEX_DEMO_REVIEW_COOKIE)?.value)) {
    throw unauthorized("Demo review access is required.");
  }
}

export function setMyWritexDemoReviewCookie(response: NextResponse) {
  const token = reviewSessionToken();
  if (!isMyWritexDemoFixtureEnabled() || token.length < 32) {
    throw unauthorized("Demo review access is unavailable.");
  }
  response.cookies.set(MY_WRITEX_DEMO_REVIEW_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: REVIEW_MAX_AGE_SECONDS,
  });
}
