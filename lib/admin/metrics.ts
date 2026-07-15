import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { isStorageConfigured } from "@/lib/storage/s3";

type CountRow = { label: string; count: string };
type LatestLeadRow = {
  id: string;
  name: string;
  service_required: string;
  subject: string | null;
  status: string;
  created_at: string | Date;
};
type LatestPaymentRow = {
  id: string;
  invoice_id: string;
  verification_status: string | null;
  amount: string | number | null;
  currency: string | null;
  created_at: string | Date;
};
type LatestRevisionRow = {
  id: string;
  invoice_id: string;
  request_type: string;
  priority: string;
  status: string;
  created_at: string | Date;
};
type PortalEventRow = {
  id: string;
  invoice_id: string;
  action: string;
  created_at: string | Date;
};

function rowsToCounts(rows: CountRow[]) {
  return Object.fromEntries(rows.map((row) => [row.label, Number(row.count || 0)]));
}

async function safeQuery<T extends { [key: string]: unknown }>(
  sql: string,
  values: unknown[] = []
) {
  try {
    if (!isDatabaseConfigured()) return [] as T[];
    const result = await dbQuery<T>(sql, values);
    return result.rows;
  } catch {
    return [] as T[];
  }
}

export async function getAdminMetrics() {
  const [leadCounts, leadStatus, latestLeads, serviceCounts, subjectCounts, countryCounts] =
    await Promise.all([
      safeQuery<{ today: string; week: string; month: string; total: string }>(`
        select
          count(*) filter (where created_at >= date_trunc('day', now()))::text as today,
          count(*) filter (where created_at >= now() - interval '7 days')::text as week,
          count(*) filter (where created_at >= date_trunc('month', now()))::text as month,
          count(*)::text as total
        from quote_leads
      `),
      safeQuery<CountRow>(`
        select status as label, count(*)::text as count
        from quote_leads
        group by status
        order by count(*) desc
      `),
      safeQuery<LatestLeadRow>(`
        select id, name, service_required, subject, status, created_at
        from quote_leads
        order by created_at desc
        limit 10
      `),
      safeQuery<CountRow>(`
        select service_required as label, count(*)::text as count
        from quote_leads
        group by service_required
        order by count(*) desc
        limit 8
      `),
      safeQuery<CountRow>(`
        select coalesce(nullif(subject, ''), 'Unknown') as label, count(*)::text as count
        from quote_leads
        group by label
        order by count(*) desc
        limit 8
      `),
      safeQuery<CountRow>(`
        select coalesce(nullif(country, ''), 'Unknown') as label, count(*)::text as count
        from quote_leads
        group by label
        order by count(*) desc
        limit 8
      `)
    ]);

  const [paymentStatus, latestPayments, revisionStatus, latestRevisions, portalEvents] =
    await Promise.all([
      safeQuery<CountRow>(`
        select coalesce(verification_status, 'unknown') as label, count(*)::text as count
        from payment_events
        where event_type = 'proof_submitted'
        group by label
      `),
      safeQuery<LatestPaymentRow>(`
        select id, invoice_id, verification_status, amount, currency, created_at
        from payment_events
        where event_type = 'proof_submitted'
        order by created_at desc
        limit 8
      `),
      safeQuery<CountRow>(`
        select status as label, count(*)::text as count
        from revision_requests
        group by status
      `),
      safeQuery<LatestRevisionRow>(`
        select id, invoice_id, request_type, priority, status, created_at
        from revision_requests
        order by created_at desc
        limit 8
      `),
      safeQuery<PortalEventRow>(`
        select id, invoice_id, action, created_at
        from preview_download_logs
        order by created_at desc
        limit 8
      `)
    ]);

  const leadTotals = leadCounts[0] ?? {
    today: "0",
    week: "0",
    month: "0",
    total: "0"
  };
  const byStatus = rowsToCounts(leadStatus);
  const total = Number(leadTotals.total || 0);
  const pipeline = ["new", "contacted", "quoted", "converted", "lost"].map((status) => ({
    status,
    count: byStatus[status] || 0,
    percentage: total ? Math.round(((byStatus[status] || 0) / total) * 100) : 0
  }));
  const paymentCounts = rowsToCounts(paymentStatus);
  const revisionCounts = rowsToCounts(revisionStatus);
  const [unassignedLeads, overdueFollowUps, openSlaAlerts] = await Promise.all([
    safeQuery<{ count: string }>(`
      select count(*)::text as count
      from quote_leads
      where assigned_to_admin_user_id is null
        and status not in ('converted','lost','spam')
    `),
    safeQuery<{ count: string }>(`
      select count(*)::text as count
      from quote_leads
      where next_follow_up_at <= now()
        and status not in ('converted','lost','spam')
    `),
    safeQuery<{ count: string }>(`
      select count(*)::text as count
      from sla_alerts
      where status in ('open','acknowledged')
    `)
  ]);

  return {
    leads: {
      today: Number(leadTotals.today || 0),
      week: Number(leadTotals.week || 0),
      month: Number(leadTotals.month || 0),
      total,
      byStatus,
      pipeline,
      latest: latestLeads
    },
    services: {
      byService: serviceCounts.map((row) => ({ label: row.label, count: Number(row.count) })),
      topSubjects: subjectCounts.map((row) => ({ label: row.label, count: Number(row.count) })),
      byCountry: countryCounts.map((row) => ({ label: row.label, count: Number(row.count) })),
      deadlineUrgency: []
    },
    payments: {
      pendingVerification: paymentCounts.pending || 0,
      needsClarification: paymentCounts.needs_clarification || 0,
      verifiedLocal: paymentCounts.verified || 0,
      latest: latestPayments
    },
    revisions: {
      submitted: revisionCounts.submitted || 0,
      underReview: revisionCounts.under_review || 0,
      needsClarification: revisionCounts.needs_clarification || 0,
      outOfScope: revisionCounts.out_of_scope || 0,
      completed: revisionCounts.completed || 0,
      latest: latestRevisions
    },
    portal: {
      latestEvents: portalEvents
    },
    actionQueue: {
      unassignedLeads: Number(unassignedLeads[0]?.count || 0),
      overdueFollowUps: Number(overdueFollowUps[0]?.count || 0),
      openSlaAlerts: Number(openSlaAlerts[0]?.count || 0)
    },
    system: {
      databaseConfigured: isDatabaseConfigured(),
      s3Configured: isStorageConfigured(),
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
      ltsMode: process.env.INTEGRATION_MODE || "disabled",
      pmtMode: process.env.INTEGRATION_MODE || "disabled"
    }
  };
}
