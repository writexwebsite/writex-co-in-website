import "server-only";

import { ApiError } from "@/lib/api/response";
import { validateInvoice } from "@/lib/integrations/lts";
import type {
  BillingInvoice,
  ClientAuthResult,
  ClientBillingProvider,
  ClientDeliverable,
  ClientDeliverablesProvider,
  ClientProjectProvider,
  ClientVerificationProvider,
  ProjectSummary,
  ProviderMode
} from "@/lib/client/providers/types";

export class ClientProviderUnavailableError extends ApiError {
  provider: "auth" | "billing" | "project" | "deliverables";

  constructor(provider: "auth" | "billing" | "project" | "deliverables") {
    super(
      503,
      "INTEGRATION_UNAVAILABLE",
      provider === "auth"
        ? "Client verification is temporarily unavailable."
        : `${provider[0].toUpperCase()}${provider.slice(1)} information is temporarily unavailable.`
    );
    this.name = "ClientProviderUnavailableError";
    this.provider = provider;
  }
}

function configuredMode(name: string, liveValue: string): ProviderMode {
  return process.env[name]?.trim().toLowerCase() === liveValue
    ? "live"
    : "unavailable";
}

export class LtsClientVerificationProvider
  implements ClientVerificationProvider
{
  readonly mode = "live" as const;
  readonly dataSource = "lts" as const;

  async verify(
    invoiceReference: string,
    normalizedMobile: string
  ): Promise<ClientAuthResult> {
    const result = await validateInvoice(invoiceReference, normalizedMobile);
    if (!result.valid) return { verified: false };

    return {
      verified: true,
      identity: {
        invoiceReference: result.invoiceId,
        clientReference: result.orderId,
        displayName: result.clientName
      }
    };
  }
}

class UnavailableClientVerificationProvider
  implements ClientVerificationProvider
{
  readonly mode = "unavailable" as const;
  readonly dataSource = "unavailable" as const;

  async verify(): Promise<ClientAuthResult> {
    throw new ClientProviderUnavailableError("auth");
  }
}

export class LtsBillingProvider implements ClientBillingProvider {
  readonly mode = "unavailable" as const;
  async listInvoices(): Promise<BillingInvoice[]> {
    throw new ClientProviderUnavailableError("billing");
  }
  async getInvoice(): Promise<BillingInvoice | null> {
    throw new ClientProviderUnavailableError("billing");
  }
}

export class PmtProjectProvider implements ClientProjectProvider {
  readonly mode = "unavailable" as const;
  async getProject(): Promise<ProjectSummary | null> {
    throw new ClientProviderUnavailableError("project");
  }
}

export class PmtDeliverablesProvider implements ClientDeliverablesProvider {
  readonly mode = "unavailable" as const;
  async listFiles(): Promise<ClientDeliverable[]> {
    throw new ClientProviderUnavailableError("deliverables");
  }
  async createDownload(): Promise<{ downloadUrl: string; expiresAt: string }> {
    throw new ClientProviderUnavailableError("deliverables");
  }
}

export function getClientVerificationProvider(): ClientVerificationProvider {
  return configuredMode("CLIENT_AUTH_PROVIDER", "lts") === "live"
    ? new LtsClientVerificationProvider()
    : new UnavailableClientVerificationProvider();
}

/*
 * The approved LTS billing and PMT contracts are not deployed yet.
 * Their factories remain unavailable even if an environment value is set,
 * preventing a configuration typo from creating fake or cross-system data.
 */
export function getClientBillingProvider(): ClientBillingProvider {
  return new LtsBillingProvider();
}

export function getClientProjectProvider(): ClientProjectProvider {
  return new PmtProjectProvider();
}

export function getClientDeliverablesProvider(): ClientDeliverablesProvider {
  return new PmtDeliverablesProvider();
}

export function getClientProviderStatus() {
  return {
    auth: configuredMode("CLIENT_AUTH_PROVIDER", "lts"),
    billing: "unavailable",
    project: "unavailable",
    deliverables: "unavailable"
  } as const;
}

export type {
  BillingInvoice,
  ClientAuthResult,
  ClientBillingProvider,
  ClientDeliverable,
  ClientDeliverablesProvider,
  ClientIdentity,
  ClientProjectProvider,
  ClientVerificationProvider,
  ProjectSummary
} from "@/lib/client/providers/types";
