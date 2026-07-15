import { NextResponse, type NextRequest } from "next/server";
import { apiError, apiOk, forbidden } from "@/lib/api/response";
import { assertFullClientAccess, verifyClientSessionFromRequest } from "@/lib/auth";
import { getOrderFiles, sendClientEvent } from "@/lib/integrations/lts";
import { getPaymentDetails, isPaymentSettled } from "@/lib/integrations/pmt";
import { canUnlockFromLocalPaymentProof } from "@/lib/payments/proofs";
import { getRequestContext, logPreviewDownloadEvent } from "@/lib/security";
import { getSignedDownloadUrl } from "@/lib/storage/s3";
import { assertNotDemoRequest } from "@/lib/demo/session";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    assertNotDemoRequest(request);
    const { invoiceId } = await context.params;
    const session = await verifyClientSessionFromRequest(request);
    assertFullClientAccess(session);

    if (session.invoiceId !== invoiceId) {
      throw forbidden();
    }

    const localUnlock = await canUnlockFromLocalPaymentProof(invoiceId);
    let payment: Awaited<ReturnType<typeof getPaymentDetails>> | null = null;
    let paymentError: unknown = null;

    try {
      payment = await getPaymentDetails(invoiceId);
    } catch (error) {
      paymentError = error;
    }

    if (!payment && !localUnlock) {
      throw paymentError;
    }

    if (payment && !isPaymentSettled(payment) && !localUnlock) {
      return NextResponse.json(
        {
          ok: false,
          data: {
            allowed: false,
            reason: "Payment pending",
            balanceAmount: payment.balanceAmount ?? null,
            paymentStatus: payment.paymentStatus
          }
        },
        { status: 403 }
      );
    }

    const files = await getOrderFiles(invoiceId);
    const finalFile = files.files.find(
      (file) => file.assetType === "final" && file.s3Key
    );

    if (!files.finalAvailable || !finalFile?.s3Key) {
      return apiOk({
        allowed: false,
        reason: "Final file is not available."
      });
    }

    const contextData = getRequestContext(request);
    await logPreviewDownloadEvent({
      invoiceId,
      clientSessionId: session.sessionId,
      action: "download",
      ipAddress: contextData.ipAddress,
      userAgent: contextData.userAgent
    });
    await sendClientEvent(invoiceId, { eventType: "final_download_started" });

    return apiOk({
      allowed: true,
      downloadUrl: await getSignedDownloadUrl(finalFile.s3Key)
    });
  } catch (error) {
    return apiError(error);
  }
}
