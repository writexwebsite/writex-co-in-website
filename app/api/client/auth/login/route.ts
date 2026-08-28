import type { NextRequest } from "next/server";
import { apiError, apiOk, unauthorized } from "@/lib/api/response";
import {
  createClientSessionRecord,
  getClientSessionIdleSeconds,
  getClientSessionMaxAgeSeconds,
  setClientSessionCookie
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import {
  assertClientAccessEnabled,
  clientInputFingerprint,
  isClientLoginLocked,
  recordClientLoginAttempt
} from "@/lib/client/access";
import { normalizeInvoiceId, normalizeWhatsapp } from "@/lib/client/credentials";
import { getClientVerificationProvider } from "@/lib/client/providers";
import { optionalDbQuery } from "@/lib/db";
import {
  isMyWritexDemoFixtureEnabled,
  isMyWritexFixtureEnabled,
  resolveDevelopmentCustomer,
  resolveDevelopmentInvoice
} from "@/lib/my-writex/dev-fixture";
import { isExpectedMyWritexDemoHost } from "@/lib/my-writex/demo-mode";
import { createDevelopmentClientSession } from "@/lib/my-writex/dev-sessions";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext,
  hashValue,
  parseJson
} from "@/lib/security";
import { futureClientLoginSchema } from "@/lib/validation";

export const runtime = "nodejs";

const failure =
  "We couldn't verify those details. Please check them and try again.";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (
      isMyWritexDemoFixtureEnabled() &&
      !isExpectedMyWritexDemoHost(request.headers.get("host"))
    ) throw unauthorized(failure);
    const context = getRequestContext(request);
    const correlationId = crypto.randomUUID();
    const body = await parseJson(request, futureClientLoginSchema);
    const identifier = body.invoiceId.trim();
    const invoiceId = normalizeInvoiceId(identifier);
    const phone = normalizeWhatsapp(body.whatsapp);
    if (!identifier || !phone) throw unauthorized(failure);

    const inputFingerprint = clientInputFingerprint(identifier, phone);
    assertRateLimit({
      key: `client-auth:${context.ipAddress}:${hashValue(identifier.toLowerCase()).slice(0, 16)}`,
      limit: Number(process.env.CLIENT_LOGIN_MAX_ATTEMPTS || 6),
      windowSeconds: 900
    });
    if (
      await isClientLoginLocked({
        inputFingerprint,
        ipAddress: context.ipAddress
      })
    ) {
      throw unauthorized(failure);
    }

    // The isolated fixture provider is resolved before any external provider.
    // The public isolated demo exposes only the synthetic customer workspace.
    // Keep the invoice fixture available for localhost development, but never
    // open the legacy invoice portal on the demo hostname.
    const fixtureInvoice = isMyWritexDemoFixtureEnabled()
      ? null
      : resolveDevelopmentInvoice(identifier, phone);
    if (fixtureInvoice) {
      const maxAge = getClientSessionMaxAgeSeconds();
      const sessionRecord = createDevelopmentClientSession({
        session: {
          kind: "client",
          authScope: "invoice",
          invoiceId: fixtureInvoice.invoiceId,
          whatsapp: phone,
          clientReference: fixtureInvoice.customerMasterId,
          clientDisplayName: fixtureInvoice.displayName,
          testSession: false,
          accessLevel: "full",
          securityMode: "development_fixture"
        },
        maxAgeSeconds: maxAge,
        idleSeconds: getClientSessionIdleSeconds()
      });
      const response = apiOk({
        authenticated: true,
        authScope: "invoice",
        accessLevel: "full",
        securityMode: "development_fixture",
        defaultRoute: "/client/overview"
      });
      setClientSessionCookie(response, sessionRecord.sessionToken, maxAge);
      await recordAttemptAndAudit({
        request,
        inputFingerprint,
        ipAddress: context.ipAddress,
        correlationId,
        succeeded: true,
        entityId: fixtureInvoice.invoiceId,
        authScope: "invoice"
      });
      return response;
    }

    const fixtureCustomer = resolveDevelopmentCustomer(identifier, phone);
    if (fixtureCustomer) {
      const maxAge = getClientSessionMaxAgeSeconds();
      const sessionRecord = createDevelopmentClientSession({
        session: {
          kind: "client",
          authScope: "customer",
          invoiceId: "",
          customerMasterId: fixtureCustomer.customerMasterId,
          whatsapp: phone,
          clientReference: fixtureCustomer.writeXId,
          clientDisplayName: fixtureCustomer.name,
          testSession: false,
          accessLevel: "full",
          securityMode: "writex_id_phone"
        },
        maxAgeSeconds: maxAge,
        idleSeconds: getClientSessionIdleSeconds()
      });
      const response = apiOk({
        authenticated: true,
        authScope: "customer",
        accessLevel: "full",
        securityMode: "writex_id_phone",
        defaultRoute: "/my-writex"
      });
      setClientSessionCookie(response, sessionRecord.sessionToken, maxAge);
      await recordAttemptAndAudit({
        request,
        inputFingerprint,
        ipAddress: context.ipAddress,
        correlationId,
        succeeded: true,
        entityId: fixtureCustomer.customerMasterId,
        authScope: "customer"
      });
      return response;
    }

    // Demo mode never falls through to LTS, a database-backed login or another provider.
    if (isMyWritexDemoFixtureEnabled()) {
      await recordAttemptAndAudit({
        request,
        inputFingerprint,
        ipAddress: context.ipAddress,
        correlationId,
        succeeded: false,
        entityId: hashValue(identifier.toLowerCase()).slice(0, 16)
      });
      throw unauthorized(failure);
    }

    // Production invoice access remains the first real resolver.
    const provider = getClientVerificationProvider();
    if (provider.mode === "live") {
      await assertClientAccessEnabled(invoiceId);
      const verification = await provider.verify(invoiceId, phone);
      if (verification.verified) {
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
          whatsapp: phone,
          clientReference: verification.identity.clientReference,
          clientDisplayName: verification.identity.displayName,
          verificationReference,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          accessLevel: "full",
          securityMode: "invoice_whatsapp"
        });
        await optionalDbQuery(
          `
            insert into trust_verification_references (
              verification_reference, verification_type, invoice_id, result,
              masked_input, correlation_id, data_source
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
          authScope: "invoice",
          accessLevel: "full",
          securityMode: "invoice_whatsapp",
          defaultRoute: "/client/overview"
        });
        setClientSessionCookie(response, sessionRecord.sessionToken, maxAge);
        await recordAttemptAndAudit({
          request,
          inputFingerprint,
          ipAddress: context.ipAddress,
          correlationId,
          succeeded: true,
          entityId: verifiedInvoiceId,
          authScope: "invoice"
        });
        return response;
      }
    }

    // Preserve the existing fail-closed provider behavior outside the local fixture mode.
    if (provider.mode !== "live" && !isMyWritexFixtureEnabled()) {
      await provider.verify(invoiceId, phone);
    }

    await recordAttemptAndAudit({
      request,
      inputFingerprint,
      ipAddress: context.ipAddress,
      correlationId,
      succeeded: false,
      entityId: hashValue(identifier.toLowerCase()).slice(0, 16)
    });
    throw unauthorized(failure);
  } catch (error) {
    return apiError(error);
  }
}

async function recordAttemptAndAudit({
  request,
  inputFingerprint,
  ipAddress,
  correlationId,
  succeeded,
  entityId,
  authScope
}: {
  request: NextRequest;
  inputFingerprint: string;
  ipAddress: string;
  correlationId: string;
  succeeded: boolean;
  entityId: string;
  authScope?: "invoice" | "customer";
}) {
  await recordClientLoginAttempt({
    inputFingerprint,
    ipAddress,
    succeeded,
    failureReason: succeeded ? undefined : "not_verified",
    correlationId
  });
  await logAuditEvent({
    actorType: "client",
    entityType: "client_session",
    entityId,
    action: succeeded ? "client_login_success" : "client_login_failed",
    metadata: authScope ? { authScope } : undefined,
    request
  });
}
