import type { NextRequest } from "next/server";
import { apiError, apiOk, unauthorized } from "@/lib/api/response";
import { createClientSessionRecord, createSignedSessionToken, getClientSessionMaxAgeSeconds, setClientSessionCookie } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { normalizeInvoiceId, normalizeWhatsapp } from "@/lib/client/credentials";
import { validateInvoice } from "@/lib/integrations/lts";
import { assertRateLimit, getRequestContext, hashValue, parseJson } from "@/lib/security";
import { futureClientLoginSchema } from "@/lib/validation";

export const runtime = "nodejs";
const failure = "We could not verify those access details. Please check the information or contact WriteX Client Support.";

export async function POST(request: NextRequest) {
  try {
    const context = getRequestContext(request);
    const body = await parseJson(request, futureClientLoginSchema);
    const invoiceId = normalizeInvoiceId(body.invoiceId);
    const whatsapp = normalizeWhatsapp(body.whatsapp);
    assertRateLimit({ key: `client-auth:${context.ipAddress}:${hashValue(invoiceId).slice(0, 16)}`, limit: Number(process.env.CLIENT_LOGIN_MAX_ATTEMPTS || 6), windowSeconds: 900 });
    const invoice = await validateInvoice(invoiceId, whatsapp);
    if (!invoice.valid) {
      await logAuditEvent({ actorType: "client", entityType: "client_session", entityId: invoiceId, action: "client_login_failed", request });
      throw unauthorized(failure);
    }
    const accessLevel = "full";
    const mode = "invoice_whatsapp";
    const sessionRecord = await createClientSessionRecord({ invoiceId, whatsapp, ipAddress: context.ipAddress, userAgent: context.userAgent, accessLevel, securityMode: mode });
    const maxAge = getClientSessionMaxAgeSeconds();
    const token = createSignedSessionToken({ kind: "client", sessionId: sessionRecord.sessionId, invoiceId, whatsapp, tokenHash: sessionRecord.tokenHash, accessLevel, securityMode: mode }, maxAge);
    const response = apiOk({ authenticated: true, accessLevel, securityMode: mode, defaultRoute: "/client/dashboard" });
    setClientSessionCookie(response, token, maxAge);
    await logAuditEvent({ actorType: "client", entityType: "client_session", entityId: invoiceId, action: "client_login_success", metadata: { securityMode: mode }, request });
    return response;
  } catch (error) { return apiError(error); }
}
