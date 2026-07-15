import { NextResponse } from "next/server";
import { apiOk } from "@/lib/api/response";
import { isDemoServerEnabled } from "@/lib/demo/config";
import { clearDemoCookies } from "@/lib/demo/session";

export async function POST() {
  if (!isDemoServerEnabled()) return NextResponse.json({ ok: false }, { status: 404 });
  const response = apiOk({ loggedOut: true, isDemo: true });
  clearDemoCookies(response);
  return response;
}
