import type { NextRequest } from "next/server";
import { ApiError, apiError, apiOk, unauthorized } from "@/lib/api/response";
import { createClientSessionRecord, getClientSessionMaxAgeSeconds, setClientSessionCookie } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import {
  assertClientAccessEnabled,
  clientInputFingerprint,
  isClientLoginLocked,
  recordClientLoginAttempt
} from "@/lib/client/access";
import { normalizeInvoiceId, normalizeWhatsapp } from "@/lib/client/credentials";
import { getClientVerificationProvider } from "@/lib/client/providers";
import { assertRateLimit, assertSameOrigin, getRequestContext, hashValue, parseJson } from "@/lib/security";
import { futureClientLoginSchema } from "@/lib/validation";
import { optionalDbQuery } from "@/lib/db";

export const runtime = "nodejs";
const failure = "We could not verify those details. Please check the invoice number and registered mobile number or contact WriteX.";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const context = getRequestContext(request);
    const correlationId = crypto.randomUUID();
    const body = await parseJson(request, futureClientLoginSchema);
    const invoiceId = normalizeInvoiceId(body.invoiceId);
    const whatsapp = normalizeWhatsapp(body.whatsapp);
    if (!invoiceId || !whatsapp) throw unauthorized(failure);
    const inputFingerprint = clientInputFingerprint(invoiceId, whatsapp);
    assertRateLimit({ key: `client-auth:${context.ipAddress}:${hashValue(invoiceId).slice(0, 16)}`, limit: Number(process.env.CLIENT_LOGIN_MAX_ATTEMPTS || 6), windowSeconds: 900 });
    if (await isClientLoginLocked({ inputFingerprint, ipAddress: context.ipAddress })) {
      throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Please try again later.");
    }
    await assertClientAccessEnabled(invoiceId);
    const verification = await getClientVerificationProvider().verify(invoiceId, whatsapp);
    if (!verification.verified) {
      await recordClientLoginAttempt({
        inputFingerprint,
        ipAddress: context.ipAddress,
        succeeded: false,
        failureReason: "not_verified",
        correlationId
      });
      await logAuditEvent({ actorType: "client", entityType: "client_session", entityId: invoiceId, action: "client_login_failed", request });
      throw unauthorized(failure);
    }
    const accessLevel = "full";
    const mode = "invoice_whatsapp";
    const verifiedInvoiceId = normalizeInvoiceId(
      verification.identity.invoiceReference
    );
    if (verifiedInvoiceId !== invoiceId) throw unauthorized(failure);
    const verificationReference = `WX-VRF-${crypto.randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase()}`;
    const sessionRecord = await createClientSessionRecord({
      invoiceId: verifiedInvoiceId,
      whatsapp,
      clientReference: verification.identity.clientReference,
      clientDisplayName: verification.identity.displayName,
      verificationReference,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      accessLevel,
      securityMode: mode
    });
    await optionalDbQuery(
      `
        insert into trust_verification_references (
          verification_reference,
          verification_type,
          invoice_id,
          result,
          masked_input,
          correlation_id,
          data_source
        )
        values ($1, 'client_login', $2, 'verified', $3, $4, 'lts')
        on conflict (verification_reference) do nothing
      `,
      [
        verificationReference,
        verifiedInvoiceId,
        `${verifiedInvoiceId.slice(0, 3)}***${verifiedInvoiceId.slice(-4)}`,
        correlationId
      ]
    );
    const maxAge = getClientSessionMaxAgeSeconds();
    const response = apiOk({
      authenticated: true,
      accessLevel,
      securityMode: mode,
      defaultRoute: "/client/overview"
    });
    setClientSessionCookie(response, sessionRecord.sessionToken, maxAge);
    await recordClientLoginAttempt({
      inputFingerprint,
      ipAddress: context.ipAddress,
      succeeded: true,
      correlationId
    });
    await logAuditEvent({ actorType: "client", entityType: "client_session", entityId: verifiedInvoiceId, action: "client_login_success", metadata: { securityMode: mode }, request });
    return response;
  } catch (error) { return apiError(error); }
}
