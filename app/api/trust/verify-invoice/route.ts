import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { apiError } from "@/lib/api/response";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext,
  hashValue,
  parseJson
} from "@/lib/security";
import {
  applyTrustHeaders,
  trustJson,
  unavailableTrustResponse
} from "@/lib/trust/api-response";
import { maskMobile, normalizeVerificationMobile } from "@/lib/trust/mobile";
import {
  getInvoiceVerificationProvider,
  TrustProviderUnavailableError
} from "@/lib/trust/providers";
import { maskTrustIdentifier } from "@/lib/trust/reporting-validation";
import { recordSuccessfulVerification } from "@/lib/trust/verification-references";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  invoiceNumber: z.string().trim().min(3).max(80),
  mobile: z.string().trim().min(1).max(32)
});

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();

  try {
    assertSameOrigin(request);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `trust-invoice:${hashValue(context.ipAddress)}`,
      limit: 12,
      windowSeconds: 600
    });
    const body = await parseJson(request, schema);
    const normalizedMobile = normalizeVerificationMobile(body.mobile);
    if (!normalizedMobile) {
      return trustJson(
        {
          verified: false,
          error: { message: "Enter a valid mobile number." },
          correlationId
        },
        { status: 400, correlationId }
      );
    }

    try {
      const provider = getInvoiceVerificationProvider();
      const result = await provider.verify({
        invoiceNumber: body.invoiceNumber,
        normalizedMobile,
        correlationId
      });

      await logAuditEvent({
        actorType: "system",
        entityType: "invoice_verification",
        action: result.verified
          ? "public_invoice_verified"
          : "public_invoice_not_verified",
        metadata: {
          maskedInvoice: maskTrustIdentifier(body.invoiceNumber),
          maskedMobile: maskMobile(normalizedMobile),
          providerSource: provider.dataSource
        },
        request
      });

      if (!result.verified) {
        return trustJson({ verified: false, correlationId }, { correlationId });
      }

      const verification = await recordSuccessfulVerification({
        verificationType: "invoice",
        maskedInput: `${maskTrustIdentifier(body.invoiceNumber)} / ${maskMobile(normalizedMobile)}`,
        correlationId,
        dataSource: provider.dataSource
      });

      return trustJson(
        {
          ...result,
          verificationId: verification.verification_reference,
          verifiedAt: verification.verified_at.toISOString(),
          correlationId
        },
        { correlationId }
      );
    } catch (error) {
      if (!(error instanceof TrustProviderUnavailableError)) throw error;
      await logAuditEvent({
        actorType: "system",
        entityType: "invoice_verification",
        action: "public_invoice_verification_unavailable",
        metadata: {
          maskedInvoice: maskTrustIdentifier(body.invoiceNumber),
          maskedMobile: maskMobile(normalizedMobile),
          providerSource: "unavailable"
        },
        request
      });
      return unavailableTrustResponse("invoice", correlationId);
    }
  } catch (error) {
    return applyTrustHeaders(apiError(error), correlationId);
  }
}

export async function GET() {
  return trustJson({ verified: false }, { status: 405 });
}
