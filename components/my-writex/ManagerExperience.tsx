import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronRight, MessageCircle, PhoneCall, Plus, ShieldCheck, UserRound } from "lucide-react";
import type { MyWritexCustomer } from "@/lib/my-writex/types";
import { ProductPageHeader } from "@/components/my-writex/ProductUI";

export function ManagerExperience({ customer, intent, showCoverage }: { customer: MyWritexCustomer; intent?: "message" | "call"; showCoverage?: boolean }) {
  const activeManager = showCoverage && customer.manager.backup ? { name: customer.manager.backup.name, role: customer.manager.backup.role } : { name: customer.manager.name, role: customer.manager.role };
  return (
    <div className="mw-page-stack max-w-[820px]">
      <ProductPageHeader eyebrow="Your WriteX Team" title="My WriteX Manager" copy="A clear, relationship-led point of contact without exposing internal employee systems or availability data." />
      {showCoverage && customer.manager.backup ? <div className="flex items-start gap-3 rounded-[12px] border border-[#f2d0a0] bg-[#fff3dd] p-4 text-sm text-[#754710]"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} /><div><p className="font-medium">Account cover is active in this fixture preview.</p><p className="mw-meta mt-1 text-[#754710]">{customer.manager.backup.message}</p></div></div> : null}
      {intent ? <div role="status" className="flex items-start gap-3 rounded-[12px] border border-[#b8e2d0] bg-[#eaf6f0] p-4 text-sm text-[#116747]"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} /><div><p className="font-medium">{intent === "message" ? "Message flow opened locally" : "Callback flow opened locally"}</p><p className="mw-meta mt-1 text-[#116747]">Nothing was sent and no request was created.</p></div></div> : null}
      <section className="mw-card mw-card-mobile-pad p-6"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div className="flex items-center gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--mw-primary-soft)] text-[var(--mw-primary)]"><UserRound className="h-6 w-6" strokeWidth={1.75} /></span><div><p className="mw-meta">Your main point of contact</p><h2 className="mw-section-title mt-1">{activeManager.name}</h2><p className="mw-secondary mt-1">{activeManager.role}</p></div></div><Link href={showCoverage ? "/my-writex/manager" : "/my-writex/manager?coverage=1"} className="mw-button-secondary shrink-0">{showCoverage ? "Show primary" : "Preview cover"}<ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} /></Link></div><p className="mw-secondary mt-5 max-w-[640px]">{customer.manager.supportingCopy} They help keep new and existing work connected to the context WriteX already knows.</p></section>
      <section><h2 className="mw-section-title mb-4">Contact & Next Steps</h2><div className="mw-list-surface"><ManagerLink href="/my-writex/manager?intent=message" icon={MessageCircle} title={customer.manager.whatsappLabel} copy="Local placeholder" /><ManagerLink href="/my-writex/manager?intent=call" icon={PhoneCall} title="Request a Call" copy="Local placeholder" /><ManagerLink href="/my-writex/new-requirement" icon={Plus} title="Start New Requirement" copy="Prepare a local draft" /></div></section>
    </div>
  );
}

function ManagerLink({ href, icon: Icon, title, copy }: { href: string; icon: typeof MessageCircle; title: string; copy: string }) {
  return <Link href={href} className="mw-list-row outline-none hover:bg-[rgba(17,24,39,0.025)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--mw-primary)]"><Icon className="h-5 w-5 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} /><span className="min-w-0 flex-1"><span className="mw-object-title block">{title}</span><span className="mw-meta mt-1 block">{copy}</span></span><ChevronRight className="h-4 w-4 text-[var(--mw-tertiary)]" strokeWidth={1.75} /></Link>;
}
