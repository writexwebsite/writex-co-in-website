import Link from "next/link";
import { CheckCircle2, Plus } from "lucide-react";
import type { MyWritexCustomer, MyWritexProjectStatus } from "@/lib/my-writex/types";

export const statusLabels: Record<MyWritexProjectStatus, string> = {
  awaiting_information: "Awaiting Information",
  payment_pending: "Payment Pending",
  in_progress: "In Progress",
  quality_review: "Quality Review",
  ready_for_delivery: "Ready for Delivery",
  delivered: "Delivered",
  completed: "Completed",
};

const statusStyles: Record<MyWritexProjectStatus, string> = {
  awaiting_information: "border-[#f2d0a0] bg-[#fff3dd] text-[#8a4f00]",
  payment_pending: "border-[#efc3b1] bg-[#fff0e9] text-[#944019]",
  in_progress: "border-[#cfc1ff] bg-[var(--mw-primary-soft)] text-[#5423b6]",
  quality_review: "border-[#b8dcea] bg-[#e8f6fb] text-[#176278]",
  ready_for_delivery: "border-[#b8e2d0] bg-[#eaf6f0] text-[#116747]",
  delivered: "border-[#b8e2d0] bg-[#eaf6f0] text-[#116747]",
  completed: "border-[var(--mw-line-strong)] bg-[var(--mw-soft)] text-[#5e5967]",
};

export function StatusPill({ status }: { status: MyWritexProjectStatus }) {
  return <span className={`mw-status-pill border ${statusStyles[status]}`}>{statusLabels[status]}</span>;
}

export function RelationshipTimeline({ customer }: { customer: MyWritexCustomer }) {
  return (
    <ol className="mt-4 max-w-[720px]">
      {customer.relationshipTimeline.map((event, index) => (
        <li key={`${event.year}-${event.title}`} className="mw-timeline-row">
          <div className="flex items-center gap-3"><span className="mw-meta font-medium text-[var(--mw-primary)]">{event.year}</span><span className={`h-2 w-2 rounded-full ${index === customer.relationshipTimeline.length - 1 ? "bg-[var(--mw-primary)]" : "bg-[#c7b8ef]"}`} aria-hidden /></div>
          <div><p className="mw-meta">{event.type}</p><h3 className="mw-object-title mt-1">{event.title}</h3><p className="mw-secondary mt-1">{event.description}</p></div>
        </li>
      ))}
    </ol>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <section className="rounded-[16px] border border-dashed border-[var(--mw-line-strong)] bg-white p-8 text-center">
      <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--mw-primary)]" strokeWidth={1.75} aria-hidden />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mw-secondary mx-auto mt-2 max-w-[360px]">{message}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}

export function NewRequirementLink({ compact = false }: { compact?: boolean }) {
  return <Link href="/my-writex/new-requirement" className="mw-button-primary focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]"><Plus className="h-[18px] w-[18px]" strokeWidth={1.75} />{compact ? "New Requirement" : "Start New Requirement"}</Link>;
}

export function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}
