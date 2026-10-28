import { createHash, createHmac, randomBytes } from "crypto";

export type LtsInvoiceVerificationConfig = {
  url: string;
  sharedSecret: string;
  issuer: string;
  subject: string;
  audience: string;
  timeoutMs: number;
  lifetimeSeconds: number;
};

type LtsEnvironment = Partial<Record<string, string | undefined>>;

export type LtsInvoiceVerificationResult = {
  verified: boolean;
  invoiceNumber?: string;
  invoiceDate?: string;
  currency?: string;
  totalAmount?: number;
  paymentStatus?: string;
  invoiceState?: "Active" | "Cancelled" | "Superseded";
  dataSource?: string;
  generatedAt?: string;
};

const allowedPaymentStatuses = new Set([
  "Pending",
  "Partially Paid",
  "Fully Paid",
  "Cancelled",
  "Refunded",
  "Under Review"
]);
const allowedInvoiceStates = new Set(["Active", "Cancelled", "Superseded"]);

export class LtsInvoiceVerificationUnavailableError extends Error {
  constructor() {
    super("LTS invoice verification is unavailable.");
    this.name = "LtsInvoiceVerificationUnavailableError";
  }
}

function boundedInteger(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : fallback;
}

export function readLtsInvoiceVerificationConfig(
  environment: LtsEnvironment
): LtsInvoiceVerificationConfig | null {
  const url = environment.LTS_INVOICE_VERIFICATION_URL?.trim();
  const sharedSecret =
    environment.LTS_INVOICE_VERIFICATION_SHARED_SECRET?.trim();
  const issuer = environment.LTS_INVOICE_VERIFICATION_ISSUER?.trim();
  const subject = environment.LTS_INVOICE_VERIFICATION_SUBJECT?.trim();
  const audience = environment.LTS_INVOICE_VERIFICATION_AUDIENCE?.trim();

  if (!url || !sharedSecret || sharedSecret.length < 32 || !issuer || !subject || !audience) {
    return null;
  }

  try {
    const endpoint = new URL(url);
    if (
      endpoint.protocol !== "https:" ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return {
    url,
    sharedSecret,
    issuer,
    subject,
    audience,
    timeoutMs: boundedInteger(
      environment.LTS_INVOICE_VERIFICATION_TIMEOUT_MS,
      5000,
      15000
    ),
    lifetimeSeconds: boundedInteger(
      environment.LTS_INVOICE_VERIFICATION_TOKEN_LIFETIME_SECONDS,
      120,
      300
    )
  };
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createSignedInvoiceVerificationRequest({
  config,
  invoiceNumber,
  normalizedMobile,
  correlationId,
  nowSeconds = Math.floor(Date.now() / 1000),
  nonce = randomBytes(24).toString("base64url")
}: {
  config: LtsInvoiceVerificationConfig;
  invoiceNumber: string;
  normalizedMobile: string;
  correlationId?: string;
  nowSeconds?: number;
  nonce?: string;
}) {
  const body = JSON.stringify({
    invoiceNumber: invoiceNumber.trim(),
    mobile: normalizedMobile
  });
  const path = new URL(config.url).pathname;
  const expiresAt = nowSeconds + config.lifetimeSeconds;
  const canonical = [
    "POST",
    path,
    config.issuer,
    config.subject,
    config.audience,
    String(nowSeconds),
    String(expiresAt),
    nonce,
    sha256Hex(body)
  ].join("\n");
  const signature = createHmac("sha256", config.sharedSecret)
    .update(canonical)
    .digest("hex");

  return {
    body,
    headers: {
      "content-type": "application/json",
      "x-writex-issuer": config.issuer,
      "x-writex-subject": config.subject,
      "x-writex-audience": config.audience,
      "x-writex-issued-at": String(nowSeconds),
      "x-writex-expires-at": String(expiresAt),
      "x-writex-nonce": nonce,
      "x-writex-signature": signature,
      ...(correlationId ? { "x-correlation-id": correlationId } : {})
    }
  };
}

export function parseLtsInvoiceVerificationResult(
  value: unknown
): LtsInvoiceVerificationResult {
  if (!value || typeof value !== "object") {
    throw new LtsInvoiceVerificationUnavailableError();
  }
  const record = value as Record<string, unknown>;
  if (record.verified === false) return { verified: false };
  if (
    record.verified !== true ||
    typeof record.invoiceNumber !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_#./-]{2,79}$/.test(record.invoiceNumber) ||
    typeof record.invoiceDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.invoiceDate) ||
    typeof record.currency !== "string" ||
    !/^[A-Z]{3}$/.test(record.currency) ||
    typeof record.totalAmount !== "number" ||
    !Number.isFinite(record.totalAmount) ||
    record.totalAmount < 0 ||
    typeof record.paymentStatus !== "string" ||
    !allowedPaymentStatuses.has(record.paymentStatus) ||
    typeof record.invoiceState !== "string" ||
    !allowedInvoiceStates.has(record.invoiceState) ||
    record.dataSource !== "lts" ||
    typeof record.generatedAt !== "string" ||
    Number.isNaN(Date.parse(record.generatedAt))
  ) {
    throw new LtsInvoiceVerificationUnavailableError();
  }

  return {
    verified: true,
    invoiceNumber: record.invoiceNumber,
    invoiceDate: record.invoiceDate,
    currency: record.currency,
    totalAmount: record.totalAmount,
    paymentStatus: record.paymentStatus,
    invoiceState: record.invoiceState as "Active" | "Cancelled" | "Superseded",
    dataSource: "lts",
    generatedAt: record.generatedAt
  };
}

export async function fetchLtsInvoiceVerification({
  config,
  invoiceNumber,
  normalizedMobile,
  correlationId,
  fetchImplementation = fetch
}: {
  config: LtsInvoiceVerificationConfig;
  invoiceNumber: string;
  normalizedMobile: string;
  correlationId?: string;
  fetchImplementation?: typeof fetch;
}) {
  const signed = createSignedInvoiceVerificationRequest({
    config,
    invoiceNumber,
    normalizedMobile,
    correlationId
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImplementation(config.url, {
      method: "POST",
      headers: signed.headers,
      body: signed.body,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal
    });
    if (!response.ok) throw new LtsInvoiceVerificationUnavailableError();
    return parseLtsInvoiceVerificationResult(await response.json());
  } catch (error) {
    if (error instanceof LtsInvoiceVerificationUnavailableError) throw error;
    throw new LtsInvoiceVerificationUnavailableError();
  } finally {
    clearTimeout(timeout);
  }
}
