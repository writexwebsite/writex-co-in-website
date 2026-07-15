import { NextRequest } from "next/server";
import { apiError, apiOk, forbidden, notConfigured } from "@/lib/api/response";
import { isDatabaseConfigured } from "@/lib/db";
import { assertRateLimit, assertSameOrigin, getRequestContext, parseJson } from "@/lib/security";
import { isTemplateId, toolFeatureFlags } from "@/lib/tools/config";
import { captureToolLead } from "@/lib/tools/leadService";
import { toolLeadSchema } from "@/lib/tools/schemas";
import { validateAndNormalizePhone } from "@/lib/tools/phone";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!toolFeatureFlags.publicHub) throw forbidden("Free tools are not enabled.");
    if (!isDatabaseConfigured()) throw notConfigured("Downloads are temporarily unavailable. Please contact WriteX support.");
    assertSameOrigin(request);
    const context = getRequestContext(request);
    assertRateLimit({ key: `tool-lead:${context.ipAddress}`, limit: 8, windowSeconds: 900 });
    const body = await parseJson(request, toolLeadSchema);
    const phone = validateAndNormalizePhone(body.phone, body.phoneCountry);
    if (!phone.valid) {
      return apiOk({ accepted: false, field: "phone", message: "Enter a valid WhatsApp number with the correct country code." }, { status: 400 });
    }
    const templateId = body.templateId && isTemplateId(body.templateId) ? body.templateId : undefined;
    if (body.toolType === "template" && !templateId) {
      return apiOk({ accepted: false, field: "templateId", message: "Select a valid template." }, { status: 400 });
    }
    const result = await captureToolLead({ ...body, templateId }, request);
    return apiOk({
      accepted: true,
      leadId: result.leadId,
      downloadUrl: `/api/tools/download?token=${encodeURIComponent(result.token)}`,
      queue: result.queue
    }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
