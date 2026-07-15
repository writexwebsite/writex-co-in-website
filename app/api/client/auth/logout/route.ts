import { apiOk } from "@/lib/api/response";
import { clearClientSessionCookie } from "@/lib/auth";
export async function POST() { const response = apiOk({ loggedOut: true }); clearClientSessionCookie(response); return response; }
