import type { NextRequest } from "next/server";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { verifyCustomerClientSessionFromRequest } from "@/lib/auth";
import { safeNoteBody } from "@/lib/my-writex/request-api";
import { requestOwnerFromSession, respondToInformationRequest, toRequestView } from "@/lib/my-writex/request-repository";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";

export async function POST(request: NextRequest, { params }: { params: Promise<{ requestRef: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await verifyCustomerClientSessionFromRequest(request);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `my-writex-response:${session.sessionId || session.tokenHash}:${context.ipAddress}`,
      limit: 30,
      windowSeconds: 60 * 60,
    });
    const body = await request.json() as { response?: unknown };
    const response = safeNoteBody(body.response);
    if (response.length < 4) throw badRequest("Add a little more information before sending.");
    const record = await respondToInformationRequest(requestOwnerFromSession(session), (await params).requestRef, response);
    if (!record) return new Response("Not found", { status: 404 });
    return apiOk({ request: toRequestView(record) });
  } catch (error) { return apiError(error); }
}
