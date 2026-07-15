import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";

async function count(sql: string, values: unknown[] = []) {
  if (!isDatabaseConfigured()) return 0;
  try {
    const result = await dbQuery<{ count: string }>(sql, values);
    return Number(result.rows[0]?.count || 0);
  } catch {
    return 0;
  }
}

export async function getManagerReview() {
  const [
    newLeads,
    unassignedLeads,
    overdueFollowUps,
    quotedPending,
    paymentPending,
    revisionPending,
    criticalAlerts,
    integrationFailures
  ] = await Promise.all([
    count(`select count(*)::text as count from quote_leads where status = 'new'`),
    count(`select count(*)::text as count from quote_leads where assigned_to_admin_user_id is null and status not in ('converted','lost','spam')`),
    count(`select count(*)::text as count from quote_leads where next_follow_up_at <= now() and status not in ('converted','lost','spam')`),
    count(`select count(*)::text as count from quote_leads where status = 'quoted' and converted_at is null`),
    count(`select count(*)::text as count from payment_events where event_type = 'proof_submitted' and coalesce(verification_status, 'pending') in ('pending','needs_clarification')`),
    count(`select count(*)::text as count from revision_requests where status in ('submitted','under_review','needs_clarification')`),
    count(`select count(*)::text as count from sla_alerts where status in ('open','acknowledged') and severity = 'critical'`),
    count(`select count(*)::text as count from integration_logs where status in ('failed','error','deferred') and created_at >= now() - interval '24 hours'`)
  ]);

  return {
    leadLeakage: { newLeads, unassignedLeads, overdueFollowUps },
    revenueQueue: { quotedPending },
    accountsQueue: { paymentPending },
    operationsQueue: { revisionPending },
    teamAccountability: {},
    systemIssues: { criticalAlerts, integrationFailures }
  };
}
