export type ProviderMode = "live" | "unavailable";

export type ClientIdentity = {
  invoiceReference: string;
  clientReference?: string;
  displayName?: string;
  assignedRepresentative?: {
    name: string;
    designation?: string;
    department?: string;
    status: "Active";
  };
};

export type ClientAuthResult =
  | { verified: true; identity: ClientIdentity }
  | { verified: false };

export type BillingInvoice = {
  invoiceReference: string;
  invoiceDate?: string;
  serviceDescription?: string;
  currency?: string;
  totalAmount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  paymentStatus?: string;
  dueDate?: string;
  updatedAt?: string;
};

export type ProjectSummary = {
  state: "available";
  publicStage: string;
  publicMessage?: string;
  publicDeadline?: string;
  updatedAt?: string;
};

export type ClientDeliverable = {
  fileReference: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  approvedAt?: string;
};

export interface ClientVerificationProvider {
  readonly mode: ProviderMode;
  readonly dataSource: "lts" | "unavailable";
  verify(invoiceReference: string, normalizedMobile: string): Promise<ClientAuthResult>;
}

export interface ClientBillingProvider {
  readonly mode: ProviderMode;
  listInvoices(identity: ClientIdentity): Promise<BillingInvoice[]>;
  getInvoice(identity: ClientIdentity, invoiceReference: string): Promise<BillingInvoice | null>;
}

export interface ClientProjectProvider {
  readonly mode: ProviderMode;
  getProject(identity: ClientIdentity): Promise<ProjectSummary | null>;
}

export interface ClientDeliverablesProvider {
  readonly mode: ProviderMode;
  listFiles(identity: ClientIdentity): Promise<ClientDeliverable[]>;
  createDownload(
    identity: ClientIdentity,
    fileReference: string
  ): Promise<{ downloadUrl: string; expiresAt: string }>;
}
