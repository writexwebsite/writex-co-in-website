import "server-only";

import { ApiError } from "@/lib/api/response";
import { logIntegrationEvent } from "@/lib/security";
import {
  isSettledPaymentStatus,
  mapPaymentStatusToPortalStage,
  type PortalStageKey
} from "@/lib/integrations/status-mapping";

type IntegrationMode = "disabled" | "mock" | "live";

export type PaymentStatus =
  | "unpaid"
  | "partial"
  | "pending_verification"
  | "paid"
  | "settled"
  | "approved"
  | "failed"
  | "unknown";

export type PaymentStatusResult = {
  invoiceId: string;
  paymentStatus: PaymentStatus;
  isSettled: boolean;
  canUnlockDownload: boolean;
  totalAmount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  currency?: string;
  updatedAt?: string;
  portalStage: PortalStageKey;
};

export type PaymentDetails = PaymentStatusResult & {
  paymentLink?: string;
  paymentMethods: string[];
  bankDetails?: Record<string, unknown>;
  upiDetails?: Record<string, unknown>;
  dueDate?: string;
};

export type PaymentProofInput = {
  s3Key?: string;
  fileName?: string;
  mimeType?: string;
  amount?: number;
  fileAssetId?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: string;
  notes?: string;
};

export type PaymentProofResult = {
  received: true;
  verificationStatus: "pending";
  referenceId: string;
};

export type AccountsEvent = {
  eventType: string;
  metadata?: Record<string, unknown>;
};

function getIntegrationMode(): IntegrationMode {
  const mode = process.env.INTEGRATION_MODE || "disabled";
  return mode === "mock" || mode === "live" ? mode : "disabled";
}

function getTimeoutMs() {
  const value = Number(process.env.PMT_API_TIMEOUT_MS || 10000);
  return Number.isFinite(value) && value > 0 ? value : 10000;
}

function isLiveConfigured() {
  return Boolean(process.env.PMT_API_BASE_URL && process.env.PMT_API_KEY);
}

function integrationUnavailable(message = "Payment data is temporarily unavailable."): never {
  throw new ApiError(503, "INTEGRATION_UNAVAILABLE", message);
}

function assertModeAllowsRequest(endpoint: string) {
  const mode = getIntegrationMode();

  if (mode === "disabled") {
    integrationUnavailable("Payment data is temporarily unavailable.");
  }

  if (mode === "mock" && process.env.NODE_ENV === "production") {
    integrationUnavailable("PMT mock mode is not available in production.");
  }

  if (mode === "live" && !isLiveConfigured()) {
    integrationUnavailable("Payment data is temporarily unavailable.");
  }

  return { mode, endpoint };
}

async function logPmt({
  endpoint,
  requestId,
  status,
  errorMessage
}: {
  endpoint: string;
  requestId?: string;
  status: string;
  errorMessage?: string;
}) {
  await logIntegrationEvent({
    system: "PMT",
    endpoint,
    requestId,
    status,
    errorMessage
  });
}

async function requestPmt<T>(endpoint: string, init?: RequestInit): Promise<T> {
  assertModeAllowsRequest(endpoint);
  const requestId = crypto.randomUUID();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());
  const url = new URL(endpoint, process.env.PMT_API_BASE_URL || "");

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${process.env.PMT_API_KEY}`,
        "x-request-id": requestId,
        ...(init?.headers || {})
      },
      cache: "no-store",
      signal: controller.signal
    });

    await logPmt({ endpoint, requestId, status: String(response.status) });

    if (!response.ok) {
      integrationUnavailable();
    }

    return (await response.json()) as T;
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    await logPmt({
      endpoint,
      requestId,
      status: isAbort ? "timeout" : "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    });

    if (error instanceof ApiError) throw error;
    integrationUnavailable();
  } finally {
    clearTimeout(timeout);
  }
}

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function normalizePaymentStatus(status?: string | null): PaymentStatus {
  const value = String(status || "unknown").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (
    value === "unpaid" ||
    value === "partial" ||
    value === "pending_verification" ||
    value === "paid" ||
    value === "settled" ||
    value === "approved" ||
    value === "failed"
  ) {
    return value;
  }
  return "unknown";
}

export function isPaymentSettled(status: PaymentStatus | PaymentStatusResult) {
  if (typeof status === "object") {
    return Boolean(status.isSettled && status.canUnlockDownload);
  }

  return isSettledPaymentStatus(status);
}

function normalizeStatus(payload: unknown, invoiceId: string): PaymentStatusResult {
  const source = toObject(payload);
  const paymentStatus = normalizePaymentStatus(
    readString(source, ["paymentStatus", "payment_status", "status"])
  );
  const isSettled = isSettledPaymentStatus(paymentStatus);

  return {
    invoiceId: readString(source, ["invoiceId", "invoice_id"]) || invoiceId,
    paymentStatus,
    isSettled,
    canUnlockDownload: isSettled,
    totalAmount: readNumber(source, ["totalAmount", "total_amount", "amount"]),
    paidAmount: readNumber(source, ["paidAmount", "paid_amount"]),
    balanceAmount: readNumber(source, ["balanceAmount", "balance_amount", "balance"]),
    currency: readString(source, ["currency"]) || "INR",
    updatedAt: readString(source, ["updatedAt", "updated_at"]),
    portalStage: mapPaymentStatusToPortalStage(paymentStatus)
  };
}

function normalizeDetails(payload: unknown, invoiceId: string): PaymentDetails {
  const source = toObject(payload);
  const status = normalizeStatus(source, invoiceId);
  const rawMethods = source.paymentMethods || source.payment_methods;
  const paymentMethods = Array.isArray(rawMethods)
    ? rawMethods.filter((method): method is string => typeof method === "string")
    : [];

  return {
    ...status,
    paymentLink: readString(source, ["paymentLink", "payment_link"]),
    paymentMethods,
    bankDetails: toObject(source.bankDetails || source.bank_details),
    upiDetails: toObject(source.upiDetails || source.upi_details),
    dueDate: readString(source, ["dueDate", "due_date"])
  };
}

function getMockPayment(invoiceId: string): PaymentDetails | null {
  const statusByInvoice: Record<string, PaymentStatus> = {
    "WXTEST-PENDING": "unpaid",
    "WXTEST-READY": "partial",
    "WXTEST-PAID": "settled"
  };
  const paymentStatus = statusByInvoice[invoiceId];
  if (!paymentStatus) return null;

  const isSettled = isSettledPaymentStatus(paymentStatus);
  return {
    invoiceId,
    paymentStatus,
    isSettled,
    canUnlockDownload: isSettled,
    totalAmount: 100,
    paidAmount: isSettled ? 100 : paymentStatus === "partial" ? 50 : 0,
    balanceAmount: isSettled ? 0 : paymentStatus === "partial" ? 50 : 100,
    currency: "INR",
    updatedAt: new Date().toISOString(),
    portalStage: mapPaymentStatusToPortalStage(paymentStatus),
    paymentLink: undefined,
    paymentMethods: ["Test UPI", "Test Bank Transfer"],
    bankDetails: {},
    upiDetails: {},
    dueDate: undefined
  };
}

function mockOnly(invoiceId?: string) {
  if (getIntegrationMode() !== "mock" || process.env.NODE_ENV === "production") {
    return null;
  }
  if (!invoiceId) return true;
  return getMockPayment(invoiceId) ? true : null;
}

export async function getPaymentStatus(invoiceId: string) {
  const endpoint = `/payments/${encodeURIComponent(invoiceId)}/status`;
  const mode = assertModeAllowsRequest(endpoint).mode;

  if (mode === "mock" && mockOnly(invoiceId)) {
    return getMockPayment(invoiceId) as PaymentStatusResult;
  }

  return normalizeStatus(await requestPmt(endpoint), invoiceId);
}

export async function getPaymentDetails(invoiceId: string) {
  const endpoint = `/payments/${encodeURIComponent(invoiceId)}`;
  const mode = assertModeAllowsRequest(endpoint).mode;

  if (mode === "mock" && mockOnly(invoiceId)) {
    return getMockPayment(invoiceId) as PaymentDetails;
  }

  return normalizeDetails(await requestPmt(endpoint), invoiceId);
}

export async function submitPaymentProof(
  invoiceId: string,
  proof: PaymentProofInput
) {
  const endpoint = `/payments/${encodeURIComponent(invoiceId)}/proof`;
  const mode = assertModeAllowsRequest(endpoint).mode;

  if (mode === "mock" && mockOnly(invoiceId)) {
    return {
      received: true,
      verificationStatus: "pending",
      referenceId: `PMT-MOCK-${invoiceId}`
    } satisfies PaymentProofResult;
  }

  const payload = await requestPmt(endpoint, {
    method: "POST",
    body: JSON.stringify(proof)
  });
  const source = toObject(payload);

  return {
    received: true,
    verificationStatus: "pending",
    referenceId:
      readString(source, ["referenceId", "reference_id", "id"]) ||
      crypto.randomUUID()
  } satisfies PaymentProofResult;
}

export async function notifyAccounts(invoiceId: string, event: AccountsEvent) {
  const endpoint = `/payments/${encodeURIComponent(invoiceId)}/accounts-events`;
  const mode = assertModeAllowsRequest(endpoint).mode;

  if (mode === "mock" && mockOnly(invoiceId)) {
    await logPmt({
      endpoint,
      requestId: `${invoiceId}:${event.eventType}`,
      status: "mock_accepted"
    });
    return { accepted: true };
  }

  await requestPmt(endpoint, {
    method: "POST",
    body: JSON.stringify(event)
  });

  return { accepted: true };
}
