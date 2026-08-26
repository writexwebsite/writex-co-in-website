import "server-only";

import {
  DatabaseRepresentativeDirectoryProvider,
  RepresentativeDirectoryUnavailableError
} from "@/lib/trust/representative-directory";
import type { PublicRepresentative } from "@/lib/trust/representative-public";

export type TrustProviderMode = "live" | "unavailable";

export type RepresentativeVerificationInput = {
  normalizedMobile: string;
};

export type InvoiceVerificationInput = {
  invoiceNumber: string;
  normalizedMobile: string;
};

export type EnquiryVerificationInput = {
  enquiryReference: string;
  normalizedMobile?: string;
};

export type InvoiceVerificationResult = {
  verified: boolean;
  invoiceDate?: string;
  currency?: string;
  totalAmount?: number;
  paymentStatus?: string;
  invoiceState?: "Active" | "Cancelled" | "Superseded";
  dataSource?: string;
};

export type PaymentStatusResult = {
  verified: boolean;
  status?:
    | "Pending"
    | "Partially Paid"
    | "Fully Paid"
    | "Cancelled"
    | "Refunded"
    | "Under Review";
  paidAmount?: number;
  balanceAmount?: number;
  currency?: string;
  lastRecordedPaymentDate?: string;
  dataSource?: string;
};

export type EnquiryVerificationResult = {
  verified: boolean;
  status?: "Enquiry received" | "Assigned" | "Converted" | "Closed";
  updatedAt?: string;
  dataSource?: string;
};

export interface RepresentativeVerificationProvider {
  readonly mode: TrustProviderMode;
  readonly dataSource: string;
  verify(
    input: RepresentativeVerificationInput
  ): Promise<PublicRepresentative | null>;
}

export interface InvoiceVerificationProvider {
  readonly mode: TrustProviderMode;
  verify(input: InvoiceVerificationInput): Promise<InvoiceVerificationResult>;
}

export interface PaymentStatusProvider {
  readonly mode: TrustProviderMode;
  check(input: InvoiceVerificationInput): Promise<PaymentStatusResult>;
}

export interface EnquiryVerificationProvider {
  readonly mode: TrustProviderMode;
  verify(input: EnquiryVerificationInput): Promise<EnquiryVerificationResult>;
}

export type UnavailableTrustService =
  | "representative"
  | "invoice"
  | "payment"
  | "enquiry";

export class TrustProviderUnavailableError extends Error {
  service: UnavailableTrustService;

  constructor(service: UnavailableTrustService) {
    super(`${service} verification is unavailable.`);
    this.name = "TrustProviderUnavailableError";
    this.service = service;
  }
}

class LiveRepresentativeVerificationProvider
  implements RepresentativeVerificationProvider
{
  readonly mode = "live" as const;
  readonly dataSource = "lts";
  private readonly directory = new DatabaseRepresentativeDirectoryProvider();

  async verify({ normalizedMobile }: RepresentativeVerificationInput) {
    try {
      return await this.directory.verifyByMobile(normalizedMobile);
    } catch (error) {
      if (error instanceof RepresentativeDirectoryUnavailableError) {
        throw new TrustProviderUnavailableError("representative");
      }
      throw error;
    }
  }
}

class UnavailableRepresentativeVerificationProvider
  implements RepresentativeVerificationProvider
{
  readonly mode = "unavailable" as const;
  readonly dataSource = "unavailable";

  async verify(
    input: RepresentativeVerificationInput
  ): Promise<PublicRepresentative | null> {
    void input;
    throw new TrustProviderUnavailableError("representative");
  }
}

class UnavailableInvoiceVerificationProvider
  implements InvoiceVerificationProvider
{
  readonly mode = "unavailable" as const;

  async verify(
    input: InvoiceVerificationInput
  ): Promise<InvoiceVerificationResult> {
    void input;
    throw new TrustProviderUnavailableError("invoice");
  }
}

class UnavailablePaymentStatusProvider implements PaymentStatusProvider {
  readonly mode = "unavailable" as const;

  async check(input: InvoiceVerificationInput): Promise<PaymentStatusResult> {
    void input;
    throw new TrustProviderUnavailableError("payment");
  }
}

class UnavailableEnquiryVerificationProvider
  implements EnquiryVerificationProvider
{
  readonly mode = "unavailable" as const;

  async verify(
    input: EnquiryVerificationInput
  ): Promise<EnquiryVerificationResult> {
    void input;
    throw new TrustProviderUnavailableError("enquiry");
  }
}

function providerMode(
  value: string | undefined,
  liveValues: string[]
): TrustProviderMode {
  return value && liveValues.includes(value.trim().toLowerCase())
    ? "live"
    : "unavailable";
}

export function getRepresentativeVerificationProvider(): RepresentativeVerificationProvider {
  const configured =
    process.env.TRUST_REPRESENTATIVE_PROVIDER ||
    process.env.REPRESENTATIVE_DIRECTORY_SOURCE ||
    process.env.REPRESENTATIVE_DIRECTORY_MODE;

  return providerMode(configured, ["live", "lts", "database", "excel"]) ===
    "live"
    ? new LiveRepresentativeVerificationProvider()
    : new UnavailableRepresentativeVerificationProvider();
}

/*
 * These factories are the production adapter boundaries. Until an approved
 * LTS contract is supplied, "live" is intentionally not treated as success.
 */
export function getInvoiceVerificationProvider(): InvoiceVerificationProvider {
  void providerMode(process.env.TRUST_INVOICE_PROVIDER, ["live", "lts"]);
  return new UnavailableInvoiceVerificationProvider();
}

export function getPaymentStatusProvider(): PaymentStatusProvider {
  void providerMode(process.env.TRUST_PAYMENT_PROVIDER, ["live", "lts"]);
  return new UnavailablePaymentStatusProvider();
}

export function getEnquiryVerificationProvider(): EnquiryVerificationProvider {
  void providerMode(process.env.TRUST_ENQUIRY_PROVIDER, ["live", "lts"]);
  return new UnavailableEnquiryVerificationProvider();
}

export function getTrustProviderStatus() {
  return {
    representative:
      providerMode(
        process.env.TRUST_REPRESENTATIVE_PROVIDER ||
          process.env.REPRESENTATIVE_DIRECTORY_SOURCE,
        ["live", "lts", "database", "excel"]
      ) === "live"
        ? "live"
        : "unavailable",
    invoice: "unavailable",
    payment: "unavailable",
    enquiry: "unavailable"
  } as const;
}
