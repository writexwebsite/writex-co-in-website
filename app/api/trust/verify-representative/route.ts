import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { apiError, badRequest } from "@/lib/api/response";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext,
  hashValue,
  parseJson
} from "@/lib/security";
import { maskMobile, normalizeIndianMobile } from "@/lib/trust/mobile";
import {
  getRepresentativeVerificationProvider,
  TrustProviderUnavailableError
} from "@/lib/trust/providers";
import {
  applyTrustHeaders,
  trustJson,
  unavailableTrustResponse
} from "@/lib/trust/api-response";
import { recordSuccessfulVerification } from "@/lib/trust/verification-references";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  mobile: z.string().trim().min(1).max(32),
  website: z.string().trim().max(160).optional()
});

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();

  try {
    assertSameOrigin(request);

    const context = getRequestContext(request);
    const fingerprint = hashValue(`${context.ipAddress}:${context.userAgent}`);

    assertRateLimit({
      key: `trust-representative:${fingerprint}`,
      limit: 8,
      windowSeconds: 600
    });
    assertRateLimit({
      key: `trust-representative-ip:${hashValue(context.ipAddress)}`,
      limit: 20,
      windowSeconds: 600
    });

    const body = await parseJson(request, requestSchema);
    if (body.website) throw badRequest("The request could not be accepted.");

    const normalizedMobile = normalizeIndianMobile(body.mobile);
    if (!normalizedMobile) {
      throw badRequest("Enter a valid Indian mobile number.");
    }

    const provider = getRepresentativeVerificationProvider();

    try {
      const representative = await provider.verify({ normalizedMobile });

      await logAuditEvent({
        actorType: "system",
        entityType: "representative_verification",
        action: representative
          ? "public_representative_verified"
          : "public_representative_not_verified",
        metadata: {
          maskedMobile: maskMobile(normalizedMobile),
          providerSource:
            process.env.REPRESENTATIVE_DIRECTORY_SOURCE ||
            process.env.REPRESENTATIVE_DIRECTORY_MODE ||
            "unavailable"
        },
        request
      });

      if (!representative) {
        return trustJson(
          { verified: false, correlationId },
          { correlationId }
        );
      }

      const verification = await recordSuccessfulVerification({
        verificationType: "representative",
        maskedInput: maskMobile(normalizedMobile),
        correlationId,
        dataSource: provider.dataSource
      });

      return trustJson(
        {
          verified: true,
          representative,
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
        entityType: "representative_verification",
        action: "public_representative_directory_unavailable",
        metadata: {
          maskedMobile: maskMobile(normalizedMobile),
          providerSource:
            process.env.REPRESENTATIVE_DIRECTORY_SOURCE ||
            process.env.REPRESENTATIVE_DIRECTORY_MODE ||
            "unavailable"
        },
        request
      });

      return unavailableTrustResponse("representative", correlationId);
    }
  } catch (error) {
    const response = apiError(error);
    return applyTrustHeaders(response, correlationId);
  }
}

export async function GET() {
  return trustJson({ verified: false }, { status: 405 });
}
