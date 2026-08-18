"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  Calculator,
  CircleDollarSign,
  Database,
  ExternalLink,
  Gauge,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  UserCog
} from "lucide-react";
import { AdminStatusBadge } from "@/components/admin/AdminPrimitives";
import type { AiGovernanceSnapshot } from "@/lib/ai-governance/domain";

const inr = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(value);
const count = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);

export function AiGovernanceControlPlane({ initial }: { initial: AiGovernanceSnapshot }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(initial.academySync.message);
  const [error, setError] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(productId(initial));
  const [pendingEmployeeId, setPendingEmployeeId] = useState<string | null | undefined>(undefined);
  const product = data.product;
  const totals = data.totals;
  const capacity = data.capacity;

  async function action(body: Record<string, unknown>, key: string, endpoint = "/api/admin/ai-governance") {
    setBusy(key);
    setError("");
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => null) as { data?: AiGovernanceSnapshot; error?: { message?: string } } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error?.message || "The AI governance action could not be completed.");
      setData(payload.data);
      setMessage(payload.data.academySync.message);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The AI governance action could not be completed.");
    } finally {
      setBusy("");
    }
  }

  async function assignPrimary(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingEmployeeId(selectedEmployeeId || null);
  }

  async function saveCapacity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await action({
      action: "update_capacity",
      plannedBdes: Number(form.get("plannedBdes")),
      trainingDaysPerMonth: Number(form.get("trainingDaysPerMonth")),
      plannedTrainingMonths: Number(form.get("plannedTrainingMonths")),
      sessionMinutesMin: Number(form.get("sessionMinutesMin")),
      sessionMinutesMax: Number(form.get("sessionMinutesMax")),
      changeReason: String(form.get("changeReason") || "Founder-approved capacity planning update.")
    }, "capacity");
  }

  async function activatePricing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rate = (name: string) => Number(form.get(name));
    await action({
      action: "activate_pricing",
      versionKey: String(form.get("versionKey")),
      short: { input: rate("shortInput"), cachedInput: rate("shortCached"), cacheWrite: rate("shortWrite"), output: rate("shortOutput") },
      long: { input: rate("longInput"), cachedInput: rate("longCached"), cacheWrite: rate("longWrite"), output: rate("longOutput") },
      longContextThresholdTokens: Number(form.get("longThreshold")),
      effectiveAt: new Date(String(form.get("effectiveAt"))).toISOString(),
      verifiedAt: new Date().toISOString(),
      sourceUrl: String(form.get("sourceUrl")),
      modelSourceUrl: String(form.get("modelSourceUrl")),
      changeReason: String(form.get("pricingReason"))
    }, "pricing");
  }

  async function confirmPrimary() {
    await action({ employeeId: pendingEmployeeId ?? null }, "primary", "/api/admin/ai-governance/primary-superadmin");
    setPendingEmployeeId(undefined);
  }

  return (
    <div className="space-y-6">
      {error ? <div role="alert" className="flex gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
      {message ? <div role="status" className="flex gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{message}</div> : null}

      <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-wxIndigo900">{product.displayName}</h2>
              <AdminStatusBadge tone={product.status === "ACTIVE" ? "success" : product.status === "PAUSED" ? "warning" : "danger"}>{product.status}</AdminStatusBadge>
              <AdminStatusBadge tone="info">Master control</AdminStatusBadge>
            </div>
            <p className="mt-2 text-sm leading-6 text-wxIndigo500">Dedicated provider project, locked economy model, durable usage ledger and one audited Academy administrator.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => action({ action: "refresh" }, "refresh")} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold text-wxIndigo700 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${busy === "refresh" ? "animate-spin" : ""}`} />Refresh usage</button>
            <button onClick={() => action({ action: "set_status", status: product.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }, "status")} disabled={Boolean(busy)} className={`inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-60 ${product.status === "ACTIVE" ? "bg-red-700" : "wx-gradient-action"}`}>{product.status === "ACTIVE" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{product.status === "ACTIVE" ? "Pause paid generation" : "Resume master control"}</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<CircleDollarSign className="h-4 w-4" />} label="Local estimated cost" value={inr(totals.spendInr)} detail={`${usd(totals.spendUsd)} from active pricing`} />
        <Metric icon={<Gauge className="h-4 w-4" />} label="Projected month end" value={inr(totals.projectedMonthEndInr)} detail={`${count(totals.percentOfTarget)}% of operating target`} />
        <Metric icon={<Bot className="h-4 w-4" />} label="Token usage" value={count(totals.totalTokens)} detail={`${count(totals.events)} governed events`} />
        <Metric icon={<ShieldCheck className="h-4 w-4" />} label="Safety stop headroom" value={inr(Math.max(0, product.internalSafetyStopInr - totals.spendInr))} detail={`Stops internally at ${inr(product.internalSafetyStopInr)}`} />
      </section>

      <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft md:p-6">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <div>
            <h2 className="text-lg font-semibold text-wxIndigo900">Budget protection</h2>
            <p className="mt-1 text-sm leading-6 text-wxIndigo500">Provider and internal limits are independent. The lower control blocks first.</p>
            <div className="mt-5 space-y-4">
              <BudgetBar label="Operating target" value={totals.spendInr} limit={product.operatingTargetInr} tone="bg-emerald-500" />
              <BudgetBar label="Internal safety stop" value={totals.spendInr} limit={product.internalSafetyStopInr} tone="bg-amber-500" />
              <BudgetBar label="Master ceiling" value={totals.spendInr} limit={product.masterCeilingInr} tone="bg-red-600" />
            </div>
          </div>
          <dl className="grid content-start gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
            <Detail label="Provider project" value={`${product.providerProjectName} · ${product.providerProjectId}`} />
            <Detail label="Allowed model" value={product.modelId} />
            <Detail label="Reasoning" value={`${product.reasoningEffort} · Founder locked`} />
            <Detail label="Primary calls per event" value={`${product.maxPrimaryCallsPerEvent} maximum`} />
            <Detail label="Cost evidence" value={totals.providerReportedSpendUsd === null ? "Local estimate available · provider-reported cost not yet imported" : `${usd(totals.providerReportedSpendUsd)} provider reported · ${usd(totals.reconciliationVarianceUsd || 0)} variance`} />
            <Detail label="Higher-capability fallback" value={product.higherCapabilityFallbackEnabled ? "Enabled" : "Disabled and locked"} />
            <Detail label="Provider hard limit" value={`${usd(product.providerHardLimitUsd)} · enforced`} />
            <Detail label="Alerts" value={data.alerts.map((threshold) => `${threshold}%`).join(" · ")} />
            <Detail label="Provider reconciliation" value={`${product.reconciliationStatus} · admin credential not stored in the app`} />
          </dl>
        </div>
      </section>

      <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div><div className="flex items-center gap-2"><Database className="h-5 w-5 text-wxViolet700"/><h2 className="text-lg font-semibold text-wxIndigo900">AI pricing source</h2></div><p className="mt-1 text-sm leading-6 text-wxIndigo500">Audited Luna Standard rates drive local estimates. Provider-reported billing stays separate.</p></div>
          <AdminStatusBadge tone="success">{data.pricing.active[0]?.versionKey || "Not configured"}</AdminStatusBadge>
        </div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-y border-wxBorder bg-wxSurfaceSoft text-xs uppercase text-wxIndigo500"><tr><th className="px-4 py-3">Context</th><th className="px-4 py-3">Input</th><th className="px-4 py-3">Cached</th><th className="px-4 py-3">Cache write</th><th className="px-4 py-3">Output</th><th className="px-4 py-3">Verified</th><th className="px-4 py-3">Source</th></tr></thead><tbody>{data.pricing.active.map((item)=><tr key={item.id} className="border-b border-wxBorder"><td className="px-4 py-3 font-semibold text-wxIndigo900">{item.contextTier}{item.contextTier === "LONG" ? ` · >${count(item.longContextThresholdTokens)} input` : " · standard short context"}</td><td className="px-4 py-3">{usd(item.inputUsdPerMillionTokens)}</td><td className="px-4 py-3">{usd(item.cachedInputUsdPerMillionTokens)}</td><td className="px-4 py-3">{usd(item.cacheWriteUsdPerMillionTokens)}</td><td className="px-4 py-3">{usd(item.outputUsdPerMillionTokens)}</td><td className="px-4 py-3">{new Date(item.verifiedAt).toLocaleString("en-IN")}</td><td className="px-4 py-3"><a className="inline-flex items-center gap-1 font-semibold text-wxViolet700 hover:underline" href={item.sourceUrl} target="_blank" rel="noreferrer">Official pricing<ExternalLink className="h-3.5 w-3.5"/></a></td></tr>)}</tbody></table></div>
        <details className="mt-5 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"><summary className="cursor-pointer font-semibold text-wxIndigo900">Pricing version history and audited update</summary>
          <div className="mt-4 space-y-4"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="text-xs uppercase text-wxIndigo500"><th className="pb-2">Version</th><th className="pb-2">Context</th><th className="pb-2">Effective</th><th className="pb-2">Reason</th></tr></thead><tbody>{data.pricing.history.map((item)=><tr key={item.id} className="border-t border-wxBorder"><td className="py-2 font-semibold">{item.versionKey}</td><td className="py-2">{item.contextTier}</td><td className="py-2">{new Date(item.effectiveAt).toLocaleDateString("en-IN")}</td><td className="py-2">{item.changeReason}</td></tr>)}</tbody></table></div>
          <form onSubmit={activatePricing} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="New version ID"><input required name="versionKey" placeholder="luna-standard-YYYYMMDD-v2" className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"/></Field>
            <Field label="Effective date"><input required type="datetime-local" name="effectiveAt" className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"/></Field>
            <Field label="Long-context threshold"><input required type="number" name="longThreshold" defaultValue={272000} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"/></Field>
            <Field label="Change reason"><input required minLength={12} name="pricingReason" className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"/></Field>
            {[["shortInput","Short input",.2],["shortCached","Short cached",.02],["shortWrite","Short cache write",.25],["shortOutput","Short output",1.2],["longInput","Long input",.4],["longCached","Long cached",.04],["longWrite","Long cache write",.5],["longOutput","Long output",1.8]].map(([name,label,value])=><Field key={String(name)} label={`${label} / 1M`}><input required type="number" min="0" step="0.000001" name={String(name)} defaultValue={Number(value)} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"/></Field>)}
            <Field label="Pricing source"><input required type="url" name="sourceUrl" defaultValue="https://developers.openai.com/api/docs/pricing" className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"/></Field>
            <Field label="Model source"><input required type="url" name="modelSourceUrl" defaultValue="https://developers.openai.com/api/docs/models/gpt-5.6-luna" className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"/></Field>
            <div className="md:col-span-2 xl:col-span-4"><button disabled={Boolean(busy)} className="wx-gradient-action min-h-11 rounded-md px-5 text-sm font-semibold text-white disabled:opacity-60">{busy === "pricing" ? "Verifying and synchronising..." : "Create and activate pricing version"}</button></div>
          </form></div>
        </details>
      </section>

      <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-wxViolet700"/><h2 className="text-lg font-semibold text-wxIndigo900">AI Training Capacity</h2></div><p className="mt-1 text-sm leading-6 text-wxIndigo500">Planning intelligence for paid AI response events. This is not an employee message quota.</p></div><AdminStatusBadge tone={capacity.telemetry.confidence === "LOW" ? "warning" : "success"}>{capacity.telemetry.confidence}-confidence estimate</AdminStatusBadge></div>
        <div className="mt-5 grid gap-4 border-y border-wxBorder py-5 sm:grid-cols-2 xl:grid-cols-4"><CapacityStat label="Planned BDEs" value={count(capacity.settings.plannedBdes)} detail={`${capacity.settings.trainingDaysPerMonth} training days · ${capacity.settings.plannedTrainingMonths} months`}/><CapacityStat label="Daily session" value={`${capacity.settings.sessionMinutesMin}–${capacity.settings.sessionMinutesMax} min`} detail={`${count(capacity.settings.monthlyTrainingHoursMin)}–${count(capacity.settings.monthlyTrainingHoursMax)} BDE hours/month`}/><CapacityStat label="Average cost / AI event" value={inr(capacity.telemetry.averageCostInrPerEvent)} detail={`${count(capacity.telemetry.sampleEvents)} paid event sample`}/><CapacityStat label="Sustainable / BDE / day" value={count(capacity.planning.sustainableEventsPerBdeDayAtTarget)} detail={`${count(capacity.planning.sustainableEventsPerBdeDayAtCeiling)} at the absolute ceiling`}/></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3"><Detail label="BDE messages sent" value={count(capacity.telemetry.bdeMessagesSent)}/><Detail label="Paid AI response events" value={count(capacity.telemetry.aiResponseEvents)}/><Detail label="Visible customer bubbles" value={count(capacity.telemetry.visibleCustomerBubbles)}/><Detail label="Average input / cached / output" value={`${count(capacity.telemetry.averageInputTokensPerEvent)} / ${count(capacity.telemetry.averageCachedInputTokensPerEvent)} / ${count(capacity.telemetry.averageOutputTokensPerEvent)} tokens per AI event`}/><Detail label="Average session" value={`${count(capacity.telemetry.averageAiEventsPerSession)} AI events · ${count(capacity.telemetry.averageBdeMessagesPerSession)} BDE messages · ${count(capacity.telemetry.averageCustomerBubblesPerSession)} customer bubbles`}/><Detail label="Remaining operating capacity" value={`${count(capacity.planning.estimatedEventsRemainingAtTarget)} estimated AI events · ${count(capacity.planning.estimatedTrainingSessionsSupported)} sessions`}/></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-y border-wxBorder bg-wxSurfaceSoft text-xs uppercase text-wxIndigo500"><tr><th className="px-4 py-3">Scenario</th><th className="px-4 py-3">Events / BDE / day</th><th className="px-4 py-3">Monthly events</th><th className="px-4 py-3">Estimated tokens</th><th className="px-4 py-3">Estimated cost</th><th className="px-4 py-3">Target / ceiling</th></tr></thead><tbody>{capacity.scenarios.map((item)=><tr key={item.label} className="border-b border-wxBorder"><td className="px-4 py-3 font-semibold text-wxIndigo900">{item.label}</td><td className="px-4 py-3">{count(item.eventsPerBdeDay)}</td><td className="px-4 py-3">{count(item.monthlyEvents)}</td><td className="px-4 py-3">{count(item.estimatedMonthlyTokens)}</td><td className="px-4 py-3">{inr(item.estimatedMonthlyCostInr)}</td><td className="px-4 py-3">{count(item.percentOfTarget)}% / {count(item.percentOfCeiling)}%</td></tr>)}</tbody></table></div>
        <form onSubmit={saveCapacity} className="mt-5 grid gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 sm:grid-cols-2 xl:grid-cols-6"><Field label="Planned BDEs"><input name="plannedBdes" type="number" min="1" defaultValue={capacity.settings.plannedBdes} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"/></Field><Field label="Days / month"><input name="trainingDaysPerMonth" type="number" min="1" max="31" defaultValue={capacity.settings.trainingDaysPerMonth} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"/></Field><Field label="Training months"><input name="plannedTrainingMonths" type="number" min="1" defaultValue={capacity.settings.plannedTrainingMonths} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"/></Field><Field label="Session min"><input name="sessionMinutesMin" type="number" min="5" defaultValue={capacity.settings.sessionMinutesMin} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"/></Field><Field label="Session max"><input name="sessionMinutesMax" type="number" min="5" defaultValue={capacity.settings.sessionMinutesMax} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"/></Field><Field label="Change reason"><input name="changeReason" minLength={8} defaultValue="Founder-approved pilot planning assumptions." className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"/></Field><div className="sm:col-span-2 xl:col-span-6"><button disabled={Boolean(busy)} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-5 text-sm font-semibold text-wxIndigo800 disabled:opacity-60">{busy === "capacity" ? "Synchronising..." : "Update planning assumptions"}</button></div></form>
      </section>

      <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft md:p-6">
        <div className="flex items-center gap-2"><UserCog className="h-5 w-5 text-wxViolet700" /><h2 className="text-lg font-semibold text-wxIndigo900">Primary Academy Super Admin</h2></div>
        <p className="mt-1 text-sm leading-6 text-wxIndigo500">Provision exactly one existing company employee identity. Assignment and revocation are signed, session-aware and audited.</p>
        <form onSubmit={assignPrimary} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-1.5 text-sm font-semibold text-wxIndigo800">Existing employee
            <select name="employeeId" value={selectedEmployeeId} onChange={(event) => { setSelectedEmployeeId(event.target.value); setPendingEmployeeId(undefined); }} className="min-h-11 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 font-normal text-wxIndigo900">
              <option value="">No primary Academy Super Admin</option>
              {data.candidates.map((employee) => <option key={employee.id} value={employee.id}>{employee.displayName} · {employee.employeeCode}</option>)}
            </select>
          </label>
          <button disabled={Boolean(busy)} className="wx-gradient-action inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold text-white disabled:opacity-60"><UserCog className="h-4 w-4" />Review administrator change</button>
        </form>
        {pendingEmployeeId !== undefined ? <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Confirm primary administrator change</p>
          <p className="mt-1 leading-6">{pendingEmployeeId ? `Assign ${data.candidates.find((candidate) => candidate.id === pendingEmployeeId)?.displayName || "the selected employee"} as the one primary Sales Academy Super Admin?` : "Revoke the current primary Sales Academy Super Admin?"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={confirmPrimary} disabled={Boolean(busy)} className="wx-gradient-action min-h-10 rounded-md px-4 font-semibold text-white disabled:opacity-60">{busy === "primary" ? "Synchronising..." : "Confirm change"}</button>
            <button type="button" onClick={() => setPendingEmployeeId(undefined)} disabled={Boolean(busy)} className="min-h-10 rounded-md border border-amber-400 bg-white px-4 font-semibold">Cancel</button>
          </div>
        </div> : null}
        <p className="mt-3 text-xs text-wxIndigo500">Current: {product.primarySuperadminName || "Not assigned"}. Normal employee screens cannot grant this role.</p>
      </section>

      {data.anomalies.length ? <section className="rounded-lg border border-amber-300 bg-amber-50 p-5"><h2 className="font-semibold text-amber-950">Anomaly attention</h2><ul className="mt-3 space-y-2 text-sm text-amber-900">{data.anomalies.map((item) => <li key={item} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{item}</li>)}</ul></section> : null}

      <UsageTable title="Usage by employee" headers={["Employee", "Events", "Tokens", "Spend"]} rows={data.employees.map((item) => [item.name, count(item.events), count(item.tokens), inr(item.spendInr)])} empty="No governed employee usage this month." />
      <UsageTable title="Usage by session" headers={["Session", "Events", "Tokens", "Spend"]} rows={data.sessions.map((item) => [item.sessionId, count(item.events), count(item.tokens), inr(item.spendInr)])} empty="No governed sessions this month." />
      <UsageTable title="Usage by model" headers={["Model", "Events", "Tokens", "Spend"]} rows={data.models.map((item) => [item.modelId, count(item.events), count(item.tokens), inr(item.spendInr)])} empty="No model usage this month." />
    </div>
  );
}

function productId(initial: AiGovernanceSnapshot) {
  return initial.product.primarySuperadminEmployeeId || "";
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <article className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft"><div className="flex items-center gap-2 text-xs font-semibold uppercase text-wxIndigo500">{icon}{label}</div><p className="mt-3 text-2xl font-semibold text-wxIndigo900">{value}</p><p className="mt-2 text-sm text-wxIndigo500">{detail}</p></article>;
}

function BudgetBar({ label, value, limit, tone }: { label: string; value: number; limit: number; tone: string }) {
  const percent = limit ? Math.min(100, value / limit * 100) : 0;
  return <div><div className="flex justify-between gap-4 text-sm"><span className="font-semibold text-wxIndigo800">{label}</span><span className="text-wxIndigo500">{inr(value)} / {inr(limit)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-wxSurfaceSoft"><div className={`h-full ${tone}`} style={{ width: `${percent}%` }} /></div></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-wxBorder pb-3"><dt className="text-xs font-semibold uppercase text-wxIndigo500">{label}</dt><dd className="mt-1 break-words font-medium text-wxIndigo900">{value}</dd></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo800"><span>{label}</span>{children}</label>;
}

function CapacityStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="min-w-0"><p className="text-xs font-semibold uppercase text-wxIndigo500">{label}</p><p className="mt-2 text-xl font-semibold text-wxIndigo900">{value}</p><p className="mt-1 text-sm leading-5 text-wxIndigo500">{detail}</p></div>;
}

function UsageTable({ title, headers, rows, empty }: { title: string; headers: string[]; rows: string[][]; empty: string }) {
  return <section className="overflow-hidden rounded-lg border border-wxBorder bg-wxSurface shadow-soft"><div className="px-5 py-4"><h2 className="text-lg font-semibold text-wxIndigo900">{title}</h2></div>{rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-y border-wxBorder bg-wxSurfaceSoft text-xs uppercase text-wxIndigo500"><tr>{headers.map((header) => <th key={header} className="px-5 py-3 font-semibold">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="border-b border-wxBorder last:border-0">{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className={`px-5 py-3 ${cellIndex === 0 ? "font-semibold text-wxIndigo900" : "text-wxIndigo600"}`}>{cell}</td>)}</tr>)}</tbody></table></div> : <p className="border-t border-wxBorder px-5 py-8 text-center text-sm text-wxIndigo500">{empty}</p>}</section>;
}
