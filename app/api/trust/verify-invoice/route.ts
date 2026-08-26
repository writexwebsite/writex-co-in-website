import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
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
import { normalizeIndianMobile } from "@/lib/trust/mobile";
import {
  getInvoiceVerificationProvider,
  TrustProviderUnavailableError
} from "@/lib/trust/providers";

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
    const normalizedMobile = normalizeIndianMobile(body.mobile);
    if (!normalizedMobile) {
      return trustJson(
        {
          verified: false,
          error: { message: "Enter a valid Indian mobile number." },
          correlationId
        },
        { status: 400, correlationId }
      );
    }

    try {
      const result = await getInvoiceVerificationProvider().verify({
        invoiceNumber: body.invoiceNumber,
        normalizedMobile
      });
      return trustJson({ ...result, correlationId }, { correlationId });
    } catch (error) {
      if (!(error instanceof TrustProviderUnavailableError)) throw error;
      return unavailableTrustResponse("invoice", correlationId);
    }
  } catch (error) {
    return applyTrustHeaders(apiError(error), correlationId);
  }
}
