import { slaRules, type SlaEvaluation, type SlaSeverity } from "@/lib/sla/slaRules";

function evaluateDeadline({
  createdAt,
  minutes,
  reason,
  recommendedAction,
  priorityCritical = false
}: {
  createdAt: string | Date;
  minutes: number;
  reason: string;
  recommendedAction: string;
  priorityCritical?: boolean;
}): SlaEvaluation {
  const started = new Date(createdAt).getTime();
  const deadline = new Date(started + minutes * 60 * 1000);
  const now = Date.now();
  const elapsed = (now - started) / 60000;
  const overdueByMinutes = Math.max(0, Math.round((now - deadline.getTime()) / 60000));
  let status: SlaSeverity = "ok";

  if (now > deadline.getTime()) status = "breached";
  else if (elapsed >= minutes * 0.75) status = "warning";
  if (status === "breached" && (overdueByMinutes > minutes || priorityCritical)) {
    status = "critical";
  }

  return {
    status,
    slaDeadline: deadline,
    overdueByMinutes,
    reason,
    recommendedAction
  };
}

export type LeadSlaInput = {
  id: string;
  status: string;
  lead_priority?: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  next_follow_up_at?: string | Date | null;
};

export function evaluateLeadSla(lead: LeadSlaInput): SlaEvaluation {
  if (lead.lead_priority === "urgent" && lead.status === "new") {
    return evaluateDeadline({
      createdAt: lead.created_at,
      minutes: slaRules.lead.urgentLeadContactMinutes,
      reason: "Urgent lead has not been contacted.",
      recommendedAction: "Contact the student and assign an owner.",
      priorityCritical: true
    });
  }

  if (lead.status === "new") {
    return evaluateDeadline({
      createdAt: lead.created_at,
      minutes: slaRules.lead.newLeadContactMinutes,
      reason: "New lead is waiting for first contact.",
      recommendedAction: "Contact the student and update status."
    });
  }

  if (lead.status === "contacted" || lead.status === "quoted") {
    const base = lead.next_follow_up_at || lead.updated_at;
    return evaluateDeadline({
      createdAt: base,
      minutes:
        lead.status === "quoted"
          ? slaRules.lead.quotedFollowUpMinutes
          : slaRules.lead.contactedFollowUpMinutes,
      reason: lead.status === "quoted" ? "Quoted lead needs follow-up." : "Contacted lead needs follow-up.",
      recommendedAction: "Complete the follow-up or set the next follow-up time."
    });
  }

  return {
    status: "ok",
    slaDeadline: null,
    overdueByMinutes: 0,
    reason: "No active lead SLA.",
    recommendedAction: "No action needed."
  };
}

export type PaymentSlaInput = {
  id: string;
  verification_status?: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

export function evaluatePaymentProofSla(payment: PaymentSlaInput): SlaEvaluation {
  const status = payment.verification_status || "pending";

  if (status === "pending") {
    return evaluateDeadline({
      createdAt: payment.created_at,
      minutes: slaRules.payment.proofReviewMinutes,
      reason: "Payment proof is pending accounts review.",
      recommendedAction: "Accounts should verify, reject, or request clarification."
    });
  }

  if (status === "needs_clarification") {
    return evaluateDeadline({
      createdAt: payment.updated_at,
      minutes: slaRules.payment.clarificationFollowUpMinutes,
      reason: "Payment clarification is pending follow-up.",
      recommendedAction: "Contact the client for clearer proof or payment details."
    });
  }

  return {
    status: "ok",
    slaDeadline: null,
    overdueByMinutes: 0,
    reason: "No active payment SLA.",
    recommendedAction: "No action needed."
  };
}

export type RevisionSlaInput = {
  id: string;
  status: string;
  priority: string;
  created_at: string | Date;
  updated_at: string | Date;
};

export function evaluateRevisionSla(revision: RevisionSlaInput): SlaEvaluation {
  if (revision.status === "submitted") {
    return evaluateDeadline({
      createdAt: revision.created_at,
      minutes:
        revision.priority === "urgent"
          ? slaRules.revision.urgentReviewMinutes
          : slaRules.revision.acknowledgeMinutes,
      reason: "Revision request is waiting for acknowledgement.",
      recommendedAction: "Operations should review and set the next status.",
      priorityCritical: revision.priority === "urgent"
    });
  }

  if (revision.status === "under_review") {
    return evaluateDeadline({
      createdAt: revision.updated_at,
      minutes: slaRules.revision.underReviewMaxMinutes,
      reason: "Revision request has been under review for too long.",
      recommendedAction: "Update the client-facing status or close the review."
    });
  }

  return {
    status: "ok",
    slaDeadline: null,
    overdueByMinutes: 0,
    reason: "No active revision SLA.",
    recommendedAction: "No action needed."
  };
}

export function evaluatePortalEventSla(): SlaEvaluation {
  return {
    status: "ok",
    slaDeadline: null,
    overdueByMinutes: 0,
    reason: "Portal event stored for visibility.",
    recommendedAction: "Review if repeated or linked to payment/download issues."
  };
}
