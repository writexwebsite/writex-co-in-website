import { BriefcaseBusiness, FileStack, FileText, Gift, Headphones, MessageCircle } from "lucide-react";
import type { MyWritexCustomer } from "@/lib/my-writex/types";
import { ModuleLink, ProductPageHeader } from "@/components/my-writex/ProductUI";

export function BenefitsPage({ customer }: { customer: MyWritexCustomer }) {
  return (
    <div className="mw-page-stack max-w-[820px]">
      <ProductPageHeader
        eyebrow="Relationship benefits"
        title="Benefits & referrals"
        copy="A reserved home for future customer benefits. Economics, tiers, and referral rewards remain outside Stage 2."
      />
      <section className="mw-account-section"><div className="flex items-start gap-3"><Gift className="h-5 w-5 text-[var(--mw-primary)]" strokeWidth={1.75} /><div><p className="mw-eyebrow">{customer.clientStatus}</p><h2 className="mw-section-title mt-2">Recognition without gamification</h2><p className="mw-secondary mt-2 max-w-[720px]">Useful access and relationship continuity—without fake savings, artificial points or invented monetary rewards.</p></div></div></section>
      <section><p className="mw-eyebrow">Practical value</p><h2 className="mw-section-title mt-2">Tools that can grow with the relationship</h2><div className="mw-list-surface mt-4 px-4"><ModuleLink href="/my-writex/career/jobs" icon={BriefcaseBusiness} label="Job Radar" copy="Fixture opportunity discovery through your career profile" /><ModuleLink href="/my-writex/career/cv" icon={FileText} label="CV Studio" copy="Multiple focused CV versions in one workspace" /><ModuleLink href="/my-writex/career/consultation" icon={MessageCircle} label="Career consultations" copy="A future human-support pathway" /><ModuleLink href="/my-writex/documents" icon={FileStack} label="Document continuity" copy="Project files organised across your relationship" /><ModuleLink href="/my-writex/projects" icon={FileText} label="Understanding & Viva shells" copy="Project-scoped preparation and explanation" /><ModuleLink href="/my-writex/support" icon={Headphones} label="Relationship-led support" copy="Keep context with questions, concerns and callbacks" /></div><p className="mw-meta mt-4">Demonstration only. No benefit entitlement, referral economics or tier calculation is active.</p></section>
    </div>
  );
}
