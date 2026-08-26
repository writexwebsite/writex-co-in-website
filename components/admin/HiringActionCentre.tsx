import Link from "next/link";
import { AlertTriangle, ArrowRight, ClipboardCheck, DatabaseZap, Link2, ShieldCheck } from "lucide-react";
import type { HiringAdminSnapshot } from "@/lib/hiring/admin";
import { AdminEmptyState, AdminStatus } from "@/components/admin/AdminPrimitives";

type ActionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  status: string;
  icon: typeof AlertTriangle;
};

export function HiringActionCentre({ snapshot }: { snapshot: HiringAdminSnapshot }) {
  const items: ActionItem[] = [
    ...snapshot.assessments.filter((item) => item.state === "submitted").slice(0, 5).map((item) => ({ id: `assessment-${item.reference}`, title: "Assessment submitted", detail: `${item.applicationReference} requires human review.`, href: `/admin/hiring/assessments/${encodeURIComponent(item.reference)}`, status: "action_required", icon: ClipboardCheck })),
    ...snapshot.verificationCases.filter((item) => !["approved_for_hiring", "approved_with_conditions"].includes(item.status)).slice(0, 5).map((item) => ({ id: `verification-${item.id}`, title: `${item.type.replace(/_/g, " ")} verification`, detail: `${item.applicationReference} has ${item.discrepancies} displayed discrepancies.`, href: `/admin/hiring/verification-centre/${encodeURIComponent(item.id)}`, status: item.status, icon: ShieldCheck })),
    ...snapshot.hrms.filter((item) => item.status === "sync_failed").slice(0, 3).map((item) => ({ id: `hrms-${item.applicationReference}`, title: "HRMS sync failed safely", detail: item.failure || `${item.applicationReference} requires provider review.`, href: "/admin/hiring/hrms-sync", status: "failed", icon: DatabaseZap }))
  ];
  if (snapshot.connectedReviewCount > 0) items.unshift({ id: "connected-candidates", title: "Connected-candidate review", detail: `${snapshot.connectedReviewCount} possible candidate link${snapshot.connectedReviewCount === 1 ? "" : "s"} require human review.`, href: "/admin/hiring/connected-candidates", status: "review_required", icon: Link2 });
  if (snapshot.notificationFailureCount > 0) items.unshift({ id: "hiring-notifications", title: "Hiring notification delivery", detail: `${snapshot.notificationFailureCount} application alert${snapshot.notificationFailureCount === 1 ? "" : "s"} require an authorised retry.`, href: "/admin/hiring/applications", status: "failed", icon: AlertTriangle });

  if (!items.length) return <AdminEmptyState title="No hiring actions waiting" description="Submitted assessments, verification cases, connected-candidate reviews and provider failures will appear here." />;
  return <div className="grid gap-3">{items.map((item) => { const Icon = item.icon; return <Link key={item.id} href={item.href} className="group grid gap-3 rounded-md border border-wxBorder p-4 transition hover:border-wxViolet700 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-wxSurfaceSoft text-wxViolet700"><Icon className="h-5 w-5" aria-hidden /></span><span><span className="block font-bold text-wxIndigo900">{item.title}</span><span className="mt-1 block text-sm text-wxIndigo500">{item.detail}</span></span><span className="flex items-center gap-2"><AdminStatus status={item.status} /><ArrowRight className="h-4 w-4 text-wxIndigo400 transition group-hover:translate-x-0.5" aria-hidden /></span></Link>; })}</div>;
}
