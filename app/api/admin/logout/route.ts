import type { NextRequest } from "next/server";
import { apiOk } from "@/lib/api/response";
import { clearSessionCookie, getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let session: ReturnType<typeof getAdminSessionFromRequest> | null = null;
  try {
    session = getAdminSessionFromRequest(request);
  } catch {
    session = null;
  }
  const response = apiOk({ loggedOut: true });
  clearSessionCookie(response);
  if (session) {
    await logAuditEvent({
      actorType: "admin",
      actorId: session.adminUserId,
      actorEmail: session.email,
      entityType: "admin_session",
      action: "admin_logout",
      request
    });
  }

  return response;
}
