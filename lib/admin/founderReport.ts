import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import {
  calculateConversionRates,
  calculateLeadPipelineMetrics,
  calculateLeakagePoints,
  calculateRevenueByOwner,
  calculateRevenueByService,
  calculateRevenueBySource,
  type RevenueLead
} from "@/lib/revenue/attribution";
import { generateFounderRecommendations } from "@/lib/revenue/recommendations";

type FounderReportFilters = {
  dateFrom?: string | null;
  dateTo?: string | null;
  service?: string | null;
  sourceChannel?: string | null;
  status?: string | null;
};

export async function getFounderReportData(filters: FounderReportFilters = {}) {
  if (!isDatabaseConfigured()) {
    return emptyFounderReport();
  }

  const values: unknown[] = [];
  const where: string[] = [];

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    where.push(`quote_leads.created_at >= $${values.length}::timestamptz`);
  }
  if (filters.dateTo) {
    values.push(filters.dateTo);
    where.push(`quote_leads.created_at <= $${values.length}::timestamptz`);
  }
  if (filters.service) {
    values.push(filters.service);
    where.push(`quote_leads.service_required = $${values.length}`);
  }
  if (filters.sourceChannel) {
    values.push(filters.sourceChannel);
    where.push(`quote_leads.source_channel = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    where.push(`quote_leads.status = $${values.length}`);
  }

  const result = await dbQuery<RevenueLead>(
    `
      select
        quote_leads.id,
        quote_leads.service_required,
        quote_leads.status,
        coalesce(quote_leads.source_channel, 'unknown') as source_channel,
        quote_leads.utm_campaign,
        admin_users.name as assigned_owner,
        quote_leads.lead_quality,
        quote_leads.quoted_amount,
        quote_leads.converted_amount,
        quote_leads.loss_reason,
        quote_leads.created_at,
        quote_leads.converted_at
      from quote_leads
      left join admin_users on admin_users.id = quote_leads.assigned_to_admin_user_id
      ${where.length ? `where ${where.join(" and ")}` : ""}
      order by quote_leads.created_at desc
      limit 5000
    `,
    values
  );
  const leads = result.rows;
  const converted = leads.filter((lead) => lead.status === "converted");
  const quoted = leads.filter((lead) => ["quoted", "converted", "lost"].includes(lead.status));
  const confirmedRevenue = converted.reduce(
    (sum, lead) => sum + Number(lead.converted_amount || 0),
    0
  );
  const estimatedPipelineValue = leads
    .filter((lead) => lead.status === "quoted")
    .reduce((sum, lead) => sum + Number(lead.quoted_amount || 0), 0);
  const rates = calculateConversionRates(leads);

  return {
    summary: {
      totalLeads: leads.length,
      qualifiedLeads: leads.filter((lead) => !["unqualified", "spam"].includes(lead.lead_quality || "")).length,
      contacted: leads.filter((lead) => ["contacted", "quoted", "converted", "lost"].includes(lead.status)).length,
      quoted: quoted.length,
      converted: converted.length,
      lost: leads.filter((lead) => lead.status === "lost").length,
      confirmedRevenue,
      estimatedPipelineValue,
      averageConvertedValue: converted.length
        ? Math.round(confirmedRevenue / converted.length)
        : 0,
      ...rates
    },
    pipeline: calculateLeadPipelineMetrics(leads),
    revenueByService: calculateRevenueByService(leads),
    revenueBySource: calculateRevenueBySource(leads),
    revenueByOwner: calculateRevenueByOwner(leads),
    leadQualityBySource: calculateRevenueBySource(leads),
    lossReasons: calculateLossReasons(leads),
    leakagePoints: calculateLeakagePoints(leads),
    dailyTrend: calculateDailyTrend(leads),
    recommendations: generateFounderRecommendations(leads)
  };
}

function calculateLossReasons(leads: RevenueLead[]) {
  const map = new Map<string, number>();
  for (const lead of leads) {
    if (lead.status !== "lost") continue;
    const reason = lead.loss_reason || "Unknown";
    map.set(reason, (map.get(reason) || 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => ({ label, count }));
}

function calculateDailyTrend(leads: RevenueLead[]) {
  const map = new Map<string, { leads: number; conversions: number; revenue: number }>();
  for (const lead of leads) {
    const day = new Date(lead.created_at).toISOString().slice(0, 10);
    const existing = map.get(day) || { leads: 0, conversions: 0, revenue: 0 };
    existing.leads += 1;
    if (lead.status === "converted") {
      existing.conversions += 1;
      existing.revenue += Number(lead.converted_amount || 0);
    }
    map.set(day, existing);
  }
  return [...map.entries()].map(([date, value]) => ({ date, ...value }));
}

function emptyFounderReport() {
  return {
    summary: {
      totalLeads: 0,
      qualifiedLeads: 0,
      contacted: 0,
      quoted: 0,
      converted: 0,
      lost: 0,
      confirmedRevenue: 0,
      estimatedPipelineValue: 0,
      averageConvertedValue: 0,
      leadToQuoteRate: 0,
      quoteToConversionRate: 0,
      leadToConversionRate: 0
    },
    pipeline: [] as Array<Record<string, unknown>>,
    revenueByService: [] as Array<Record<string, unknown>>,
    revenueBySource: [] as Array<Record<string, unknown>>,
    revenueByOwner: [] as Array<Record<string, unknown>>,
    leadQualityBySource: [] as Array<Record<string, unknown>>,
    lossReasons: [] as Array<Record<string, unknown>>,
    leakagePoints: [] as Array<Record<string, unknown>>,
    dailyTrend: [] as Array<Record<string, unknown>>,
    recommendations: [] as string[]
  };
}
