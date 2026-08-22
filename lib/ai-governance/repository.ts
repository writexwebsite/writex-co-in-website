import "server-only";

import type { AdminSession } from "@/lib/auth";
import { ApiError } from "@/lib/api/response";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { dbQuery, withDbTransaction } from "@/lib/db";
import {
  fetchAcademyAiUsage,
  syncAcademyAiGovernanceConfig,
  type AcademyGovernanceConfig
} from "@/lib/employees/academy-client";
import { attemptEmployeeAcademySync } from "@/lib/employees/repository";
import {
  salesAcademyProductKey,
  type AiGovernanceProduct,
  type AiPricingVersion,
  type AiGovernanceSnapshot,
  type AiGovernanceStatus
} from "@/lib/ai-governance/domain";
import { salesAcademyAiPolicy } from "@/lib/ai-governance/policy";
import { localEstimatedCostUsd, pricingForInput } from "@/lib/ai-governance/pricing";

type ProductRow = {
  id: string;
  product_key: string;
  display_name: string;
  provider: string;
  provider_project_id: string;
  provider_project_name: string;
  status: AiGovernanceStatus;
  model_id: string;
  reasoning_effort: "none";
  max_primary_calls_per_event: 1;
  input_usd_per_million_tokens: string;
  cached_input_usd_per_million_tokens: string;
  output_usd_per_million_tokens: string;
  higher_capability_fallback_enabled: boolean;
  operating_target_inr: string;
  internal_safety_stop_inr: string;
  master_ceiling_inr: string;
  provider_hard_limit_usd: string;
  budget_fx_rate: string;
  budget_fx_source: string;
  primary_superadmin_employee_id: string | null;
  primary_superadmin_name: string | null;
  last_provider_reconciled_at: Date | null;
  reconciliation_status: "PREPARED" | "ACTIVE" | "DEGRADED";
  updated_at: Date;
};

type PricingRow = {
  id: string;
  pricing_version_key: string;
  provider: "OPENAI";
  model_id: "gpt-5.6-luna";
  service_tier: "STANDARD";
  context_tier: "SHORT" | "LONG";
  input_usd_per_million_tokens: string;
  cached_input_usd_per_million_tokens: string;
  cache_write_usd_per_million_tokens: string;
  output_usd_per_million_tokens: string;
  long_context_threshold_tokens: number;
  currency: "USD";
  effective_at: Date;
  verified_at: Date;
  source_url: string;
  model_source_url: string;
  active: boolean;
  change_reason: string;
  changed_by: string | null;
};

type CapacityRow = {
  planned_bdes: number;
  training_days_per_month: number;
  planned_training_months: number;
  session_minutes_min: number;
  session_minutes_max: number;
  light_events_per_bde_day: number;
  normal_events_per_bde_day: number;
  rigorous_events_per_bde_day: number;
};

function mapProduct(row: ProductRow): AiGovernanceProduct {
  return {
    id: row.id,
    productKey: row.product_key,
    displayName: row.display_name,
    provider: row.provider,
    providerProjectId: row.provider_project_id,
    providerProjectName: row.provider_project_name,
    status: row.status,
    modelId: row.model_id,
    reasoningEffort: row.reasoning_effort,
    maxPrimaryCallsPerEvent: row.max_primary_calls_per_event,
    inputUsdPerMillionTokens: Number(row.input_usd_per_million_tokens),
    cachedInputUsdPerMillionTokens: Number(row.cached_input_usd_per_million_tokens),
    outputUsdPerMillionTokens: Number(row.output_usd_per_million_tokens),
    higherCapabilityFallbackEnabled: row.higher_capability_fallback_enabled,
    operatingTargetInr: Number(row.operating_target_inr),
    internalSafetyStopInr: Number(row.internal_safety_stop_inr),
    masterCeilingInr: Number(row.master_ceiling_inr),
    providerHardLimitUsd: Number(row.provider_hard_limit_usd),
    budgetFxRate: Number(row.budget_fx_rate),
    budgetFxSource: row.budget_fx_source,
    primarySuperadminEmployeeId: row.primary_superadmin_employee_id,
    primarySuperadminName: row.primary_superadmin_name,
    lastProviderReconciledAt: row.last_provider_reconciled_at?.toISOString() ?? null,
    reconciliationStatus: row.reconciliation_status,
    updatedAt: row.updated_at.toISOString()
  };
}

function mapPricing(row: PricingRow): AiPricingVersion {
  return {
    id: row.id,
    versionKey: row.pricing_version_key,
    provider: row.provider,
    modelId: row.model_id,
    serviceTier: row.service_tier,
    contextTier: row.context_tier,
    inputUsdPerMillionTokens: Number(row.input_usd_per_million_tokens),
    cachedInputUsdPerMillionTokens: Number(row.cached_input_usd_per_million_tokens),
    cacheWriteUsdPerMillionTokens: Number(row.cache_write_usd_per_million_tokens),
    outputUsdPerMillionTokens: Number(row.output_usd_per_million_tokens),
    longContextThresholdTokens: row.long_context_threshold_tokens,
    currency: row.currency,
    effectiveAt: row.effective_at.toISOString(),
    verifiedAt: row.verified_at.toISOString(),
    sourceUrl: row.source_url,
    modelSourceUrl: row.model_source_url,
    active: row.active,
    changeReason: row.change_reason,
    changedBy: row.changed_by
  };
}

async function productRow() {
  const result = await dbQuery<ProductRow>(
    `select p.*, e.display_name primary_superadmin_name
     from ai_governance_products p
     left join employees e on e.id = p.primary_superadmin_employee_id
     where p.product_key = $1 limit 1`,
    [salesAcademyProductKey]
  );
  if (!result.rows[0]) throw new ApiError(503, "NOT_CONFIGURED", "Sales Academy AI governance is not configured.");
  return result.rows[0];
}

async function pricingRows(productId: string) {
  const result = await dbQuery<PricingRow>(
    `select v.*, a.email changed_by
     from ai_pricing_versions v
     left join admin_users a on a.id=v.changed_by_admin_id
     where v.product_id=$1
     order by v.active desc,v.effective_at desc,v.pricing_version_key,v.context_tier`,
    [productId]
  );
  return result.rows.map(mapPricing);
}

async function capacityRow(productId: string) {
  const result = await dbQuery<CapacityRow>("select * from ai_training_capacity_settings where product_id=$1", [productId]);
  if (!result.rows[0]) throw new ApiError(503, "NOT_CONFIGURED", "Sales Academy training capacity is not configured.");
  return result.rows[0];
}

function academyConfig(product: AiGovernanceProduct, pricing: AiPricingVersion[], capacity: CapacityRow): AcademyGovernanceConfig {
  if (
    product.provider !== "OPENAI" ||
    product.modelId !== salesAcademyAiPolicy.modelId ||
    product.reasoningEffort !== salesAcademyAiPolicy.reasoningEffort ||
    product.maxPrimaryCallsPerEvent !== salesAcademyAiPolicy.maxPrimaryCallsPerEvent ||
    product.higherCapabilityFallbackEnabled
  ) {
    throw new ApiError(503, "NOT_CONFIGURED", "The Founder-approved Sales Academy model policy could not be verified.");
  }
  const activePricing = pricing.filter((item) => item.active);
  if (activePricing.length !== 2 || !activePricing.some((item) => item.contextTier === "SHORT") || !activePricing.some((item) => item.contextTier === "LONG")) {
    throw new ApiError(503, "NOT_CONFIGURED", "Both Founder-verified Luna Standard pricing tiers are required.");
  }
  return {
    productKey: salesAcademyProductKey,
    provider: "OPENAI",
    providerProjectId: product.providerProjectId,
    modelId: product.modelId,
    reasoningEffort: product.reasoningEffort,
    maxPrimaryCallsPerEvent: product.maxPrimaryCallsPerEvent,
    pricingVersions: activePricing.map((item) => ({
      id: item.id, versionKey: item.versionKey, provider: item.provider, modelId: item.modelId,
      serviceTier: item.serviceTier, contextTier: item.contextTier,
      inputUsdPerMillionTokens: item.inputUsdPerMillionTokens,
      cachedInputUsdPerMillionTokens: item.cachedInputUsdPerMillionTokens,
      cacheWriteUsdPerMillionTokens: item.cacheWriteUsdPerMillionTokens,
      outputUsdPerMillionTokens: item.outputUsdPerMillionTokens,
      longContextThresholdTokens: item.longContextThresholdTokens,
      currency: item.currency, effectiveAt: item.effectiveAt, verifiedAt: item.verifiedAt,
      sourceUrl: item.sourceUrl, modelSourceUrl: item.modelSourceUrl, changeReason: item.changeReason
    })),
    capacity: {
      plannedBdes: capacity.planned_bdes,
      trainingDaysPerMonth: capacity.training_days_per_month,
      plannedTrainingMonths: capacity.planned_training_months,
      sessionMinutesMin: capacity.session_minutes_min,
      sessionMinutesMax: capacity.session_minutes_max,
      lightEventsPerBdeDay: capacity.light_events_per_bde_day,
      normalEventsPerBdeDay: capacity.normal_events_per_bde_day,
      rigorousEventsPerBdeDay: capacity.rigorous_events_per_bde_day
    },
    masterStatus: product.status,
    operatingTargetInr: product.operatingTargetInr,
    internalSafetyStopInr: product.internalSafetyStopInr,
    masterCeilingInr: product.masterCeilingInr,
    providerHardLimitUsd: product.providerHardLimitUsd,
    higherCapabilityFallbackEnabled: false,
    budgetFxRate: product.budgetFxRate,
    budgetFxSource: product.budgetFxSource
  };
}

export async function refreshAcademyUsageLedger() {
  const product = mapProduct(await productRow());
  const activePricing = (await pricingRows(product.id)).filter((item) => item.active);
  const last = await dbQuery<{ occurred_at: string | null }>(
    `select to_char(max(occurred_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') occurred_at
     from ai_usage_ledger where product_id = $1`,
    [product.id]
  );
  const exportData = await fetchAcademyAiUsage(last.rows[0]?.occurred_at || undefined);
  for (const event of exportData.events) {
    const eventPricing = pricingForInput(activePricing, event.inputTokens);
    const localCostUsd = localEstimatedCostUsd({
      inputTokens: event.inputTokens,
      cachedInputTokens: event.cachedInputTokens,
      cacheWriteTokens: event.cacheWriteTokens,
      outputTokens: event.outputTokens
    }, eventPricing);
    const providerCostUsd = event.providerReportedCostUsd;
    await dbQuery(
      `insert into ai_usage_ledger (
        event_id, product_id, environment, occurred_at, employee_id, employee_display_name,
        application_session_id, customer_relationship_id, provider, provider_project_id,
        provider_request_id, model_id, input_tokens, cached_input_tokens, output_tokens,
        reasoning_tokens, total_tokens, visible_customer_bubbles, estimated_cost_usd,
        estimated_cost_inr, outcome, latency_ms, failure_type, retry_count,
        pricing_version_id,cache_write_tokens,local_estimated_cost_usd,local_estimated_cost_inr,
        provider_reported_cost_usd,provider_reported_cost_inr,reconciliation_variance_usd
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28,$29,$30,$31
      ) on conflict (product_id, event_id) do update set
        occurred_at = excluded.occurred_at,
        outcome = excluded.outcome,
        failure_type = excluded.failure_type,
        retry_count = excluded.retry_count,
        input_tokens = excluded.input_tokens,
        cached_input_tokens = excluded.cached_input_tokens,
        cache_write_tokens = excluded.cache_write_tokens,
        output_tokens = excluded.output_tokens,
        reasoning_tokens = excluded.reasoning_tokens,
        total_tokens = excluded.total_tokens,
        visible_customer_bubbles = excluded.visible_customer_bubbles,
        pricing_version_id = excluded.pricing_version_id,
        local_estimated_cost_usd = excluded.local_estimated_cost_usd,
        local_estimated_cost_inr = excluded.local_estimated_cost_inr,
        provider_reported_cost_usd = excluded.provider_reported_cost_usd,
        provider_reported_cost_inr = excluded.provider_reported_cost_inr,
        reconciliation_variance_usd = excluded.reconciliation_variance_usd`,
      [
        event.eventId, product.id, event.environment, event.occurredAt, event.employeeId,
        event.employeeDisplayName, event.applicationSessionId, event.customerRelationshipId,
        event.provider, event.providerProjectId, event.providerRequestId, event.modelId,
        event.inputTokens, event.cachedInputTokens, event.outputTokens, event.reasoningTokens,
        event.totalTokens, event.visibleCustomerBubbles, event.estimatedCostUsd,
        event.estimatedCostInr, event.outcome, event.latencyMs, event.failureType, event.retryCount,
        eventPricing.id, event.cacheWriteTokens, localCostUsd, localCostUsd * product.budgetFxRate,
        providerCostUsd, event.providerReportedCostInr,
        providerCostUsd === null ? null : providerCostUsd - localCostUsd
      ]
    );
  }
  await dbQuery(
    `insert into ai_training_activity_snapshots (
      product_id,month_start,active_bdes,bde_messages_sent,ai_response_events,
      visible_customer_bubbles,training_sessions,captured_at
    ) values ($1,$2,$3,$4,$5,$6,$7,now())
    on conflict (product_id,month_start) do update set
      active_bdes=excluded.active_bdes,bde_messages_sent=excluded.bde_messages_sent,
      ai_response_events=excluded.ai_response_events,visible_customer_bubbles=excluded.visible_customer_bubbles,
      training_sessions=excluded.training_sessions,captured_at=now()`,
    [product.id, exportData.activity.monthStart, exportData.activity.activeBdes,
      exportData.activity.bdeMessagesSent, exportData.activity.aiResponseEvents,
      exportData.activity.visibleCustomerBubbles, exportData.activity.trainingSessions]
  );
  return exportData.events.length;
}

export async function pushAcademyGovernanceConfig() {
  const product = mapProduct(await productRow());
  const [pricing, capacity] = await Promise.all([pricingRows(product.id), capacityRow(product.id)]);
  return syncAcademyAiGovernanceConfig(academyConfig(product, pricing, capacity));
}

export async function getAiGovernanceSnapshot({ refresh = false }: { refresh?: boolean } = {}): Promise<AiGovernanceSnapshot> {
  let academySync: AiGovernanceSnapshot["academySync"] = { status: "SYNCED", message: "Academy usage and master settings are current." };
  if (refresh) {
    try {
      const events = await refreshAcademyUsageLedger();
      await pushAcademyGovernanceConfig();
      academySync = { status: "SYNCED", message: `${events} Academy usage event${events === 1 ? "" : "s"} reconciled into the central ledger.` };
    } catch {
      academySync = { status: "UNAVAILABLE", message: "Academy is temporarily unavailable. The last durable central ledger remains visible." };
    }
  }
  const product = mapProduct(await productRow());
  const [alerts, totals, daily, employees, sessions, models, candidates, pricing, capacity, activity] = await Promise.all([
    dbQuery<{ threshold_percent: number }>("select threshold_percent from ai_governance_alerts where product_id=$1 and status='ACTIVE' order by threshold_percent", [product.id]),
    dbQuery<Record<string, string>>(`select
      coalesce(sum(local_estimated_cost_inr) filter(where occurred_at>=date_trunc('month',now())),0)::text spend_inr,
      coalesce(sum(local_estimated_cost_usd) filter(where occurred_at>=date_trunc('month',now())),0)::text spend_usd,
      sum(provider_reported_cost_inr) filter(where occurred_at>=date_trunc('month',now()))::text provider_spend_inr,
      sum(provider_reported_cost_usd) filter(where occurred_at>=date_trunc('month',now()))::text provider_spend_usd,
      sum(reconciliation_variance_usd) filter(where occurred_at>=date_trunc('month',now()) and provider_reported_cost_usd is not null)::text variance_usd,
      coalesce(sum(input_tokens) filter(where occurred_at>=date_trunc('month',now())),0)::text input_tokens,
      coalesce(sum(cached_input_tokens) filter(where occurred_at>=date_trunc('month',now())),0)::text cached_input_tokens,
      coalesce(sum(output_tokens) filter(where occurred_at>=date_trunc('month',now())),0)::text output_tokens,
      coalesce(sum(reasoning_tokens) filter(where occurred_at>=date_trunc('month',now())),0)::text reasoning_tokens,
      coalesce(sum(total_tokens) filter(where occurred_at>=date_trunc('month',now())),0)::text total_tokens,
      coalesce(sum(visible_customer_bubbles) filter(where occurred_at>=date_trunc('month',now())),0)::text visible_bubbles,
      count(*) filter(where occurred_at>=date_trunc('month',now()))::text events,
      count(*) filter(where occurred_at>=date_trunc('month',now()) and provider='OPENAI')::text paid_events,
      count(*) filter(where occurred_at>=date_trunc('month',now()) and outcome='FAILED')::text failed_events
      from ai_usage_ledger where product_id=$1`, [product.id]),
    dbQuery<Record<string, string>>(`select occurred_at::date::text as usage_day,count(*)::text events,coalesce(sum(local_estimated_cost_inr),0)::text spend_inr,coalesce(sum(total_tokens),0)::text tokens
      from ai_usage_ledger where product_id=$1 and occurred_at>=date_trunc('month',now()) group by occurred_at::date order by occurred_at::date`, [product.id]),
    dbQuery<Record<string, string | null>>(`select employee_id,coalesce(max(employee_display_name),'Unknown employee') name,count(*)::text events,coalesce(sum(local_estimated_cost_inr),0)::text spend_inr,coalesce(sum(total_tokens),0)::text tokens
      from ai_usage_ledger where product_id=$1 and occurred_at>=date_trunc('month',now()) group by employee_id order by sum(local_estimated_cost_inr) desc nulls last limit 20`, [product.id]),
    dbQuery<Record<string, string>>(`select coalesce(application_session_id,'No session') session_id,count(*)::text events,coalesce(sum(local_estimated_cost_inr),0)::text spend_inr,coalesce(sum(total_tokens),0)::text tokens
      from ai_usage_ledger where product_id=$1 and occurred_at>=date_trunc('month',now()) group by application_session_id order by sum(local_estimated_cost_inr) desc nulls last limit 20`, [product.id]),
    dbQuery<Record<string, string>>(`select coalesce(model_id,'Local sandbox') model_id,count(*)::text events,coalesce(sum(local_estimated_cost_inr),0)::text spend_inr,coalesce(sum(total_tokens),0)::text tokens
      from ai_usage_ledger where product_id=$1 and occurred_at>=date_trunc('month',now()) group by model_id order by sum(local_estimated_cost_inr) desc nulls last`, [product.id]),
    dbQuery<{ id: string; employee_code: string; display_name: string; official_email: string }>(`select e.id,e.employee_code,e.display_name,e.official_email
      from employees e join employee_application_access a on a.employee_id=e.id and a.application_key='SALES_ACADEMY'
      where e.employment_status='ACTIVE' and a.enabled=true order by e.display_name`),
    pricingRows(product.id),
    capacityRow(product.id),
    dbQuery<Record<string, string>>(`select active_bdes::text,bde_messages_sent::text,ai_response_events::text,
      visible_customer_bubbles::text,training_sessions::text
      from ai_training_activity_snapshots where product_id=$1 and month_start=date_trunc('month',now())::date`, [product.id])
  ]);
  const t = totals.rows[0] || {};
  const spendInr = Number(t.spend_inr || 0);
  const now = new Date();
  const elapsed = Math.max(1, now.getDate());
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = spendInr * days / elapsed;
  const failedEvents = Number(t.failed_events || 0);
  const paidEvents = Number(t.paid_events || 0);
  const activityRow = activity.rows[0] || {};
  const activePricing = pricing.filter((item) => item.active);
  const averageInput = paidEvents ? Number(t.input_tokens || 0) / paidEvents : 0;
  const averageCached = paidEvents ? Number(t.cached_input_tokens || 0) / paidEvents : 0;
  const averageOutput = paidEvents ? Number(t.output_tokens || 0) / paidEvents : 0;
  const averageTotal = paidEvents ? Number(t.total_tokens || 0) / paidEvents : 0;
  const averageCost = paidEvents ? spendInr / paidEvents : 0;
  const trainingSessions = Number(activityRow.training_sessions || 0);
  const plannedDenominator = capacity.planned_bdes * capacity.training_days_per_month;
  const supportedAtTarget = averageCost ? Math.floor(product.operatingTargetInr / averageCost) : 0;
  const remainingAtTarget = averageCost ? Math.floor(Math.max(0, product.operatingTargetInr - spendInr) / averageCost) : 0;
  const scenarios = [
    ["LIGHT", capacity.light_events_per_bde_day],
    ["NORMAL", capacity.normal_events_per_bde_day],
    ["RIGOROUS", capacity.rigorous_events_per_bde_day]
  ] as const;
  const anomalies: string[] = [];
  if (projected > product.operatingTargetInr) anomalies.push("Projected month-end spend is above the ₹4,000 operating target.");
  if (spendInr >= product.internalSafetyStopInr) anomalies.push("The internal safety stop is active; paid Academy generation must remain blocked.");
  if (failedEvents > 0) anomalies.push(`${failedEvents} failed generation event${failedEvents === 1 ? " requires" : "s require"} review.`);
  if (product.higherCapabilityFallbackEnabled) anomalies.push("Higher-capability model fallback is unexpectedly enabled.");
  return {
    product,
    alerts: alerts.rows.map((row) => row.threshold_percent),
    totals: {
      spendInr,
      spendUsd: Number(t.spend_usd || 0),
      providerReportedSpendInr: t.provider_spend_inr === null || t.provider_spend_inr === undefined ? null : Number(t.provider_spend_inr),
      providerReportedSpendUsd: t.provider_spend_usd === null || t.provider_spend_usd === undefined ? null : Number(t.provider_spend_usd),
      reconciliationVarianceUsd: t.variance_usd === null || t.variance_usd === undefined ? null : Number(t.variance_usd),
      inputTokens: Number(t.input_tokens || 0),
      cachedInputTokens: Number(t.cached_input_tokens || 0),
      outputTokens: Number(t.output_tokens || 0),
      reasoningTokens: Number(t.reasoning_tokens || 0),
      totalTokens: Number(t.total_tokens || 0),
      visibleCustomerBubbles: Number(t.visible_bubbles || 0),
      events: Number(t.events || 0),
      paidEvents,
      failedEvents,
      projectedMonthEndInr: projected,
      percentOfTarget: product.operatingTargetInr ? spendInr / product.operatingTargetInr * 100 : 0,
      percentOfSafetyStop: product.internalSafetyStopInr ? spendInr / product.internalSafetyStopInr * 100 : 0,
      percentOfCeiling: product.masterCeilingInr ? spendInr / product.masterCeilingInr * 100 : 0
    },
    daily: daily.rows.map((row) => ({ day: String(row.usage_day), events: Number(row.events), spendInr: Number(row.spend_inr), tokens: Number(row.tokens) })),
    employees: employees.rows.map((row) => ({ employeeId: row.employee_id, name: String(row.name), events: Number(row.events), spendInr: Number(row.spend_inr), tokens: Number(row.tokens) })),
    sessions: sessions.rows.map((row) => ({ sessionId: String(row.session_id), events: Number(row.events), spendInr: Number(row.spend_inr), tokens: Number(row.tokens) })),
    models: models.rows.map((row) => ({ modelId: String(row.model_id), events: Number(row.events), spendInr: Number(row.spend_inr), tokens: Number(row.tokens) })),
    pricing: { active: activePricing, history: pricing.filter((item) => !item.active) },
    capacity: {
      settings: {
        plannedBdes: capacity.planned_bdes,
        trainingDaysPerMonth: capacity.training_days_per_month,
        plannedTrainingMonths: capacity.planned_training_months,
        sessionMinutesMin: capacity.session_minutes_min,
        sessionMinutesMax: capacity.session_minutes_max,
        monthlyTrainingHoursMin: capacity.planned_bdes * capacity.training_days_per_month * capacity.session_minutes_min / 60,
        monthlyTrainingHoursMax: capacity.planned_bdes * capacity.training_days_per_month * capacity.session_minutes_max / 60
      },
      telemetry: {
        confidence: paidEvents >= 1000 ? "HIGH" : paidEvents >= 100 ? "MEDIUM" : "LOW",
        sampleEvents: paidEvents,
        activeBdes: Number(activityRow.active_bdes || 0),
        bdeMessagesSent: Number(activityRow.bde_messages_sent || 0),
        aiResponseEvents: Number(activityRow.ai_response_events || paidEvents),
        visibleCustomerBubbles: Number(activityRow.visible_customer_bubbles || t.visible_bubbles || 0),
        trainingSessions,
        averageInputTokensPerEvent: averageInput,
        averageCachedInputTokensPerEvent: averageCached,
        averageOutputTokensPerEvent: averageOutput,
        averageTotalTokensPerEvent: averageTotal,
        averageCostInrPerEvent: averageCost,
        averageAiEventsPerSession: trainingSessions ? paidEvents / trainingSessions : 0,
        averageBdeMessagesPerSession: trainingSessions ? Number(activityRow.bde_messages_sent || 0) / trainingSessions : 0,
        averageCustomerBubblesPerSession: trainingSessions ? Number(activityRow.visible_customer_bubbles || 0) / trainingSessions : 0,
        averageCostInrPerSession: trainingSessions ? spendInr / trainingSessions : 0
      },
      planning: {
        estimatedEventsSupportedAtTarget: supportedAtTarget,
        estimatedEventsRemainingAtTarget: remainingAtTarget,
        sustainableEventsPerBdeDayAtTarget: averageCost && plannedDenominator ? supportedAtTarget / plannedDenominator : 0,
        sustainableEventsPerBdeDayAtCeiling: averageCost && plannedDenominator ? Math.floor(product.masterCeilingInr / averageCost) / plannedDenominator : 0,
        estimatedTrainingSessionsSupported: averageCost && trainingSessions && paidEvents ? Math.floor(product.operatingTargetInr / (spendInr / trainingSessions)) : 0
      },
      scenarios: scenarios.map(([label, eventsPerBdeDay]) => {
        const monthlyEvents = plannedDenominator * eventsPerBdeDay;
        const estimatedMonthlyCostInr = monthlyEvents * averageCost;
        return {
          label, eventsPerBdeDay, monthlyEvents,
          estimatedMonthlyTokens: monthlyEvents * averageTotal,
          estimatedMonthlyCostInr,
          percentOfTarget: product.operatingTargetInr ? estimatedMonthlyCostInr / product.operatingTargetInr * 100 : 0,
          percentOfCeiling: product.masterCeilingInr ? estimatedMonthlyCostInr / product.masterCeilingInr * 100 : 0
        };
      })
    },
    candidates: candidates.rows.map((row) => ({ id: row.id, employeeCode: row.employee_code, displayName: row.display_name, officialEmail: row.official_email })),
    anomalies,
    academySync
  };
}

export async function setAiGovernanceStatus(status: "ACTIVE" | "PAUSED", actor: AdminSession) {
  await dbQuery(
    "update ai_governance_products set status=$2,updated_by_admin_id=$3 where product_key=$1",
    [salesAcademyProductKey, status, actor.adminUserId]
  );
  try {
    await pushAcademyGovernanceConfig();
  } catch (error) {
    await dbQuery("update ai_governance_products set status='PAUSED' where product_key=$1", [salesAcademyProductKey]);
    throw error;
  }
  await logAuditEvent({ actorType: "admin", actorId: actor.adminUserId, actorEmail: actor.email, entityType: "ai_governance_product", entityId: salesAcademyProductKey, action: status === "PAUSED" ? "ai_master_paused" : "ai_master_resumed", metadata: { status } });
}

export type PricingVersionInput = {
  versionKey: string;
  short: { input: number; cachedInput: number; cacheWrite: number; output: number };
  long: { input: number; cachedInput: number; cacheWrite: number; output: number };
  longContextThresholdTokens: number;
  effectiveAt: string;
  verifiedAt: string;
  sourceUrl: string;
  modelSourceUrl: string;
  changeReason: string;
};

async function recalculateAiLocalEstimates() {
  await dbQuery(`with rates as (
    select v.* from ai_pricing_versions v join ai_governance_products p on p.id=v.product_id
    where p.product_key=$1 and v.active
  )
  update ai_usage_ledger l set
    pricing_version_id=r.id,
    local_estimated_cost_usd=(greatest(l.input_tokens-l.cached_input_tokens,0)*r.input_usd_per_million_tokens
      + least(l.cached_input_tokens,l.input_tokens)*r.cached_input_usd_per_million_tokens
      + l.cache_write_tokens*r.cache_write_usd_per_million_tokens
      + l.output_tokens*r.output_usd_per_million_tokens)/1000000,
    local_estimated_cost_inr=(greatest(l.input_tokens-l.cached_input_tokens,0)*r.input_usd_per_million_tokens
      + least(l.cached_input_tokens,l.input_tokens)*r.cached_input_usd_per_million_tokens
      + l.cache_write_tokens*r.cache_write_usd_per_million_tokens
      + l.output_tokens*r.output_usd_per_million_tokens)/1000000*p.budget_fx_rate,
    reconciliation_variance_usd=case when l.provider_reported_cost_usd is null then null else
      l.provider_reported_cost_usd-(greatest(l.input_tokens-l.cached_input_tokens,0)*r.input_usd_per_million_tokens
      + least(l.cached_input_tokens,l.input_tokens)*r.cached_input_usd_per_million_tokens
      + l.cache_write_tokens*r.cache_write_usd_per_million_tokens
      + l.output_tokens*r.output_usd_per_million_tokens)/1000000 end
  from rates r join ai_governance_products p on p.id=r.product_id
  where l.product_id=r.product_id and l.model_id=$2
    and r.context_tier=case when l.input_tokens>r.long_context_threshold_tokens then 'LONG' else 'SHORT' end`,
  [salesAcademyProductKey, salesAcademyAiPolicy.modelId]);
}

export async function createAndActivateAiPricingVersion(input: PricingVersionInput, actor: AdminSession) {
  const previous = await withDbTransaction(async (query) => {
    const product = await query<{ id: string }>("select id from ai_governance_products where product_key=$1 for update", [salesAcademyProductKey]);
    if (!product[0]) throw new ApiError(503, "NOT_CONFIGURED", "Sales Academy AI governance is not configured.");
    const existing = await query<{ id: string }>("select id from ai_pricing_versions where product_id=$1 and pricing_version_key=$2 limit 1", [product[0].id, input.versionKey]);
    if (existing[0]) throw new ApiError(409, "BAD_REQUEST", "That pricing version already exists. Choose a new version identifier.");
    const active = await query<{ pricing_version_key: string }>("select distinct pricing_version_key from ai_pricing_versions where product_id=$1 and active", [product[0].id]);
    await query("update ai_pricing_versions set active=false where product_id=$1 and active", [product[0].id]);
    for (const [contextTier, rates] of [["SHORT", input.short], ["LONG", input.long]] as const) {
      await query(`insert into ai_pricing_versions (
        product_id,pricing_version_key,provider,model_id,service_tier,context_tier,
        input_usd_per_million_tokens,cached_input_usd_per_million_tokens,
        cache_write_usd_per_million_tokens,output_usd_per_million_tokens,
        long_context_threshold_tokens,currency,effective_at,verified_at,source_url,
        model_source_url,active,changed_by_admin_id,change_reason
      ) values ($1,$2,'OPENAI',$3,'STANDARD',$4,$5,$6,$7,$8,$9,'USD',$10,$11,$12,$13,true,$14,$15)`,
      [product[0].id,input.versionKey,salesAcademyAiPolicy.modelId,contextTier,rates.input,rates.cachedInput,
        rates.cacheWrite,rates.output,input.longContextThresholdTokens,input.effectiveAt,input.verifiedAt,
        input.sourceUrl,input.modelSourceUrl,actor.adminUserId,input.changeReason]);
    }
    await query(`update ai_governance_products set input_usd_per_million_tokens=$2,
      cached_input_usd_per_million_tokens=$3,output_usd_per_million_tokens=$4,updated_by_admin_id=$5
      where product_key=$1`, [salesAcademyProductKey,input.short.input,input.short.cachedInput,input.short.output,actor.adminUserId]);
    return active.map((row) => row.pricing_version_key);
  });
  try {
    await recalculateAiLocalEstimates();
    await pushAcademyGovernanceConfig();
  } catch (error) {
    await withDbTransaction(async (query) => {
      const product = await query<{ id: string }>("select id from ai_governance_products where product_key=$1 for update", [salesAcademyProductKey]);
      await query("update ai_pricing_versions set active=false where product_id=$1 and pricing_version_key=$2", [product[0].id,input.versionKey]);
      if (previous.length) await query("update ai_pricing_versions set active=true where product_id=$1 and pricing_version_key=any($2::text[])", [product[0].id,previous]);
      const short = await query<{ input_usd_per_million_tokens: string; cached_input_usd_per_million_tokens: string; output_usd_per_million_tokens: string }>("select input_usd_per_million_tokens,cached_input_usd_per_million_tokens,output_usd_per_million_tokens from ai_pricing_versions where product_id=$1 and active and context_tier='SHORT'", [product[0].id]);
      if (short[0]) await query("update ai_governance_products set input_usd_per_million_tokens=$2,cached_input_usd_per_million_tokens=$3,output_usd_per_million_tokens=$4 where id=$1", [product[0].id,short[0].input_usd_per_million_tokens,short[0].cached_input_usd_per_million_tokens,short[0].output_usd_per_million_tokens]);
    });
    await recalculateAiLocalEstimates();
    throw error;
  }
  await logAuditEvent({ actorType:"admin",actorId:actor.adminUserId,actorEmail:actor.email,entityType:"ai_pricing_version",entityId:input.versionKey,action:"ai_pricing_version_activated",metadata:{ previousVersionKeys:previous,changeReason:input.changeReason,sourceUrl:input.sourceUrl,modelSourceUrl:input.modelSourceUrl } });
}

export type CapacitySettingsInput = {
  plannedBdes: number;
  trainingDaysPerMonth: number;
  plannedTrainingMonths: number;
  sessionMinutesMin: number;
  sessionMinutesMax: number;
  changeReason: string;
};

export async function updateAiTrainingCapacity(input: CapacitySettingsInput, actor: AdminSession) {
  const previous = await withDbTransaction(async (query) => {
    const product = await query<{ id: string }>("select id from ai_governance_products where product_key=$1 for update", [salesAcademyProductKey]);
    const before = await query<CapacityRow>("select * from ai_training_capacity_settings where product_id=$1 for update", [product[0].id]);
    await query(`update ai_training_capacity_settings set planned_bdes=$2,training_days_per_month=$3,
      planned_training_months=$4,session_minutes_min=$5,session_minutes_max=$6,
      updated_by_admin_id=$7,change_reason=$8,updated_at=now() where product_id=$1`,
    [product[0].id,input.plannedBdes,input.trainingDaysPerMonth,input.plannedTrainingMonths,input.sessionMinutesMin,input.sessionMinutesMax,actor.adminUserId,input.changeReason]);
    return before[0];
  });
  try {
    await pushAcademyGovernanceConfig();
  } catch (error) {
    if (previous) await dbQuery(`update ai_training_capacity_settings set planned_bdes=$2,training_days_per_month=$3,
      planned_training_months=$4,session_minutes_min=$5,session_minutes_max=$6,updated_at=now() where product_id=(select id from ai_governance_products where product_key=$1)`,
    [salesAcademyProductKey,previous.planned_bdes,previous.training_days_per_month,previous.planned_training_months,previous.session_minutes_min,previous.session_minutes_max]);
    throw error;
  }
  await logAuditEvent({ actorType:"admin",actorId:actor.adminUserId,actorEmail:actor.email,entityType:"ai_training_capacity",entityId:salesAcademyProductKey,action:"ai_training_capacity_updated",metadata:{ before:previous,after:input } });
}

export async function setPrimaryAcademySuperAdmin(
  employeeId: string | null,
  actor: AdminSession,
  options: { confirmTransfer: boolean; reason: string }
) {
  const change = await withDbTransaction(async (query) => {
    const product = await query<{ id: string; primary_superadmin_employee_id: string | null }>(
      "select id,primary_superadmin_employee_id from ai_governance_products where product_key=$1 for update",
      [salesAcademyProductKey]
    );
    if (!product[0]) throw new ApiError(503, "NOT_CONFIGURED", "Sales Academy AI governance is not configured.");
    if (employeeId) {
      const eligible = await query<{ id: string }>(`select e.id from employees e join employee_application_access a on a.employee_id=e.id and a.application_key='SALES_ACADEMY'
        where e.id=$1 and e.employment_status='ACTIVE' and a.enabled=true for update`, [employeeId]);
      if (!eligible[0]) throw new ApiError(400, "BAD_REQUEST", "Choose an active employee who already has Sales Academy access.");
    }
    const oldId = product[0].primary_superadmin_employee_id;
    if (oldId && employeeId && oldId !== employeeId && !options.confirmTransfer) {
      throw new ApiError(409, "BAD_REQUEST", "PRIMARY SUPERADMIN ALREADY ASSIGNED. Confirm Transfer Primary SuperAdmin to continue.");
    }
    const affectedIds = [...new Set([oldId, employeeId].filter((value): value is string => Boolean(value)))];
    const currentAccess = affectedIds.length
      ? await query<{ employee_id: string; application_role: "EMPLOYEE" | "TRAINER" | "MANAGER_TL" | "SUPER_ADMIN" }>(
          "select employee_id,application_role from employee_application_access where application_key='SALES_ACADEMY' and employee_id=any($1::uuid[]) for update",
          [affectedIds]
        )
      : [];
    const rolesBefore = Object.fromEntries(currentAccess.map((row) => [row.employee_id, row.application_role]));
    if (employeeId) {
      await query("update employee_application_access set application_role='SUPER_ADMIN',sync_status='PENDING',sync_version=sync_version+1 where employee_id=$1 and application_key='SALES_ACADEMY'", [employeeId]);
    }
    await query("update ai_governance_products set primary_superadmin_employee_id=$2,updated_by_admin_id=$3 where product_key=$1", [salesAcademyProductKey, employeeId, actor.adminUserId]);
    return { previousPrimaryId: oldId, rolesBefore, affectedIds };
  });
  const toSync = change.affectedIds;
  try {
    for (const id of toSync) {
      const result = await attemptEmployeeAcademySync(id, actor);
      if (!result.synced) {
        throw new ApiError(503, "INTEGRATION_UNAVAILABLE", `${result.error || "Academy access could not be synchronised."} Reference: ${result.requestId}`);
      }
    }
  } catch (error) {
    await withDbTransaction(async (query) => {
      await query(
        "update ai_governance_products set primary_superadmin_employee_id=$2,updated_by_admin_id=$3 where product_key=$1",
        [salesAcademyProductKey, change.previousPrimaryId, actor.adminUserId]
      );
      for (const [id, role] of Object.entries(change.rolesBefore)) {
        await query(
          "update employee_application_access set application_role=$3,sync_status='PENDING',sync_version=sync_version+1 where employee_id=$1 and application_key=$2",
          [id, salesAcademyProductKey, role]
        );
      }
    });
    for (const id of toSync) await attemptEmployeeAcademySync(id, actor).catch(() => undefined);
    await logAuditEvent({
      actorType: "admin",
      actorId: actor.adminUserId,
      actorEmail: actor.email,
      entityType: "ai_governance_product",
      entityId: salesAcademyProductKey,
      action: "academy_primary_superadmin_sync_rolled_back",
      metadata: { previousEmployeeId: change.previousPrimaryId, requestedEmployeeId: employeeId }
    });
    throw error;
  }
  const transferred = Boolean(change.previousPrimaryId && employeeId && change.previousPrimaryId !== employeeId);
  await logAuditEvent({
    actorType: "admin",
    actorId: actor.adminUserId,
    actorEmail: actor.email,
    entityType: "ai_governance_product",
    entityId: salesAcademyProductKey,
    action: transferred
      ? "academy_primary_superadmin_transferred"
      : employeeId
        ? "academy_primary_superadmin_assigned"
        : "academy_primary_superadmin_revoked",
    metadata: {
      previousEmployeeId: change.previousPrimaryId,
      employeeId,
      oldPrimaryRolePreserved: transferred,
      reason: options.reason,
      actionSource: "WEBSITE_ADMIN_AI_GOVERNANCE"
    }
  });
}
