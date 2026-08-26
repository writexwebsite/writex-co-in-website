import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertCanManageClientPortal } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { revokeClientPortalSession } from "@/lib/client/admin-operations";
import { assertSameOrigin, parseJson } from "@/lib/security";

const schema = z.object({
  reason: z.string().trim().min(10).max(500)
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    assertCanManageClientPortal(admin);
    const body = await parseJson(request, schema);
    const { sessionId } = await params;
    if (!z.string().uuid().safeParse(sessionId).success) {
      throw badRequest("Invalid session.");
    }
    await revokeClientPortalSession(sessionId, body.reason);
    return apiOk({ revoked: true });
  } catch (error) {
    return apiError(error);
  }
}
