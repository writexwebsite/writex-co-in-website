import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Download,
  FileText,
  Headphones,
  MessageCircle,
  PhoneCall,
  ReceiptText,
  RefreshCcw,
  Repeat2,
} from "lucide-react";
import type { MyWritexProject, MyWritexProjectFile } from "@/lib/my-writex/types";
import { formatDate, formatMoney, StatusPill } from "@/components/my-writex/MyWritexPrimitives";
import { ProjectIntelligence, ProjectRecovery } from "@/components/my-writex/ProjectIntelligence";

const fileGroupLabels: Array<{ key: MyWritexProjectFile["kind"][]; label: string }> = [
  { key: ["brief"], label: "Brief" },
  { key: ["reference"], label: "Reference Files" },
  { key: ["supporting"], label: "Supporting Files" },
  { key: ["delivery"], label: "Delivered Files" },
  { key: ["invoice", "receipt"], label: "Invoices & Receipts" },
];

export function ProjectDetail({ project, mode }: { project: MyWritexProject; mode: "invoice" | "customer" }) {
  const supportBase = mode === "customer" ? "/my-writex/support" : "/client/support";
  const managerHref = mode === "customer" ? "/my-writex/manager?intent=call" : "/client/support";
  const actionHref = mode === "customer" ? project.nextActionHref : "/client/overview#support";
  const hasContinueAction = project.canOrderSimilar || ["completed", "delivered"].includes(project.status);

  return (
    <div className="mw-page-stack">
      <header id="overview" className="scroll-mt-24">
        {mode === "customer" ? <Link href="/my-writex/projects" className="mw-text-link mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--mw-primary)]"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} />Back to Projects</Link> : null}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <p className="mw-eyebrow">{project.service} · {project.category}</p>
            <h1 className="mw-page-title mt-2 max-w-[820px]">{project.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3"><StatusPill status={project.status} /><span className="mw-meta">{project.invoiceReference}</span><span className="mw-meta">Due {formatDate(project.deliveryDate)}</span></div>
          </div>
        </div>
        <p className="mw-secondary mt-4 max-w-[820px]">{project.summary}</p>
        {mode === "customer" ? <nav aria-label="Project Room sections" className="mw-segmented-nav mt-6 border-y border-[var(--mw-line)] py-1">{[["#overview","Overview"],["#quality","Quality"],["#files","Files"],["#invoice","Payment"],["#support","Support"]].map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav> : null}
      </header>

      <div className="mw-project-layout">
        <div className="grid min-w-0 gap-8">
          <section className="mw-card mw-card-mobile-pad p-6" aria-labelledby="next-action-title">
            <p className="mw-eyebrow">Primary Next Action</p>
            <h2 id="next-action-title" className="mw-section-title mt-2">{project.nextAction}</h2>
            <p className="mw-secondary mt-2">Continue from the current verified project position.</p>
            <Link href={actionHref} className="mw-button-primary mt-5">Continue <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} /></Link>
          </section>

          <ProjectIntelligence project={project} mode={mode} />

          <section id="files" className="scroll-mt-24" aria-labelledby="files-title">
            <div className="mb-4"><p className="mw-eyebrow">Files</p><h2 id="files-title" className="mw-section-title mt-1">Project documents</h2><p className="mw-secondary mt-1">Files remain organised by their purpose in this project.</p></div>
            {project.files.length ? <div className="mw-list-surface px-4">{fileGroupLabels.map((group) => { const files = project.files.filter((file) => group.key.includes(file.kind)); if (!files.length) return null; return <div key={group.label}><h3 className="mw-meta border-b border-[var(--mw-line)] py-3 font-medium text-[var(--mw-ink)]">{group.label}</h3>{files.map((file) => <div key={file.id} className="mw-file-row"><FileText className="h-6 w-6 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="mw-meta mt-0.5">{file.sizeLabel} · {formatDate(file.addedAt)}</p></div><button type="button" disabled className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-[var(--mw-tertiary)] disabled:cursor-not-allowed" aria-label={`Download ${file.name} is not connected in Stage 2`}><Download className="h-4 w-4" strokeWidth={1.75} /></button></div>)}</div>; })}</div> : <p className="mw-secondary rounded-[16px] border border-dashed border-[var(--mw-line-strong)] bg-white p-6">No approved files are available yet.</p>}
          </section>

          <section id="support" className="mw-card mw-card-mobile-pad scroll-mt-24 p-6" aria-labelledby="support-title">
            <div className="flex items-start gap-3"><Headphones className="mt-0.5 h-5 w-5 text-[var(--mw-primary)]" strokeWidth={1.75} /><div><h2 id="support-title" className="mw-section-title">Project Support</h2><p className="mw-secondary mt-1">Keep this project attached to the conversation.</p></div></div>
            <div className="mt-5 flex flex-wrap gap-3"><Link href={`${supportBase}?type=question&project=${encodeURIComponent(project.id)}`} className="mw-button-primary"><MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />Ask a Question</Link><Link href={`${supportBase}?type=revision&project=${encodeURIComponent(project.id)}`} className="mw-button-secondary"><RefreshCcw className="h-[18px] w-[18px]" strokeWidth={1.75} />Request Revision</Link><Link href={managerHref} className="mw-button-secondary"><PhoneCall className="h-[18px] w-[18px]" strokeWidth={1.75} />Request Callback</Link></div>
            <ProjectRecovery projectTitle={project.title} />
          </section>
        </div>

        <aside className="grid content-start gap-4" aria-label="Project details">
          <section className="mw-card mw-card-mobile-pad p-5">
            <CalendarDays className="h-5 w-5 text-[var(--mw-primary)]" strokeWidth={1.75} />
            <p className="mw-meta mt-4 font-medium">Delivery / deadline</p><p className="mw-object-title mt-1">{formatDate(project.deliveryDate)}</p>
            <div className="mt-4 border-t border-[var(--mw-line)] pt-4"><p className="mw-meta font-medium">Project status</p><div className="mt-2"><StatusPill status={project.status} /></div></div>
          </section>

          <section id="invoice" className="mw-card mw-card-mobile-pad scroll-mt-24 p-5">
            <div className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-[var(--mw-primary)]" strokeWidth={1.75} /><h2 className="mw-object-title">Invoice & Payment</h2></div>
            <dl className="mt-4 grid gap-3"><div><dt className="mw-meta">Invoice</dt><dd className="mt-1 text-sm font-medium">{project.invoiceReference}</dd></div><div><dt className="mw-meta">Payment status</dt><dd className="mt-1 text-sm font-medium text-[var(--mw-green)]">{project.payment.status}</dd></div><div className="grid grid-cols-2 gap-3 border-t border-[var(--mw-line)] pt-3"><div><dt className="mw-meta">Total</dt><dd className="mt-1 text-sm font-medium">{formatMoney(project.payment.total, project.payment.currency)}</dd></div><div><dt className="mw-meta">Paid</dt><dd className="mt-1 text-sm font-medium">{formatMoney(project.payment.paid, project.payment.currency)}</dd></div></div></dl>
            <p className="mw-meta mt-4 border-t border-[var(--mw-line)] pt-4">Only use payment instructions shown on your official WriteX invoice.</p>
          </section>

          {mode === "invoice" ? <><section className="mw-card mw-card-mobile-pad p-5"><Repeat2 className="h-5 w-5 text-[var(--mw-primary)]" strokeWidth={1.75} /><p className="mw-eyebrow mt-4">Continue with WriteX</p><h2 className="mw-object-title mt-1">Your next requirement can start here.</h2><p className="mw-secondary mt-2">New requests remain attached only to this authorised invoice workspace.</p><div className="mt-4 grid gap-2"><Link href="/client/request" className="mw-button-primary w-full">Start Another Work</Link><Link href="/client/request?mode=similar" className="mw-button-secondary w-full">Order Similar Work</Link><Link href="/client/requests" className="mw-button-secondary w-full">View Requests</Link><Link href="/client/support" className="mw-text-link inline-flex min-h-11 items-center justify-center text-sm font-semibold text-[var(--mw-primary)]">Contact WriteX</Link></div></section><section className="mw-card mw-card-mobile-pad p-5"><div className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-[var(--mw-primary)]" strokeWidth={1.75} /><p className="mw-eyebrow">My WriteX Lite</p></div><h2 className="mw-object-title mt-3">One project, safely scoped.</h2><p className="mw-secondary mt-2">Job Radar and CV Studio previews remain non-clicking; this invoice session remains safely limited to {project.invoiceReference}.</p><div className="mt-4 flex flex-wrap gap-2"><span className="mw-status-pill bg-[var(--mw-soft)] text-[var(--mw-muted)]">Job Radar preview</span><span className="mw-status-pill bg-[var(--mw-soft)] text-[var(--mw-muted)]">CV Studio preview</span></div></section></> : null}

          {hasContinueAction && mode === "customer" ? <section className="mw-card mw-card-mobile-pad p-5"><Repeat2 className="h-5 w-5 text-[var(--mw-primary)]" strokeWidth={1.75} /><h2 className="mw-object-title mt-3">Use this context again</h2><p className="mw-secondary mt-2">Prepare similar work without carrying old deadlines, payments or confidential instructions.</p><Link href={`/my-writex/new-requirement?fromProject=${encodeURIComponent(project.id)}`} className="mw-button-secondary mt-4 w-full">Order Similar Work</Link></section> : null}
        </aside>
      </div>
    </div>
  );
}
