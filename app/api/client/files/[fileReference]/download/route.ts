import type { NextRequest } from "next/server";
import { apiError } from "@/lib/api/response";
import {
  assertFullClientAccess,
  verifyClientSessionFromRequest
} from "@/lib/auth";
import {
  getClientDeliverablesProvider
} from "@/lib/client/providers";
import { identityFromSession } from "@/lib/client/portal-data";
import { assertSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileReference: string }> }
) {
  try {
    assertSameOrigin(request);
    const session = await verifyClientSessionFromRequest(request);
    assertFullClientAccess(session);
    const { fileReference } = await params;
    const result = await getClientDeliverablesProvider().createDownload(
      identityFromSession(session),
      decodeURIComponent(fileReference)
    );
    return Response.json(
      { ok: true, data: result },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}
