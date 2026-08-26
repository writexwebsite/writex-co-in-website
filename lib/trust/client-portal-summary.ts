export type ClientPortalTrustState = "verified" | "unavailable";

export type ClientPortalRepresentativeInput = {
  name?: string;
  designation?: string;
  department?: string;
  status?: string;
  approved?: boolean;
};

export type ClientPortalTrustSummary = {
  invoice: {
    state: ClientPortalTrustState;
    label: string;
  };
  representative: {
    state: ClientPortalTrustState;
    label: string;
    name?: string;
    designation?: string;
    department?: string;
  };
  payment: {
    state: ClientPortalTrustState;
    label: string;
    status?: string;
  };
  verificationId: string | null;
  lastVerifiedAt: string | null;
  safePaymentNotice: string;
};

export type ClientPortalPaymentView = {
  invoiceId: string;
  paymentStatus: string;
  isSettled: boolean;
  canUnlockDownload: boolean;
  totalAmount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  currency?: string;
  updatedAt?: string;
  dueDate?: string;
};

const safePaymentNotice =
  "Only use payment instructions printed on your official WriteX invoice. If any payment detail changes, stop and verify with WriteX.";

function cleanText(value?: string | null) {
  const normalized = String(value || "").trim();
  return normalized || undefined;
}

function invoiceIdsMatch(sessionInvoiceId: string, invoiceId: string) {
  return sessionInvoiceId.trim().toUpperCase() === invoiceId.trim().toUpperCase();
}

function isKnownPaymentStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();
  return Boolean(value && value !== "unknown");
}

function isApprovedRepresentative(
  representative?: ClientPortalRepresentativeInput | null
) {
  return Boolean(
    representative?.approved === true &&
      cleanText(representative.name) &&
      String(representative.status || "").trim().toLowerCase() === "active"
  );
}

export function buildClientPortalPaymentView(payment: ClientPortalPaymentView) {
  return {
    invoiceId: payment.invoiceId,
    paymentStatus: payment.paymentStatus,
    isSettled: payment.isSettled,
    canUnlockDownload: payment.canUnlockDownload,
    totalAmount: payment.totalAmount,
    paidAmount: payment.paidAmount,
    balanceAmount: payment.balanceAmount,
    currency: payment.currency,
    updatedAt: payment.updatedAt,
    dueDate: payment.dueDate
  } satisfies ClientPortalPaymentView;
}

export function buildClientPortalTrustSummary({
  sessionInvoiceId,
  invoiceId,
  paymentStatus,
  representative,
  verificationId,
  verifiedAt
}: {
  sessionInvoiceId: string;
  invoiceId: string;
  paymentStatus?: string | null;
  representative?: ClientPortalRepresentativeInput | null;
  verificationId?: string | null;
  verifiedAt?: string | Date | null;
}): ClientPortalTrustSummary {
  const hasAuditReference = Boolean(verificationId && verifiedAt);
  const invoiceVerified =
    hasAuditReference && invoiceIdsMatch(sessionInvoiceId, invoiceId);
  const paymentVerified =
    invoiceVerified && isKnownPaymentStatus(paymentStatus);
  const representativeVerified =
    invoiceVerified && isApprovedRepresentative(representative);

  return {
    invoice: {
      state: invoiceVerified ? "verified" : "unavailable",
      label: invoiceVerified
        ? "Verified by WriteX Trust Centre™"
        : "Verification temporarily unavailable"
    },
    representative: representativeVerified
      ? {
          state: "verified",
          label: "Approved representative verified",
          name: cleanText(representative?.name),
          designation: cleanText(representative?.designation),
          department: cleanText(representative?.department)
        }
      : {
          state: "unavailable",
          label: "Verification temporarily unavailable"
        },
    payment: paymentVerified
      ? {
          state: "verified",
          label: "Payment record verified",
          status: cleanText(paymentStatus)
        }
      : {
          state: "unavailable",
          label: "Verification temporarily unavailable",
          status: cleanText(paymentStatus)
        },
    verificationId: invoiceVerified ? verificationId || null : null,
    lastVerifiedAt: invoiceVerified
      ? new Date(verifiedAt as string | Date).toISOString()
      : null,
    safePaymentNotice
  };
}
