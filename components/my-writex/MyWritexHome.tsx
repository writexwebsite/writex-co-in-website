import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSearch,
  Headphones,
  MessageCircle,
  Plus,
  Repeat2,
} from "lucide-react";
import type { MyWritexCustomer, MyWritexHomeState } from "@/lib/my-writex/types";
import { getMyWritexPresentation, myWritexFixtureStates } from "@/lib/my-writex/presentation";
import { MyWritexConcierge } from "@/components/my-writex/MyWritexConcierge";
import { formatDate, StatusPill } from "@/components/my-writex/MyWritexPrimitives";

export function MyWritexHome({
  customer,
  experienceState,
}: {
  customer: MyWritexCustomer;
  experienceState: MyWritexHomeState;
}) {
  const view = getMyWritexPresentation(customer, experienceState);
  const priorityProject = view.activeProjects[0];
  const similarProject = customer.projects.find((project) => project.canOrderSimilar);
  const job = customer.career.jobs[0];
  const todayActions = view.pendingActions.slice(0, 3);

  return (
    <div className="mw-page-stack">
      <header className="flex min-h-20 flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="mw-display">Good afternoon, {customer.preferredName}.</h1>
          <p className="mw-body mt-1.5 text-[var(--mw-muted)]">Here’s what matters today.</p>
          <p className="mw-meta mt-2.5">
            {customer.clientStatus} · With WriteX since {customer.relationshipSince}
          </p>
        </div>
        <details className="relative self-start">
          <summary className="mw-meta flex min-h-11 cursor-pointer list-none items-center rounded-[8px] px-2 font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]">
            Local UAT state
          </summary>
          <div className="absolute right-0 z-20 mt-2 grid w-64 gap-1 rounded-[12px] border border-[var(--mw-line)] bg-white p-2 shadow-[0_8px_28px_rgba(16,24,40,0.06)]">
            {myWritexFixtureStates.map((item) => (
              <Link
                key={item.key}
                href={item.key === "active" ? "/my-writex" : `/my-writex?state=${item.key}`}
                className={`flex min-h-11 items-center justify-between rounded-[8px] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)] ${experienceState === item.key ? "bg-[var(--mw-primary-soft)] text-[var(--mw-primary)]" : "text-[var(--mw-muted)] hover:bg-[var(--mw-soft)]"}`}
              >
                <span>{item.label}</span><span className="text-xs">{item.customer}</span>
              </Link>
            ))}
          </div>
        </details>
      </header>

      <div className="mw-home-layout">
        <div className="mw-home-main">
          <section aria-labelledby="for-you-title">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id="for-you-title" className="mw-section-title">For You Today</h2>
              <span className="mw-meta">{todayActions.length || 1} item{todayActions.length === 1 ? "" : "s"}</span>
            </div>
            <div className="mw-list-surface">
              {todayActions.length ? todayActions.map((action) => (
                <Link key={action.id} href={action.href} className="mw-list-row group outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--mw-primary)]">
                  <Clock3 className="h-5 w-5 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="mw-object-title block">{action.title}</span>
                    <span className="mw-meta mt-0.5 block truncate">{action.context}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--mw-tertiary)]" strokeWidth={1.75} aria-hidden />
                </Link>
              )) : (
                <div className="mw-list-row">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--mw-green)]" strokeWidth={1.75} aria-hidden />
                  <span><span className="mw-object-title block">Nothing needs your attention</span><span className="mw-meta mt-0.5 block">WriteX will surface the next useful action here.</span></span>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="current-work-title">
            <h2 id="current-work-title" className="mw-section-title mb-4">Current Work</h2>
            {priorityProject ? (
              <article className="mw-project-primary">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="mw-meta font-medium">Primary project</span>
                  <StatusPill status={priorityProject.status} />
                  <span className="mw-meta">{priorityProject.invoiceReference}</span>
                </div>
                <h3 className="mw-section-title mt-4">{priorityProject.title}</h3>
                <div className="mw-meta mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" strokeWidth={1.75} />{formatDate(priorityProject.deliveryDate)}</span>
                  <span>{priorityProject.service}</span>
                </div>
                <p className="mw-secondary mt-4 max-w-2xl">{priorityProject.nextAction}</p>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <Link href={`/my-writex/projects/${priorityProject.id}`} className="mw-button-primary">Open Project Room <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} /></Link>
                  <Link href="/my-writex/projects" className="mw-text-link min-h-11 text-sm font-semibold text-[var(--mw-primary)]">All projects</Link>
                </div>
              </article>
            ) : (
              <article className="mw-card mw-card-mobile-pad p-6">
                <h3 className="mw-section-title">No active project right now</h3>
                <p className="mw-secondary mt-2 max-w-xl">Add the next requirement early so WriteX can help you plan with more room.</p>
                <Link href="/my-writex/new-requirement" className="mw-button-primary mt-5"><Plus className="h-[18px] w-[18px]" strokeWidth={1.75} />Start New Requirement</Link>
              </article>
            )}
          </section>

          <section aria-labelledby="next-up-title">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id="next-up-title" className="mw-section-title">Next Up</h2>
              <Link href="/my-writex/plan" className="mw-text-link min-h-11 text-sm font-semibold text-[var(--mw-primary)]">Open Plan</Link>
            </div>
            <div className="mw-list-surface">
              <div className="mw-list-row min-h-[76px]">
                <CalendarDays className="h-5 w-5 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="mw-object-title">{view.nextDeadline?.label || "No upcoming deadline"}</p>
                  <p className="mw-meta mt-0.5">{view.nextDeadline ? formatDate(view.nextDeadline.date) : "Your plan is clear"}</p>
                </div>
                <Link href="/my-writex/plan" className="min-h-11 px-2 text-sm font-semibold text-[var(--mw-primary)]">Review</Link>
              </div>
            </div>
          </section>

          <section aria-labelledby="jobs-preview-title" className="mw-card mw-card-mobile-pad flex min-h-[100px] flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <BriefcaseBusiness className="mt-0.5 h-5 w-5 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} aria-hidden />
              <div><h2 id="jobs-preview-title" className="mw-object-title">Jobs for You</h2><p className="mw-secondary mt-1">{customer.career.jobs.length} opportunities · {job.location}</p></div>
            </div>
            <Link href="/my-writex/career/jobs" className="mw-text-link shrink-0 text-sm font-semibold text-[var(--mw-primary)]">View Jobs <ArrowRight className="h-4 w-4" strokeWidth={1.75} /></Link>
          </section>
        </div>

        <aside className="mw-home-rail" aria-label="Your WriteX context">
          <section className="mw-card mw-card-mobile-pad p-5">
            <p className="mw-eyebrow">Your WriteX Manager</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--mw-primary-soft)] text-sm font-semibold text-[var(--mw-primary)]">{initials(customer.manager.name)}</span>
              <div className="min-w-0"><h2 className="mw-object-title truncate">{customer.manager.name}</h2><p className="mw-meta mt-0.5 truncate">{customer.manager.role}</p></div>
            </div>
            <p className="mw-secondary mt-4 line-clamp-2">{customer.manager.supportingCopy}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/my-writex/manager?intent=message" className="mw-button-primary px-3"><MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />Message</Link>
              <Link href="/my-writex/manager?intent=call" className="mw-button-secondary px-3">Request call</Link>
            </div>
          </section>

          <section>
            <h2 className="mw-section-title mb-3">Quick Actions</h2>
            <div className="mw-list-surface">
              <QuickAction href="/my-writex/new-requirement" icon={Plus} label="Start New Requirement" />
              <QuickAction href={similarProject ? `/my-writex/new-requirement?fromProject=${encodeURIComponent(similarProject.id)}` : "/my-writex/projects"} icon={Repeat2} label="Order Similar Work" />
              <QuickAction href="/my-writex/documents" icon={FileSearch} label="Find a Document" />
              <QuickAction href="/my-writex/support" icon={Headphones} label="Get Support" />
            </div>
          </section>

          <MyWritexConcierge managerName={customer.manager.name} />
        </aside>
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: typeof Plus; label: string }) {
  return (
    <Link href={href} className="mw-quick-row group">
      <Icon className="h-[18px] w-[18px] shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--mw-tertiary)]" strokeWidth={1.75} aria-hidden />
    </Link>
  );
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
