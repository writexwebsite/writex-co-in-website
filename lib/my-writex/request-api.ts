import "server-only";

import { ApiError, badRequest, forbidden } from "@/lib/api/response";
import type { ClientSession } from "@/lib/auth";
import { getMyWritexCustomer, getMyWritexProject } from "@/lib/my-writex/data";
import { requestOwnerFromSession } from "@/lib/my-writex/request-repository";
import { sanitizeRequestInput, validateCompleteRequest } from "@/lib/my-writex/request-validation";

export function requestOperation(value: unknown) {
  const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (body.operation !== "save_draft" && body.operation !== "submit") throw badRequest("Choose a valid request operation.");
  return body.operation;
}

export function validatedRequestInput(session: ClientSession, raw: unknown, complete: boolean) {
  let input;
  try {
    input = sanitizeRequestInput(raw);
  } catch (error) {
    throw badRequest(error instanceof Error ? error.message : "The request is invalid.");
  }

  if (session.authScope === "customer") {
    const customer = getMyWritexCustomer(session);
    if (input.source === "invoice_workspace") throw forbidden();
    input.sourceInvoiceReference = undefined;
    if (input.source === "similar_project") {
      if (!input.sourceProjectId) throw badRequest("Choose an authorised source project.");
      const project = getMyWritexProject(session, input.sourceProjectId);
      if (!project) throw forbidden("That source project is not available for this customer.");
      input.sourceProjectTitle = project.title;
    } else {
      input.sourceProjectId = undefined;
      input.sourceProjectTitle = undefined;
    }
    if (input.source === "upcoming_work") {
      const upcoming = customer.upcomingWork.find((item) => item.id === input.sourceUpcomingId);
      if (!upcoming) throw forbidden("That upcoming-work item is not available for this customer.");
      input.sourceUpcomingTitle = upcoming.title;
    } else {
      input.sourceUpcomingId = undefined;
      input.sourceUpcomingTitle = undefined;
    }
  } else if (session.authScope === "invoice") {
    if (input.source !== "invoice_workspace") throw forbidden();
    input.sourceProjectId = undefined;
    input.sourceUpcomingId = undefined;
    input.sourceUpcomingTitle = undefined;
    input.sourceInvoiceReference = session.invoiceId;
  } else {
    throw forbidden();
  }

  if (complete) {
    const errors = validateCompleteRequest(input.fields);
    if (errors.length) throw new ApiError(400, "BAD_REQUEST", errors[0]);
  }
  requestOwnerFromSession(session);
  return input;
}

export function safeNoteBody(value: unknown, max = 2000) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}
