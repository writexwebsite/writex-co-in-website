import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { verifyCustomerClientSessionFromRequest } from "@/lib/auth";
import { cancelRequest, discardDraft, findRequest, requestOwnerFromSession, toRequestView } from "@/lib/my-writex/request-repository";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ requestRef: string }> }) {
  try {
    const session = await verifyCustomerClientSessionFromRequest(request);
    const record = await findRequest(requestOwnerFromSession(session), (await params).requestRef);
    if (!record) return new Response("Not found", { status: 404 });
    return apiOk({ request: toRequestView(record) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ requestRef: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await verifyCustomerClientSessionFromRequest(request);
    const context = getRequestContext(request);
    assertRateLimit({ key: `my-writex-cancel:${session.sessionId || session.tokenHash}:${context.ipAddress}`, limit: 20, windowSeconds: 60 * 60 });
    const body = await request.json() as { operation?: unknown };
    if (body.operation !== "cancel") return new Response("Bad request", { status: 400 });
    const record = await cancelRequest(requestOwnerFromSession(session), (await params).requestRef);
    if (!record) return new Response("Not found", { status: 404 });
    return apiOk({ request: toRequestView(record) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ requestRef: string }> }) {
  try {
    assertSameOrigin(request);
    const session = await verifyCustomerClientSessionFromRequest(request);
    const context = getRequestContext(request);
    assertRateLimit({ key: `my-writex-discard:${session.sessionId || session.tokenHash}:${context.ipAddress}`, limit: 60, windowSeconds: 60 * 60 });
    const discarded = await discardDraft(requestOwnerFromSession(session), (await params).requestRef);
    return discarded ? apiOk({ discarded: true }) : new Response("Not found", { status: 404 });
  } catch (error) { return apiError(error); }
}
