import type { NextRequest } from "next/server";
import { ApiError, apiError, apiOk } from "@/lib/api/response";
import {
  createClientSessionRecord,
  getClientSessionMaxAgeSeconds,
  setClientSessionCookie
} from "@/lib/auth";
import { validateInvoice } from "@/lib/integrations/lts";
import { assertRateLimit, getRequestContext, parseJson } from "@/lib/security";
import { futureClientLoginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (process.env.CLIENT_LOGIN_MODE !== "restricted_two_field") {
      throw new ApiError(410, "LEGACY_LOGIN_DISABLED", "This login method is not available.");
    }
    const context = getRequestContext(request);
    assertRateLimit({
      key: `client-validate:${context.ipAddress}`,
      limit: 10,
      windowSeconds: 300
    });
    const body = await parseJson(request, futureClientLoginSchema);
    const result = await validateInvoice(body.invoiceId, body.whatsapp);

    if (!result.valid) {
      return apiOk({
        valid: false,
        authenticated: false
      });
    }

    const session = await createClientSessionRecord({
      invoiceId: body.invoiceId,
      whatsapp: body.whatsapp,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
    const maxAge = getClientSessionMaxAgeSeconds();
    const response = apiOk({
      valid: result.valid,
      authenticated: true,
      invoiceId: result.invoiceId,
      clientName: result.clientName ?? null,
      maskedWhatsapp: result.whatsappMasked ?? null
    });

    setClientSessionCookie(response, session.sessionToken, maxAge);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
