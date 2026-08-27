import type { NextRequest } from "next/server";
import { apiError, apiOk, forbidden } from "@/lib/api/response";
import { assertFullClientAccess, verifyInvoiceClientSessionFromRequest } from "@/lib/auth";
import { getOrderFiles, sendClientEvent } from "@/lib/integrations/lts";
import { getRequestContext, logPreviewDownloadEvent } from "@/lib/security";
import { getSignedPreviewUrl } from "@/lib/storage/s3";
import { assertNotDemoRequest } from "@/lib/demo/session";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    assertNotDemoRequest(request);
    const { invoiceId } = await context.params;
    const session = await verifyInvoiceClientSessionFromRequest(request);
    assertFullClientAccess(session);

    if (session.invoiceId !== invoiceId) {
      throw forbidden();
    }

    const files = await getOrderFiles(invoiceId);
    const preview = files.files.find(
      (file) => file.assetType === "preview" && file.s3Key
    );

    if (!files.previewAvailable || !preview?.s3Key) {
      return apiOk({
        available: false,
        message:
          "Preview access is not available online yet. Please contact WriteX support."
      });
    }

    const contextData = getRequestContext(request);
    await logPreviewDownloadEvent({
      invoiceId,
      clientSessionId: session.sessionId,
      action: "preview",
      ipAddress: contextData.ipAddress,
      userAgent: contextData.userAgent
    });
    await sendClientEvent(invoiceId, { eventType: "preview_opened" });

    return apiOk({
      available: true,
      previewUrl: await getSignedPreviewUrl(preview.s3Key)
    });
  } catch (error) {
    return apiError(error);
  }
}
