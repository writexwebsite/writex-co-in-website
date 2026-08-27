import type { NextRequest } from "next/server";
import { apiOk } from "@/lib/api/response";
import {
  clearClientSessionCookie,
  getClientCookieName,
  revokeClientSessionToken
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  await revokeClientSessionToken(
    request.cookies.get(getClientCookieName())?.value
  );
  const response = apiOk({ loggedOut: true });
  clearClientSessionCookie(response);

  return response;
}
