import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CircleAlert,
  ClipboardCheck,
  FileClock,
  FileSearch,
  LifeBuoy,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPanel, AdminStatus } from "@/components/admin/AdminPrimitives";
import { getAdminCommandCentre } from "@/lib/admin/command-centre";
import { requireAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Today's Tasks | WriteX Admin",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const command = await getAdminCommandCentre(session);
  const hiringCounts = command.hiring?.counts || {};
  const deliveryIssues =
    command.metrics.revisions.submitted +
    command.metrics.revisions.underReview +
    command.metrics.revisions.needsClarification +
    command.metrics.actionQueue.openSlaAlerts;
  const candidateReviews =
    (hiringCounts.application_received || 0) +
    (command.hiring?.connectedReviewCount || 0);
  const interviewWork =
    (hiringCounts.interview_scheduled || 0) +
    (hiringCounts.interview_completed || 0);
  const verificationWork =
    command.metrics.payments.pendingVerification +
    (command.hiring?.verificationCases.length || 0);
  const festivalVisible = ["super_admin", "website_experience_admin", "read_only_auditor"].includes(session.role);
  const festivalWritable = ["super_admin", "website_experience_admin"].includes(session.role);
  const primary =
    command.critical[0] ||
    command.actionRequired.find((item) => Number(item.value) > 0) ||
    command.pending.find((item) => Number(item.value) > 0);

  const todayTasks: TodayTask[] = [
    {
      title: "Leads needing action",
      value: command.metrics.actionQueue.unassignedLeads,
      description: "New enquiries waiting for an owner.",
      href: "/admin/manager-review",
      icon: FileSearch
    },
    {
      title: "Follow-ups due",
      value: command.metrics.actionQueue.overdueFollowUps,
      description: "CRM follow-ups at or past their due time.",
      href: "/admin/crm",
      icon: UsersRound
    },
    {
      title: "Client requests pending",
      value: command.client ? "Provider pending" : "Restricted",
      description: "Client support and clarification requests.",
      href: command.client ? "/admin/client-portal/support-requests" : "/admin/crm",
      icon: LifeBuoy
    },
    {
      title: "Deliveries and issues",
      value: deliveryIssues,
      description: "Revision, clarification and SLA attention.",
      href: "/admin/sales-delivery#payment-issues",
      icon: FileClock
    },
    {
      title: "Verification pending",
      value: verificationWork,
      description: "Payment and candidate decisions still open.",
      href: "/admin/verification?status=pending",
      icon: ShieldCheck
    },
    {
      title: "Candidates awaiting review",
      value: command.hiring ? candidateReviews : "Restricted",
      description: "Applications and candidate links needing review.",
      href: command.hiring ? "/admin/hiring/applications" : "/admin/dashboard",
      icon: ClipboardCheck
    },
    {
      title: "Interviews due",
      value: command.hiring ? interviewWork : "Restricted",
      description: "Scheduled interviews and scorecards to complete.",
      href: command.hiring ? "/admin/hiring/interviews" : "/admin/dashboard",
      icon: CalendarDays
    },
    {
      title: "Festival status",
      value: command.festival.festivalName,
      description: command.festival.active
        ? `${command.festival.variantName || "Approved variant"} is public.`
        : `${command.festival.scheduledCount} scheduled configuration${command.festival.scheduledCount === 1 ? "" : "s"}.`,
      href: festivalVisible ? "/admin/website-experience/festival-studio?section=overview" : "/admin/system",
      icon: Sparkles
    },
    {
      title: "System alerts",
      value: command.critical.length,
      description: "Current operational or provider warnings.",
      href: "/admin/action-centre",
      icon: CircleAlert
    }
  ];

  const quickActions = [
    { label: "Add Lead", href: "/pricing#quote", icon: FileSearch },
    ...(command.client ? [{ label: "Find Client", href: "/admin/client-portal", icon: Search }] : []),
    ...(command.hiring ? [{ label: "Review Candidate", href: "/admin/hiring/applications", icon: ClipboardCheck }] : []),
    { label: "View Pending Verification", href: "/admin/verification?status=pending", icon: ShieldCheck },
    ...(festivalVisible ? [{ label: "Open Festival Studio", href: "/admin/website-experience/festival-studio", icon: Sparkles }] : []),
    ...(festivalWritable ? [{ label: "Restore Normal Website", href: "/admin/website-experience/festival-studio?section=overview#restore-normal-website", icon: BellRing }] : [])
  ];

  return (
    <AdminShell
      session={session}
      eyebrow="Dashboard"
      title="Today's Tasks"
      description="Start with the work that needs attention today. Every card opens the exact operational queue."
      nextAction={
        primary
          ? {
              label: primary.actionLabel,
              reason: primary.description,
              href: primary.href
            }
          : undefined
      }
    >
      <section id="todays-tasks" className="scroll-mt-28" aria-labelledby="todays-tasks-heading">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="todays-tasks-heading" className="text-xl font-semibold text-wxIndigo900">Operational queues</h2>
            <p className="mt-1 text-sm text-wxIndigo500">Live counts are shown where an approved provider is available.</p>
          </div>
          <Link href="/admin/action-centre" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-wxViolet700">
            Open all alerts <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {todayTasks.map((task) => <TodayTaskCard key={task.title} task={task} />)}
        </div>
      </section>

      <section className="mt-7" aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="text-xl font-semibold text-wxIndigo900">Quick actions</h2>
        <p className="mt-1 text-sm text-wxIndigo500">The most common Admin actions, one click away.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold text-wxIndigo700 transition hover:border-wxViolet700 hover:text-wxViolet700">
                <Icon className="h-4 w-4" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-7">
        <AdminPanel
          title="System status"
          description="Sanitised provider and infrastructure health. Technical diagnostics remain in System > Advanced."
          action={<Link href="/admin/system" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxViolet700 hover:border-wxViolet700">Open System <ArrowRight className="h-4 w-4" /></Link>}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {command.systems.slice(0, 4).map((system) => (
              <Link key={system.name} href={system.href} className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 transition hover:border-wxViolet700">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-wxIndigo900">{system.name}</h3>
                  <AdminStatus status={system.status} />
                </div>
                <p className="mt-3 text-sm leading-5 text-wxIndigo500">{system.detail}</p>
              </Link>
            ))}
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}

type TodayTask = {
  title: string;
  value: string | number;
  description: string;
  href: string;
  icon: LucideIcon;
};

function TodayTaskCard({ task }: { task: TodayTask }) {
  const Icon = task.icon;
  const needsAttention = typeof task.value === "number" && task.value > 0;
  return (
    <Link href={task.href} className="group flex min-h-[126px] flex-col rounded-md border border-wxBorder bg-wxSurface p-4 shadow-soft transition hover:border-wxViolet700">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${needsAttention ? "bg-wxRed500/10 text-wxRed500" : "bg-wxSurfaceSoft text-wxViolet700"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <strong className="max-w-[62%] break-words text-right text-lg font-semibold text-wxIndigo900">{task.value}</strong>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-wxIndigo900">{task.title}</h3>
      <p className="mt-1 text-xs leading-5 text-wxIndigo500">{task.description}</p>
    </Link>
  );
}
