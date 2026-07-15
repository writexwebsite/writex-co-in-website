"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  RefreshCw
} from "lucide-react";
import { ClientLogoutButton } from "@/components/client/ClientLogoutButton";
import { PaymentProofForm } from "@/components/client/PaymentProofForm";
import { RevisionRequestForm } from "@/components/client/RevisionRequestForm";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { getWhatsAppUrl } from "@/lib/site";
import { trackDemoEvent } from "@/lib/demo/analytics";

type Stage = {
  key: string;
  label: string;
  status: "pending" | "active" | "complete" | "blocked";
  completedAt?: string;
  description?: string;
};

type DashboardData = {
  isDemo?: boolean;
  client: { name: string | null; whatsappMasked: string | null; timezone: string };
  greeting: string;
  invoice: {
    invoiceId: string;
    orderId: string | null;
    serviceType: string | null;
    subject: string | null;
    academicLevel: string | null;
    wordCount: number | null;
    deadline: string | null;
    orderStatus: string | null;
    deliveryStatus: string | null;
  };
  work: { currentStage: string; progressPercent: number; stages: Stage[] };
  payment: {
    paymentStatus: string;
    isSettled: boolean;
    canUnlockDownload: boolean;
    totalAmount?: number;
    paidAmount?: number;
    balanceAmount?: number;
    currency?: string;
    paymentLink?: string;
  };
  paymentProof: {
    verificationStatus: string | null;
  } | null;
  delivery: { previewAvailable: boolean; finalAvailable: boolean; downloadUnlocked: boolean };
  support: { whatsappUrl: string; email: string; supportHours: string };
  revisions?: Array<{
    id: string;
    requestType: string;
    status: string;
    submittedAt: string | Date;
    message?: string | null;
  }>;
};

type ApiPayload = { ok: boolean; data?: DashboardData; error?: { message?: string } };

function formatDate(value?: string | null) {
  if (!value) return "Not confirmed";
  if (value === "Demo Date") return value;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function formatMoney(value?: number, currency = "INR") {
  if (typeof value !== "number") return "Not available";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function statusText(status: string) {
  return status.replace(/_/g, " ");
}

function isDashboardData(value: unknown): value is DashboardData {
  return Boolean(value && typeof value === "object" && "invoice" in value && "work" in value && "payment" in value && "delivery" in value);
}

export function ClientDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [message, setMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch("/api/client/dashboard", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ApiPayload | null;
      if (cancelled) return;
      setIsLoading(false);
      if (response.status === 401) { window.location.href = "/client-login"; return; }
      if (!response.ok || !isDashboardData(payload?.data)) {
        setMessage(payload?.error?.message || "Your workspace is temporarily unavailable.");
        return;
      }
      setData(payload.data);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  function blockDemoAction(action: string) {
    setActionMessage("This action is disabled in demo mode.");
    trackDemoEvent("demo_action_blocked", { demo_type: "client", workspace: action, page_path: "/client/dashboard" });
  }

  async function requestPortalUrl(endpoint: string, type: "preview" | "download") {
    if (!data) return;
    if (data.isDemo) { blockDemoAction(type); return; }
    setActionMessage("");
    setIsActionLoading(true);
    const response = await fetch(endpoint, { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    setIsActionLoading(false);
    if (response.status === 401) { window.location.href = "/client-login"; return; }
    const url = payload?.data?.previewUrl || payload?.data?.downloadUrl;
    if (response.ok && url) { window.open(url, "_blank", "noopener,noreferrer"); return; }
    setActionMessage(payload?.data?.message || payload?.data?.reason || payload?.error?.message || (type === "preview" ? "Preview is not available yet." : "Download remains locked."));
  }

  if (isLoading) {
    return <section className="rounded-2xl border border-wxBorder bg-wxSurface p-6 shadow-soft"><div className="wx-skeleton h-2 w-32 rounded-full" aria-hidden /><p className="mt-4 flex items-center gap-2 text-sm font-semibold text-wxIndigo500"><RefreshCw className="h-4 w-4 animate-spin" aria-hidden />Loading your workspace...</p></section>;
  }

  if (message || !data) {
    return <section className="rounded-2xl border border-wxBorder bg-wxSurface p-6 shadow-soft"><AlertCircle className="h-7 w-7 text-deepCrimson" aria-hidden /><h1 className="mt-4 text-2xl font-semibold">Workspace unavailable</h1><p className="mt-2 text-sm text-wxIndigo500">{message || "Please try again or contact WriteX support."}</p><a href={getWhatsAppUrl("Hi WriteX, I need help with my client portal.")} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-wxBorder px-4 text-sm font-semibold"><WhatsAppIcon className="h-4 w-4" />Contact support</a></section>;
  }

  const currency = data.payment.currency || "INR";
  const paymentPending = !data.payment.isSettled;
  const supportUrl = data.isDemo ? "" : data.support.whatsappUrl || getWhatsAppUrl("Hi WriteX, I need help with my client portal.");
  const currentStage = data.work.stages.find((stage) => stage.status === "active");
  const nextPendingStage = data.work.stages.find((stage) => stage.status === "pending" || stage.status === "blocked");
  const nextAction = data.delivery.downloadUnlocked
    ? "Download your final file"
    : data.delivery.previewAvailable
      ? paymentPending ? "Review the preview and settle the remaining balance" : "Review your preview"
      : `Wait for ${nextPendingStage?.label || "the next status update"}`;
  const recentStages = data.work.stages.filter((stage) => stage.status === "complete" || stage.status === "active").slice(-3).reverse();
  const proofEligible = ["pending", "partial", "pending_verification", "unpaid"].includes(data.payment.paymentStatus);
  const revisionEligible = data.delivery.previewAvailable || data.delivery.finalAvailable;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-wxViolet700">Invoice {data.invoice.invoiceId}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{data.greeting}</h1>
          <p className="mt-2 text-sm text-wxIndigo500">{data.invoice.serviceType || "WriteX support"} · Due {formatDate(data.invoice.deadline)}</p>
        </div>
        <ClientLogoutButton isDemo={data.isDemo} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,.65fr)]">
        <section className="rounded-2xl border border-wxBorder bg-wxSurface p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-wxIndigo500">Current status</p><h2 className="mt-2 text-2xl font-semibold">{currentStage?.label || statusText(data.work.currentStage)}</h2><p className="mt-2 text-sm leading-6 text-wxIndigo500">{currentStage?.description || "Your work is progressing through the WriteX review process."}</p></div>
            <strong className="text-2xl font-semibold text-wxViolet700">{data.work.progressPercent}%</strong>
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-wxSurfaceSoft" aria-label={`${data.work.progressPercent}% complete`}><div className="h-full rounded-full bg-wxViolet700" style={{ width: `${Math.min(100, Math.max(0, data.work.progressPercent))}%` }} /></div>
          <ol className="mt-7 grid gap-3 sm:grid-cols-2">
            {data.work.stages.map((stage) => <li key={stage.key} className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm ${stage.status === "active" ? "border-wxViolet700 bg-wxViolet700/5 font-semibold" : "border-wxBorder"}`}>{stage.status === "complete" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden /> : <Clock3 className={`h-5 w-5 shrink-0 ${stage.status === "active" ? "text-wxViolet700" : "text-wxIndigo500"}`} aria-hidden />}<span>{stage.label}</span></li>)}
          </ol>
        </section>

        <aside className="rounded-2xl border border-wxBorder bg-wxSurface p-6 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-wxIndigo500">Next action</p>
          <h2 className="mt-2 text-xl font-semibold">{nextAction}</h2>
          <div className="mt-6 space-y-4 border-t border-wxBorder pt-5 text-sm">
            <StateLine label="Payment" value={statusText(data.payment.paymentStatus)} tone={paymentPending ? "warning" : "success"} />
            <StateLine label="Preview" value={data.delivery.previewAvailable ? "Available" : "Not ready"} />
            <StateLine label="Download" value={data.delivery.downloadUnlocked ? "Available" : "Locked"} />
            {paymentPending ? <StateLine label="Balance" value={formatMoney(data.payment.balanceAmount, currency)} /> : null}
          </div>
          <div className="mt-6 grid gap-3">
            {data.delivery.previewAvailable ? <button type="button" disabled={isActionLoading} onClick={() => requestPortalUrl(`/api/client/preview/${data.invoice.invoiceId}`, "preview")} className="wx-gradient-action inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60"><ExternalLink className="h-4 w-4" aria-hidden />View Preview</button> : null}
            {data.delivery.downloadUnlocked || data.isDemo ? <button type="button" disabled={isActionLoading} onClick={() => requestPortalUrl(`/api/client/download/${data.invoice.invoiceId}`, "download")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-wxBorder px-4 text-sm font-semibold"><Download className="h-4 w-4" aria-hidden />{data.delivery.downloadUnlocked ? "Download File" : "Download Locked"}</button> : null}
          </div>
        </aside>
      </div>

      {actionMessage ? <p role="status" className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900">{actionMessage}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.7fr)]">
        <section className="rounded-2xl border border-wxBorder bg-wxSurface p-6 shadow-soft">
          <h2 className="text-xl font-semibold">Recent updates</h2>
          <div className="mt-5 divide-y divide-wxBorder">
            {recentStages.map((stage) => <div key={stage.key} className="flex gap-3 py-4 first:pt-0 last:pb-0"><FileText className="mt-0.5 h-5 w-5 shrink-0 text-wxViolet700" aria-hidden /><div><p className="text-sm font-semibold">{stage.label}</p><p className="mt-1 text-xs text-wxIndigo500">{stage.status === "active" ? "Currently in progress" : stage.completedAt ? `Completed ${formatDate(stage.completedAt)}` : "Completed"}</p></div></div>)}
          </div>
        </section>
        <section className="rounded-2xl border border-wxBorder bg-wxSurface p-6 shadow-soft">
          <WhatsAppIcon className="h-6 w-6 text-wxViolet700" />
          <h2 className="mt-4 text-xl font-semibold">Need support?</h2>
          <p className="mt-2 text-sm leading-6 text-wxIndigo500">Get help with status, payment, preview, or delivery questions.</p>
          {data.isDemo ? <button type="button" onClick={() => blockDemoAction("support")} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-wxBorder px-4 text-sm font-semibold">Support disabled in demo</button> : <a href={supportUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-wxBorder px-4 text-sm font-semibold"><WhatsAppIcon className="h-4 w-4" />Contact support</a>}
        </section>
      </div>

      {!data.isDemo && (proofEligible || revisionEligible) ? <details className="rounded-2xl border border-wxBorder bg-wxSurface shadow-soft"><summary className="cursor-pointer px-6 py-5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-wxViolet700">Payment proof and revision options</summary><div className="space-y-6 border-t border-wxBorder p-6">{proofEligible ? <PaymentProofForm invoiceId={data.invoice.invoiceId} currency={currency} supportUrl={getWhatsAppUrl(`Hi WriteX, I have completed payment for invoice ${data.invoice.invoiceId}.`)} onSubmitted={() => setActionMessage("Payment proof received and awaiting verification.")} /> : null}{revisionEligible ? <RevisionRequestForm invoiceId={data.invoice.invoiceId} existingRequests={data.revisions || []} supportUrl={getWhatsAppUrl(`Hi WriteX, I want to request a review for invoice ${data.invoice.invoiceId}.`)} /> : null}</div></details> : null}
    </div>
  );
}

function StateLine({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-wxIndigo500">{label}</span><span className={`text-right font-semibold capitalize ${tone === "success" ? "text-green-700" : tone === "warning" ? "text-orange-700" : "text-wxIndigo900"}`}>{value}</span></div>;
}
