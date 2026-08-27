import Link from "next/link";
import {
  ArrowRight,
  Bell,
  ChevronRight,
  CircleUserRound,
  FileStack,
  Gift,
  Headphones,
  Plus,
  ReceiptText,
  Settings,
  Share2,
} from "lucide-react";
import type { MyWritexCustomer } from "@/lib/my-writex/types";
import { ProductPageHeader } from "@/components/my-writex/ProductUI";
import { formatDate, RelationshipTimeline, StatusPill } from "@/components/my-writex/MyWritexPrimitives";

export function WorkHub({ customer }: { customer: MyWritexCustomer }) {
  const active = customer.projects.filter((project) => project.phase === "active");
  const recent = customer.projects.filter((project) => project.phase !== "active").slice(0, 3);
  const priority = active.find((project) => project.status === "quality_review") || active[0];

  return (
    <div className="mw-page-stack">
      <ProductPageHeader
        eyebrow="Work"
        title="Your work, clearly organised."
        copy="Projects, files, payments and support stay connected while the next useful step stays obvious."
        action={<Link href="/my-writex/new-requirement" className="mw-button-primary"><Plus className="h-[18px] w-[18px]" strokeWidth={1.75} />Start New Requirement</Link>}
      />

      <section aria-labelledby="active-work-title">
        <div className="mb-4 flex items-center justify-between gap-4"><h2 id="active-work-title" className="mw-section-title">Active Work</h2><Link href="/my-writex/projects" className="mw-text-link min-h-11 text-sm font-semibold text-[var(--mw-primary)]">All projects</Link></div>
        {priority ? (
          <article className="mw-project-primary">
            <div className="flex flex-wrap items-center gap-3"><StatusPill status={priority.status} /><span className="mw-meta">{priority.invoiceReference}</span></div>
            <h3 className="mw-section-title mt-4">{priority.title}</h3>
            <p className="mw-secondary mt-2 max-w-[720px]">{priority.summary}</p>
            <div className="mw-meta mt-4 flex flex-wrap gap-x-6 gap-y-1"><span>Delivery {formatDate(priority.deliveryDate)}</span><span>{priority.nextAction}</span></div>
            <Link href={`/my-writex/projects/${priority.id}`} className="mw-button-primary mt-5">Open Project Room <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} /></Link>
          </article>
        ) : <p className="mw-secondary">No active project currently needs attention.</p>}
      </section>

      <section aria-labelledby="recent-work-title">
        <h2 id="recent-work-title" className="mw-section-title mb-4">Recent Work</h2>
        <div className="mw-list-surface">
          {recent.map((project) => (
            <Link key={project.id} href={`/my-writex/projects/${project.id}`} className="mw-list-row min-h-[76px] outline-none hover:bg-[rgba(17,24,39,0.025)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--mw-primary)]">
              <div className="min-w-0 flex-1"><p className="mw-object-title truncate">{project.title}</p><p className="mw-meta mt-1">{project.invoiceReference} · {formatDate(project.deliveryDate)}</p></div>
              <StatusPill status={project.status} />
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--mw-tertiary)]" strokeWidth={1.75} aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="work-tools-title">
        <h2 id="work-tools-title" className="mw-section-title mb-4">Work Tools</h2>
        <div className="mw-list-surface">
          <WorkLink href="/my-writex/documents" icon={FileStack} label="Files & Documents" copy={`${customer.documents.length} files across your WriteX work`} />
          <WorkLink href="/my-writex/invoices" icon={ReceiptText} label="Invoices" copy="Verified payment positions by project" />
          <WorkLink href="/my-writex/support" icon={Headphones} label="Support" copy="Questions, revisions and callbacks with context" />
        </div>
      </section>
    </div>
  );
}

export function AccountHub({ customer }: { customer: MyWritexCustomer }) {
  return (
    <div className="mw-page-stack max-w-[820px]">
      <ProductPageHeader eyebrow="My WriteX" title="Your account and WriteX relationship." copy="Identity, preferences, people and milestones stay together so every conversation starts with context." />

      <section className="mw-account-section" aria-labelledby="identity-title">
        <p className="mw-eyebrow">Identity</p>
        <div className="mt-4 flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--mw-primary-soft)] text-[var(--mw-primary)]"><CircleUserRound className="h-6 w-6" strokeWidth={1.75} /></span>
          <div><h2 id="identity-title" className="mw-section-title">{customer.name}</h2><p className="mw-secondary mt-1">@{customer.writeXId} · {customer.clientStatus} · since {customer.relationshipSince}</p></div>
        </div>
        <p className="mw-meta mt-4">{customer.summary.activeProjects} active · {customer.summary.completedProjects} completed · {customer.summary.upcomingDeliveries} upcoming</p>
      </section>

      <section className="mw-account-section" aria-labelledby="manager-title">
        <p className="mw-eyebrow">Your WriteX Manager</p>
        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><h2 id="manager-title" className="mw-section-title">{customer.manager.name}</h2><p className="mw-secondary mt-1">{customer.manager.role}</p><p className="mw-secondary mt-3 max-w-[560px]">{customer.manager.supportingCopy}</p></div>
          <Link href="/my-writex/manager" className="mw-button-secondary shrink-0">Manager space <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} /></Link>
        </div>
      </section>

      <section className="mw-account-section" aria-labelledby="preferences-title">
        <p className="mw-eyebrow">Preferences</p>
        <h2 id="preferences-title" className="mw-section-title mt-2">How WriteX works with you</h2>
        <Link href="/my-writex/profile" className="mw-list-row mt-3 px-0"><Bell className="h-5 w-5 text-[var(--mw-primary)]" strokeWidth={1.75} /><span className="min-w-0 flex-1"><span className="mw-object-title block">Profile & communication preferences</span><span className="mw-meta mt-1 block">Study context, contact timing and service interests</span></span><ChevronRight className="h-4 w-4 text-[var(--mw-tertiary)]" /></Link>
      </section>

      <section id="relationship" className="mw-account-section scroll-mt-24" aria-labelledby="relationship-title">
        <p className="mw-eyebrow">Relationship Timeline</p>
        <h2 id="relationship-title" className="mw-section-title mt-2">Your journey with WriteX</h2>
        <RelationshipTimeline customer={customer} />
      </section>

      <AccountLinkSection eyebrow="Benefits" title="Useful recognition, without points or gimmicks" href="/my-writex/benefits" icon={Gift} copy="Career tools, document continuity and relationship-led support." />
      <AccountLinkSection eyebrow="Referrals" title="Share WriteX when it is genuinely useful" href="/my-writex/benefits#referrals" icon={Share2} copy="Referral architecture remains a clear local shell without invented rewards." />
      <AccountLinkSection eyebrow="Account Settings" title="Security and account controls" href="/my-writex/profile" icon={Settings} copy="Review identity and preference settings in one place." last />
    </div>
  );
}

function WorkLink({ href, icon: Icon, label, copy }: { href: string; icon: typeof FileStack; label: string; copy: string }) {
  return <Link href={href} className="mw-list-row min-h-[64px] outline-none hover:bg-[rgba(17,24,39,0.025)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--mw-primary)]"><Icon className="h-5 w-5 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} /><span className="min-w-0 flex-1"><span className="mw-object-title block">{label}</span><span className="mw-meta mt-0.5 block">{copy}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-[var(--mw-tertiary)]" strokeWidth={1.75} /></Link>;
}

function AccountLinkSection({ eyebrow, title, href, icon: Icon, copy, last = false }: { eyebrow: string; title: string; href: string; icon: typeof Gift; copy: string; last?: boolean }) {
  return <section className={last ? "" : "mw-account-section"}><p className="mw-eyebrow">{eyebrow}</p><Link href={href} className="mt-3 flex min-h-[64px] items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]"><Icon className="h-5 w-5 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} /><span className="min-w-0 flex-1"><span className="mw-object-title block">{title}</span><span className="mw-meta mt-1 block">{copy}</span></span><ChevronRight className="h-4 w-4 text-[var(--mw-tertiary)]" /></Link></section>;
}
