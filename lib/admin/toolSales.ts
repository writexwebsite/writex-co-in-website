import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";

async function count(sql: string) {
  if (!isDatabaseConfigured()) return 0;
  try {
    const result = await dbQuery<{ count: string }>(sql);
    return Number(result.rows[0]?.count || 0);
  } catch {
    return 0;
  }
}

async function grouped(sql: string) {
  if (!isDatabaseConfigured()) return [] as Array<{ label: string; count: number; value?: number }>;
  try {
    const result = await dbQuery<{ label: string; count: string; value?: string }>(sql);
    return result.rows.map((row) => ({ label: row.label, count: Number(row.count || 0), value: row.value === undefined ? undefined : Number(row.value || 0) }));
  } catch {
    return [];
  }
}

export async function getToolSalesMetrics() {
  const [toolLeadsToday, hotLeads, completedBuilders, abandonedBuilders, templateDownloads, termPlanInterest, slaBreaches, unassignedLeads, followUpsDue, revenueBySource, revenueByTool, conversionByTool] = await Promise.all([
    count("select count(*)::text as count from quote_leads where tool_type is not null and created_at >= date_trunc('day', now())"),
    count("select count(*)::text as count from quote_leads where tool_type is not null and lead_score >= 80 and first_contact_at is null and status not in ('converted','lost','spam')"),
    count("select count(*)::text as count from tool_sessions where completed_at >= date_trunc('day', now())"),
    count("select count(*)::text as count from tool_sessions where completed_at is null and started_at < now() - interval '30 minutes' and started_at >= now() - interval '7 days'"),
    count("select count(*)::text as count from template_downloads where downloaded_at >= date_trunc('day', now())"),
    count("select count(*)::text as count from term_plan_interests where created_at >= now() - interval '30 days'"),
    count("select count(*)::text as count from quote_leads where tool_type is not null and sla_due_at < now() and first_contact_at is null and status not in ('converted','lost','spam')"),
    count("select count(*)::text as count from quote_leads where tool_type is not null and assigned_to_admin_user_id is null and status not in ('converted','lost','spam')"),
    count("select count(*)::text as count from quote_leads where tool_type is not null and next_action_at <= now() and status not in ('converted','lost','spam')"),
    grouped("select coalesce(source_channel, source, 'unknown') as label, count(*)::text as count, coalesce(sum(converted_amount),0)::text as value from quote_leads group by label order by sum(converted_amount) desc nulls last limit 8"),
    grouped("select coalesce(tool_type, 'quote_form') as label, count(*)::text as count, coalesce(sum(converted_amount),0)::text as value from quote_leads group by label order by sum(converted_amount) desc nulls last limit 8"),
    grouped("select coalesce(tool_type, 'quote_form') as label, count(*)::text as count, round(100.0 * count(*) filter (where status = 'converted') / nullif(count(*),0),1)::text as value from quote_leads group by label order by count(*) desc")
  ]);
  return { toolLeadsToday, hotLeads, completedBuilders, abandonedBuilders, templateDownloads, termPlanInterest, slaBreaches, unassignedLeads, followUpsDue, revenueBySource, revenueByTool, conversionByTool };
}

