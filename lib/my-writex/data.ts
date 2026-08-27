import "server-only";

import { ApiError } from "@/lib/api/response";
import {
  assertCustomerClientSession,
  assertInvoiceClientSession,
  type ClientSession
} from "@/lib/auth";
import {
  getDevelopmentCustomer,
  getDevelopmentProjectForCustomer,
  getDevelopmentProjectForInvoice
} from "@/lib/my-writex/dev-fixture";
import type { MyWritexCustomer, MyWritexProject, MyWritexProjectView } from "@/lib/my-writex/types";
import { getInvoice, getOrderFiles, getWorkJourney } from "@/lib/integrations/lts";
import { getPaymentDetails } from "@/lib/integrations/pmt";

export function getMyWritexCustomer(session: ClientSession): MyWritexCustomer {
  assertCustomerClientSession(session);
  const customer = getDevelopmentCustomer(session.customerMasterId!);
  if (!customer) {
    throw new ApiError(
      503,
      "INTEGRATION_UNAVAILABLE",
      "My WriteX customer information is not connected yet."
    );
  }
  return customer;
}

export function getMyWritexProject(
  session: ClientSession,
  projectId: string
): MyWritexProject | null {
  const customer = getMyWritexCustomer(session);
  return getDevelopmentProjectForCustomer(customer.customerMasterId, projectId);
}

export function toMyWritexProjectView(project: MyWritexProject): MyWritexProjectView {
  const view = { ...project } as Partial<MyWritexProject>;
  delete view.customerMasterId;
  return view as MyWritexProjectView;
}

export async function getInvoiceWorkspaceProject(
  session: ClientSession
): Promise<MyWritexProject> {
  assertInvoiceClientSession(session);
  const fixture = getDevelopmentProjectForInvoice(session.invoiceId);
  if (fixture) return fixture;

  const [invoiceResult, journeyResult, filesResult, paymentResult] =
    await Promise.allSettled([
      getInvoice(session.invoiceId),
      getWorkJourney(session.invoiceId),
      getOrderFiles(session.invoiceId),
      getPaymentDetails(session.invoiceId)
    ]);
  const invoice = invoiceResult.status === "fulfilled" ? invoiceResult.value : null;
  const journey = journeyResult.status === "fulfilled" ? journeyResult.value : null;
  const files = filesResult.status === "fulfilled" ? filesResult.value : null;
  const payment = paymentResult.status === "fulfilled" ? paymentResult.value : null;
  const currentStage = journey?.currentStage || "requirement_received";
  const status = stageToProjectStatus(currentStage);

  return {
    id: `invoice-${encodeURIComponent(session.invoiceId)}`,
    customerMasterId: session.clientReference || session.invoiceId,
    invoiceReference: session.invoiceId,
    title: invoice?.subject || invoice?.serviceType || "Your WriteX project",
    service: invoice?.serviceType || "WriteX support",
    category: invoice?.academicLevel || "Client project",
    phase:
      status === "completed"
        ? "completed"
        : status === "delivered"
          ? "delivered"
          : "active",
    status,
    deliveryDate: invoice?.deadline || payment?.dueDate || "To be confirmed",
    nextAction:
      status === "awaiting_information"
        ? "Check whether WriteX needs any further information"
        : "No action needed — your WriteX team is working on it",
    nextActionHref: "/client/overview",
    summary:
      "Your verified project information, approved files and payment status are brought together here.",
    progressLabel: journey?.stages.find((stage) => stage.status === "active")?.label || "In progress",
    timeline:
      journey?.stages.map((stage) => ({
        key: stage.key,
        label: stage.label,
        state:
          stage.status === "complete"
            ? ("complete" as const)
            : stage.status === "active"
              ? ("current" as const)
              : ("upcoming" as const),
        date: stage.completedAt,
        description: stage.description
      })) || [],
    files:
      files?.files.map((file) => ({
        id: file.id,
        name: file.fileName || "Project file",
        kind:
          file.assetType === "brief"
            ? ("brief" as const)
            : file.assetType === "final" || file.assetType === "preview"
              ? ("delivery" as const)
              : ("reference" as const),
        addedAt: invoice?.updatedAt || invoice?.createdAt || "Recently",
        sizeLabel: file.fileSize ? `${Math.ceil(file.fileSize / 1024)} KB` : "Size unavailable"
      })) || [],
    payment: {
      currency: payment?.currency || "INR",
      total: payment?.totalAmount || 0,
      paid: payment?.paidAmount || 0,
      status: payment?.isSettled
        ? "Paid"
        : payment?.paidAmount
          ? "Partially paid"
          : "Payment due"
    },
    canOrderSimilar: status === "completed" || status === "delivered"
  };
}

function stageToProjectStatus(stage: string): MyWritexProject["status"] {
  if (stage.includes("deliver")) return "delivered";
  if (stage.includes("complete")) return "completed";
  if (stage.includes("review") || stage.includes("quality")) return "quality_review";
  if (stage.includes("ready")) return "ready_for_delivery";
  if (stage.includes("requirement") || stage.includes("confirm")) return "awaiting_information";
  return "in_progress";
}
