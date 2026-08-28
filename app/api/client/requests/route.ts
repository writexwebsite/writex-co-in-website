import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { verifyInvoiceClientSessionFromRequest } from "@/lib/auth";
import { requestOperation, validatedRequestInput } from "@/lib/my-writex/request-api";
import { listRequests, requestOwnerFromSession, saveDraft, submitRequest, toRequestView } from "@/lib/my-writex/request-repository";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await verifyInvoiceClientSessionFromRequest(request);
    return apiOk({ requests: (await listRequests(requestOwnerFromSession(session))).map(toRequestView) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await verifyInvoiceClientSessionFromRequest(request);
    const raw = await request.json();
    const operation = requestOperation(raw);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `my-writex-invoice-request:${operation}:${session.sessionId || session.tokenHash}:${context.ipAddress}`,
      limit: operation === "save_draft" ? 180 : 12,
      windowSeconds: operation === "save_draft" ? 15 * 60 : 60 * 60,
    });
    const input = validatedRequestInput(session, raw, operation === "submit");
    const owner = requestOwnerFromSession(session);
    if (operation === "save_draft") return apiOk({ request: toRequestView(await saveDraft(owner, input)) }, { status: 201 });
    const result = await submitRequest(owner, input);
    return apiOk({ request: toRequestView(result.record), created: result.created }, { status: result.created ? 201 : 200 });
  } catch (error) { return apiError(error); }
}
