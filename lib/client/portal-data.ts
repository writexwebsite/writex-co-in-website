import "server-only";

import type { ClientSession } from "@/lib/auth";
import {
  ClientProviderUnavailableError,
  getClientBillingProvider,
  getClientDeliverablesProvider,
  getClientProjectProvider,
  getClientProviderStatus,
  type BillingInvoice,
  type ClientDeliverable,
  type ClientIdentity,
  type ProjectSummary
} from "@/lib/client/providers";
import {
  invoiceReferencesMatch,
  normalizeInvoiceId
} from "@/lib/client/identifiers";
import { getClientTestFixture } from "@/lib/client/test-fixtures";

export type Availability<T> =
  | { state: "available"; data: T; updatedAt?: string }
  | { state: "empty"; message: string }
  | { state: "unavailable"; message: string };

export type ClientPortalOverview = {
  isTestSession: boolean;
  client: {
    displayName: string | null;
    invoiceReference: string;
    clientReference: string | null;
  };
  providers: ReturnType<typeof getClientProviderStatus>;
  billing: Availability<BillingInvoice>;
  trust: {
    invoice: {
      state: "verified" | "test";
      label: "Invoice Verified" | "Test invoice fixture";
    };
    representative: {
      state: "verified" | "unavailable";
      label: string;
      name?: string;
      designation?: string;
    };
    payment: {
      state: "available" | "unavailable";
      label: string;
      status?: string;
    };
    verificationReference: string | null;
    lastVerifiedAt: string | null;
    safePaymentNotice: string;
  };
  project: Availability<ProjectSummary>;
  files: Availability<ClientDeliverable[]>;
};

const safePaymentNotice =
  "Only use payment instructions printed on your official WriteX invoice. If payment instructions change, stop and verify with WriteX.";

export function identityFromSession(session: ClientSession): ClientIdentity {
  return {
    invoiceReference: session.invoiceId,
    clientReference: session.clientReference,
    displayName: session.clientDisplayName
  };
}

export function assertClientOwnsInvoice(
  session: ClientSession,
  invoiceReference: string
) {
  return invoiceReferencesMatch(session.invoiceId, invoiceReference);
}

async function loadBilling(
  identity: ClientIdentity
): Promise<Availability<BillingInvoice>> {
  try {
    const invoice = await getClientBillingProvider().getInvoice(
      identity,
      identity.invoiceReference
    );
    return invoice
      ? { state: "available", data: invoice, updatedAt: invoice.updatedAt }
      : { state: "empty", message: "No billing record is available." };
  } catch (error) {
    if (error instanceof ClientProviderUnavailableError) {
      return {
        state: "unavailable",
        message: "Billing information is currently being connected."
      };
    }
    throw error;
  }
}

async function loadProject(
  identity: ClientIdentity
): Promise<Availability<ProjectSummary>> {
  try {
    const project = await getClientProjectProvider().getProject(identity);
    return project
      ? { state: "available", data: project, updatedAt: project.updatedAt }
      : { state: "empty", message: "No project record is available." };
  } catch (error) {
    if (error instanceof ClientProviderUnavailableError) {
      return {
        state: "unavailable",
        message: "Project tracking is currently being connected."
      };
    }
    throw error;
  }
}

async function loadFiles(
  identity: ClientIdentity
): Promise<Availability<ClientDeliverable[]>> {
  try {
    const files = await getClientDeliverablesProvider().listFiles(identity);
    return files.length
      ? { state: "available", data: files }
      : {
          state: "empty",
          message: "No approved deliverables are currently available."
        };
  } catch (error) {
    if (error instanceof ClientProviderUnavailableError) {
      return {
        state: "unavailable",
        message: "No approved deliverables are currently available."
      };
    }
    throw error;
  }
}

export async function getClientPortalOverview(
  session: ClientSession
): Promise<ClientPortalOverview> {
  if (session.testSession && session.testProfileReference) {
    const fixture = getClientTestFixture(
      session.testProfileReference,
      session.invoiceId
    );
    return {
      isTestSession: true,
      client: {
        displayName: fixture.displayName,
        invoiceReference: session.invoiceId,
        clientReference: session.clientReference || null
      },
      providers: {
        auth: "unavailable",
        billing: "unavailable",
        project: "unavailable",
        deliverables: "unavailable"
      },
      billing: {
        state: "available",
        data: fixture.billing,
        updatedAt: fixture.billing.updatedAt
      },
      trust: {
        invoice: { state: "test", label: "Test invoice fixture" },
        representative: {
          state: "unavailable",
          label: "Representative verification is disabled in test sessions"
        },
        payment: {
          state: "available",
          label: "Test payment status",
          status: fixture.billing.paymentStatus
        },
        verificationReference: null,
        lastVerifiedAt: null,
        safePaymentNotice:
          "This is sanitized demonstration data. Real payment actions are disabled in this test session."
      },
      project: fixture.project
        ? {
            state: "available",
            data: fixture.project,
            updatedAt: fixture.project.updatedAt
          }
        : {
            state: "unavailable",
            message: fixture.projectUnavailableMessage
          },
      files: {
        state: "unavailable",
        message: fixture.filesUnavailableMessage
      }
    };
  }

  const identity = identityFromSession(session);
  const [billing, project, files] = await Promise.all([
    loadBilling(identity),
    loadProject(identity),
    loadFiles(identity)
  ]);
  const paymentStatus =
    billing.state === "available" ? billing.data.paymentStatus : undefined;

  return {
    isTestSession: false,
    client: {
      displayName: session.clientDisplayName || null,
      invoiceReference: session.invoiceId,
      clientReference: session.clientReference || null
    },
    providers: getClientProviderStatus(),
    billing,
    trust: {
      invoice: { state: "verified", label: "Invoice Verified" },
      representative: {
        state: "unavailable",
        label: "Representative verification temporarily unavailable"
      },
      payment: paymentStatus
        ? {
            state: "available",
            label: "Payment status",
            status: paymentStatus
          }
        : {
            state: "unavailable",
            label: "Verification temporarily unavailable"
          },
      verificationReference: session.verificationReference || null,
      lastVerifiedAt: session.verifiedAt || null,
      safePaymentNotice
    },
    project,
    files
  };
}

export async function getClientInvoices(session: ClientSession) {
  if (session.testSession && session.testProfileReference) {
    const fixture = getClientTestFixture(
      session.testProfileReference,
      session.invoiceId
    );
    return {
      state: "available" as const,
      invoices: [fixture.billing],
      message: null
    };
  }

  const identity = identityFromSession(session);
  try {
    const invoices = await getClientBillingProvider().listInvoices(identity);
    return {
      state: invoices.length ? ("available" as const) : ("empty" as const),
      invoices,
      message: invoices.length ? null : "No billing records are available."
    };
  } catch (error) {
    if (error instanceof ClientProviderUnavailableError) {
      return {
        state: "unavailable" as const,
        invoices: [] as BillingInvoice[],
        message: "Billing information is currently being connected."
      };
    }
    throw error;
  }
}

export async function getClientInvoice(
  session: ClientSession,
  invoiceReference: string
) {
  if (!assertClientOwnsInvoice(session, invoiceReference)) return null;
  if (session.testSession && session.testProfileReference) {
    return getClientTestFixture(
      session.testProfileReference,
      session.invoiceId
    ).billing;
  }

  try {
    return await getClientBillingProvider().getInvoice(
      identityFromSession(session),
      normalizeInvoiceId(invoiceReference)
    );
  } catch (error) {
    if (error instanceof ClientProviderUnavailableError) return "unavailable";
    throw error;
  }
}

export async function getClientProject(session: ClientSession) {
  if (session.testSession && session.testProfileReference) {
    const fixture = getClientTestFixture(
      session.testProfileReference,
      session.invoiceId
    );
    return fixture.project
      ? {
          state: "available" as const,
          data: fixture.project,
          updatedAt: fixture.project.updatedAt
        }
      : {
          state: "unavailable" as const,
          message: fixture.projectUnavailableMessage
        };
  }
  return loadProject(identityFromSession(session));
}

export async function getClientFiles(session: ClientSession) {
  if (session.testSession && session.testProfileReference) {
    const fixture = getClientTestFixture(
      session.testProfileReference,
      session.invoiceId
    );
    return {
      state: "unavailable" as const,
      message: fixture.filesUnavailableMessage
    };
  }
  return loadFiles(identityFromSession(session));
}
