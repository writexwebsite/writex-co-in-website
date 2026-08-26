import type {
  BillingInvoice,
  ClientDeliverable,
  ProjectSummary
} from "@/lib/client/providers/types";
import type { ClientTestProfileReference } from "@/lib/client/test-access-types";

export type ClientTestFixture = {
  displayName: "Test Client";
  billing: BillingInvoice;
  project: ProjectSummary | null;
  projectUnavailableMessage: string;
  files: ClientDeliverable[];
  filesUnavailableMessage: string;
};

const fixtureDate = "2026-07-23T00:00:00.000Z";

export function getClientTestFixture(
  profile: ClientTestProfileReference,
  invoiceReference: string
): ClientTestFixture {
  const base = {
    displayName: "Test Client" as const,
    files: [] as ClientDeliverable[],
    filesUnavailableMessage:
      "Real file downloads are disabled in this test session."
  };

  if (profile === "fully_paid") {
    return {
      ...base,
      billing: {
        invoiceReference,
        invoiceDate: "2026-07-01",
        serviceDescription: "Sanitized Academic Review Test",
        currency: "INR",
        totalAmount: 18000,
        paidAmount: 18000,
        balanceAmount: 0,
        paymentStatus: "Fully Paid",
        dueDate: "2026-07-15",
        updatedAt: fixtureDate
      },
      project: null,
      projectUnavailableMessage:
        "Project tracking is not included in this billing test profile."
    };
  }

  if (profile === "project_in_progress") {
    return {
      ...base,
      billing: {
        invoiceReference,
        invoiceDate: "2026-07-02",
        serviceDescription: "Sanitized Dissertation Support Test",
        currency: "INR",
        totalAmount: 32000,
        paidAmount: 16000,
        balanceAmount: 16000,
        paymentStatus: "Partially Paid",
        dueDate: "2026-07-30",
        updatedAt: fixtureDate
      },
      project: {
        state: "available",
        publicStage: "Work in Progress",
        publicMessage:
          "This is sanitized demonstration data for the project-progress view.",
        publicDeadline: "2026-07-30",
        updatedAt: fixtureDate
      },
      projectUnavailableMessage: ""
    };
  }

  if (profile === "delivered") {
    return {
      ...base,
      billing: {
        invoiceReference,
        invoiceDate: "2026-06-20",
        serviceDescription: "Sanitized Delivered Project Test",
        currency: "INR",
        totalAmount: 26000,
        paidAmount: 26000,
        balanceAmount: 0,
        paymentStatus: "Fully Paid",
        dueDate: "2026-07-10",
        updatedAt: fixtureDate
      },
      project: {
        state: "available",
        publicStage: "Delivered",
        publicMessage:
          "This delivered state is sanitized demonstration data. No real deliverable is attached.",
        updatedAt: fixtureDate
      },
      projectUnavailableMessage: ""
    };
  }

  return {
    ...base,
    billing: {
      invoiceReference,
      invoiceDate: "2026-07-01",
      serviceDescription: "Sanitized Academic Support Test",
      currency: "INR",
      totalAmount: 24000,
      paidAmount: 12000,
      balanceAmount: 12000,
      paymentStatus: "Partially Paid",
      dueDate: "2026-07-28",
      updatedAt: fixtureDate
    },
    project: null,
    projectUnavailableMessage:
      "Project tracking is not included in this billing test profile."
  };
}
