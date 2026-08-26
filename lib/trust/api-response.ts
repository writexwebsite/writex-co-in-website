import { NextResponse } from "next/server";
import type { UnavailableTrustService } from "@/lib/trust/providers";

export const trustNoStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive"
};

const unavailableCopy: Record<
  UnavailableTrustService,
  { title: string; message: string }
> = {
  representative: {
    title: "Representative Verification Temporarily Unavailable",
    message:
      "The official representative directory cannot be reached right now. Please contact business@writex.co.in."
  },
  invoice: {
    title: "Invoice Verification Temporarily Unavailable",
    message:
      "This verification service is being connected to the official WriteX billing system. Please contact business@writex.co.in before making any payment."
  },
  payment: {
    title: "Payment Verification Temporarily Unavailable",
    message:
      "Verification service is currently being connected. Please follow only the payment instructions printed on your official WriteX invoice."
  },
  enquiry: {
    title: "Enquiry Verification Temporarily Unavailable",
    message:
      "Verification service is currently being connected. Please contact business@writex.co.in to confirm an enquiry."
  }
};

export function trustJson(
  body: object,
  {
    status = 200,
    correlationId
  }: { status?: number; correlationId?: string } = {}
) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...trustNoStoreHeaders,
      ...(correlationId ? { "X-Correlation-ID": correlationId } : {})
    }
  });
}

export function unavailableTrustResponse(
  service: UnavailableTrustService,
  correlationId: string
) {
  return trustJson(
    {
      verified: false,
      serviceUnavailable: true,
      unavailable: unavailableCopy[service],
      correlationId
    },
    { status: 503, correlationId }
  );
}

export function applyTrustHeaders(
  response: NextResponse,
  correlationId?: string
) {
  for (const [name, value] of Object.entries(trustNoStoreHeaders)) {
    response.headers.set(name, value);
  }
  if (correlationId) response.headers.set("X-Correlation-ID", correlationId);
  return response;
}
