import "server-only";

import { createHash } from "crypto";
import type { ClientSession } from "@/lib/auth";
import type { LtsInvoice } from "@/lib/integrations/lts";
import type { PaymentDetails } from "@/lib/integrations/pmt";
import {
  buildClientPortalTrustSummary,
  type ClientPortalTrustSummary
} from "@/lib/trust/client-portal-summary";
import { getOrCreateSuccessfulVerification } from "@/lib/trust/verification-references";

function createSessionCorrelationId(session: ClientSession) {
  const sessionScope = session.sessionId || session.tokenHash;
  const digest = createHash("sha256")
    .update(`client-portal:${sessionScope}:${session.invoiceId}`)
    .digest("hex");
  return `client-portal:${digest.slice(0, 40)}`;
}

function maskInvoiceId(invoiceId: string) {
  const normalized = invoiceId.trim();
  if (normalized.length <= 4) return "****";
  return `${normalized.slice(0, 3)}***${normalized.slice(-4)}`;
}

function unavailableSummary({
  session,
  invoice,
  payment
}: {
  session: ClientSession;
  invoice: LtsInvoice;
  payment: PaymentDetails;
}) {
  return buildClientPortalTrustSummary({
    sessionInvoiceId: session.invoiceId,
    invoiceId: invoice.invoiceId,
    paymentStatus: payment.paymentStatus
  });
}

export async function createClientPortalTrustSummary({
  session,
  invoice,
  payment
}: {
  session: ClientSession;
  invoice: LtsInvoice;
  payment: PaymentDetails;
}): Promise<ClientPortalTrustSummary> {
  if (
    session.invoiceId.trim().toUpperCase() !==
    invoice.invoiceId.trim().toUpperCase()
  ) {
    return unavailableSummary({ session, invoice, payment });
  }

  try {
    const verification = await getOrCreateSuccessfulVerification({
      verificationType: "invoice",
      maskedInput: maskInvoiceId(invoice.invoiceId),
      correlationId: createSessionCorrelationId(session),
      dataSource: "client_portal:lts+pmt"
    });

    return buildClientPortalTrustSummary({
      sessionInvoiceId: session.invoiceId,
      invoiceId: invoice.invoiceId,
      paymentStatus: payment.paymentStatus,
      representative: invoice.assignedRepresentative
        ? {
            name: invoice.assignedRepresentative.name,
            designation: invoice.assignedRepresentative.designation,
            department: invoice.assignedRepresentative.department,
            status: invoice.assignedRepresentative.status,
            approved: invoice.assignedRepresentative.approved
          }
        : null,
      verificationId: verification.verification_reference,
      verifiedAt: verification.verified_at
    });
  } catch {
    return unavailableSummary({ session, invoice, payment });
  }
}
