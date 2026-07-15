import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import {
  evaluateLeadSla,
  evaluatePaymentProofSla,
  evaluateRevisionSla,
  type LeadSlaInput,
  type PaymentSlaInput,
  type RevisionSlaInput
} from "@/lib/sla/evaluateSla";
import type { SlaEvaluation } from "@/lib/sla/slaRules";

type Summary = {
  alertsCreated: number;
  alertsUpdated: number;
  alertsResolved: number;
};

function alertType(entityType: string, entity: { status?: string; lead_priority?: string | null; verification_status?: string | null }) {
  if (entityType === "quote_lead") {
    if (entity.lead_priority === "urgent" && entity.status === "new") return "urgent_lead_unattended";
    if (entity.status === "quoted") return "quote_follow_up_overdue";
    if (entity.status === "contacted") return "follow_up_overdue";
    return "lead_not_contacted";
  }

  if (entityType === "payment_event") {
    return entity.verification_status === "needs_clarification"
      ? "payment_clarification_pending"
      : "payment_proof_pending";
  }

  return entity.status === "under_review" ? "revision_stuck" : "revision_unacknowledged";
}

async function upsertAlert({
  entityType,
  entityId,
  type,
  evaluation,
  summary
}: {
  entityType: string;
  entityId: string;
  type: string;
  evaluation: SlaEvaluation;
  summary: Summary;
}) {
  if (evaluation.status === "ok") return;

  const result = await dbQuery<{ inserted: boolean }>(
    `
      insert into sla_alerts (
        entity_type,
        entity_id,
        alert_type,
        severity,
        status,
        message,
        recommended_action,
        sla_deadline,
        breached_at,
        metadata
      )
      values ($1, $2, $3, $4, 'open', $5, $6, $7, $8, $9::jsonb)
      on conflict (entity_type, entity_id, alert_type)
      where status in ('open', 'acknowledged')
      do update set
        severity = excluded.severity,
        message = excluded.message,
        recommended_action = excluded.recommended_action,
        sla_deadline = excluded.sla_deadline,
        breached_at = excluded.breached_at,
        metadata = excluded.metadata,
        updated_at = now()
      returning xmax = 0 as inserted
    `,
    [
      entityType,
      entityId,
      type,
      evaluation.status,
      evaluation.reason,
      evaluation.recommendedAction,
      evaluation.slaDeadline?.toISOString() ?? null,
      evaluation.status === "breached" || evaluation.status === "critical"
        ? new Date().toISOString()
        : null,
      JSON.stringify({ overdueByMinutes: evaluation.overdueByMinutes })
    ]
  );

  if (result.rows[0]?.inserted) summary.alertsCreated += 1;
  else summary.alertsUpdated += 1;
}

export async function generateSlaAlerts() {
  const summary: Summary = {
    alertsCreated: 0,
    alertsUpdated: 0,
    alertsResolved: 0
  };

  if (!isDatabaseConfigured()) return summary;

  const leads = await dbQuery<LeadSlaInput>(
    `
      select id, status, lead_priority, created_at, updated_at, next_follow_up_at
      from quote_leads
      where status in ('new', 'contacted', 'quoted')
      limit 500
    `
  );
  for (const lead of leads.rows) {
    const evaluation = evaluateLeadSla(lead);
    await upsertAlert({
      entityType: "quote_lead",
      entityId: lead.id,
      type: alertType("quote_lead", lead),
      evaluation,
      summary
    });
  }

  try {
    const toolLeads = await dbQuery<{ id: string; sla_due_at: string | Date; assigned_to_admin_user_id: string | null; queue: string | null }>(`
      select id, sla_due_at, assigned_to_admin_user_id, queue
      from quote_leads
      where tool_type is not null
        and first_contact_at is null
        and sla_due_at is not null
        and status in ('new','contacted')
      limit 500
    `);
    for (const lead of toolLeads.rows) {
      const deadline = new Date(lead.sla_due_at);
      const overdueByMinutes = Math.max(0, Math.round((Date.now() - deadline.getTime()) / 60000));
      const warning = Date.now() >= deadline.getTime() - 5 * 60000;
      if (!warning) continue;
      const evaluation: SlaEvaluation = {
        status: overdueByMinutes > 30 ? "critical" : overdueByMinutes > 0 ? "breached" : "warning",
        slaDeadline: deadline,
        overdueByMinutes,
        reason: overdueByMinutes > 0 ? `First response is overdue by ${overdueByMinutes} minutes.` : "First-response deadline is approaching.",
        recommendedAction: lead.assigned_to_admin_user_id ? "Contact the lead or escalate to the sales manager." : "Assign an eligible owner immediately."
      };
      await upsertAlert({ entityType: "quote_lead", entityId: lead.id, type: "tool_lead_first_response", evaluation, summary });
      if (overdueByMinutes > 0) {
        await dbQuery("update quote_leads set sla_breached_at = coalesce(sla_breached_at, now()) where id = $1", [lead.id]);
      }
    }
  } catch {
    // Phase 1 columns may not exist until the migration is applied.
  }

  const payments = await dbQuery<PaymentSlaInput>(
    `
      select id, verification_status, created_at, updated_at
      from payment_events
      where event_type = 'proof_submitted'
        and coalesce(verification_status, 'pending') in ('pending', 'needs_clarification')
      limit 500
    `
  );
  for (const payment of payments.rows) {
    const evaluation = evaluatePaymentProofSla(payment);
    await upsertAlert({
      entityType: "payment_event",
      entityId: payment.id,
      type: alertType("payment_event", payment),
      evaluation,
      summary
    });
  }

  try {
    const revisions = await dbQuery<RevisionSlaInput>(
      `
        select id, status, priority, created_at, updated_at
        from revision_requests
        where status in ('submitted', 'under_review')
        limit 500
      `
    );
    for (const revision of revisions.rows) {
      const evaluation = evaluateRevisionSla(revision);
      await upsertAlert({
        entityType: "revision_request",
        entityId: revision.id,
        type: alertType("revision_request", revision),
        evaluation,
        summary
      });
    }
  } catch {
    // Revision table may not exist before migration is applied.
  }

  await dbQuery(
    `
      update sla_alerts
      set status = 'resolved',
          resolved_at = now(),
          updated_at = now()
      where status in ('open', 'acknowledged')
        and entity_type = 'quote_lead'
        and not exists (
          select 1 from quote_leads
          where quote_leads.id::text = sla_alerts.entity_id
            and quote_leads.status in ('new', 'contacted', 'quoted')
        )
    `
  );

  try {
    await dbQuery(`
      update sla_alerts set status = 'resolved', resolved_at = now(), updated_at = now()
      where status in ('open','acknowledged') and alert_type = 'tool_lead_first_response'
        and exists (select 1 from quote_leads where quote_leads.id::text = sla_alerts.entity_id and quote_leads.first_contact_at is not null)
    `);
  } catch {
    // Phase 1 columns may not exist until the migration is applied.
  }

  try {
    await dbQuery(`delete from tool_download_tokens where expires_at < now() - interval '24 hours'`);
  } catch {
    // Tool download storage may not exist until the Phase 1 migration is applied.
  }

  return summary;
}
