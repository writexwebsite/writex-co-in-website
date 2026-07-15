import { apiOk } from "@/lib/api/response";
import { clearClientSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const response = apiOk({ loggedOut: true });
  clearClientSessionCookie(response);

  return response;
}
