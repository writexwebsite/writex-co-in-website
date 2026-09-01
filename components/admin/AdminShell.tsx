import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { AdminSession } from "@/lib/auth";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { AdminGuidanceLayer } from "@/components/admin/AdminGuidanceLayer";
import { isHiringFeatureEnabled } from "@/lib/hiring/feature-flags";

export function AdminShell({
  session,
  title,
  eyebrow,
  description,
  actions,
  nextAction,
  children
}: {
  session: AdminSession;
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  nextAction?: {
    label: string;
    reason: string;
    href: string;
  };
  children: ReactNode;
}) {
  const hiringEnabled = isHiringFeatureEnabled("admin");
  const hiringOnly = session.role !== "super_admin" && Boolean(session.hiringRole);
  const workspaceHref = hiringOnly ? "/admin/hiring" : "/admin/dashboard";
  const breadcrumb = (eyebrow || "Admin")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <div className="flex min-h-screen bg-wxBg text-wxIndigo900">
      <AdminNavigation role={session.role} hiringRole={session.hiringRole} hiringEnabled={hiringEnabled} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-[72px] items-center border-b border-wxBorder bg-wxSurfaceElevated/92 px-4 shadow-[0_8px_32px_rgba(85,22,242,.05)] backdrop-blur-xl lg:px-6">
          <AdminToolbar
            email={session.email}
            role={session.role}
            hiringRole={session.hiringRole}
            environment={process.env.APP_ENV || process.env.NODE_ENV || "unknown"}
            hiringEnabled={hiringEnabled}
          />
        </header>

        <main className="min-w-0">
          <section className="border-b border-wxBorder bg-wxSurfaceElevated/56">
            <div className="mx-auto max-w-[1540px] px-4 py-6 sm:px-6 md:py-8 lg:px-8">
              <nav
                aria-label="Breadcrumb"
                className="mb-4 flex flex-wrap items-center gap-1 text-xs font-medium text-wxIndigo500"
              >
                <AdminBackButton />
                <span className="mx-1 h-4 w-px bg-wxBorder" aria-hidden />
                <Link href={workspaceHref} className="hover:text-wxViolet700">
                  {hiringOnly ? "Smart Hiring" : "WriteX Admin"}
                </Link>
                {breadcrumb.map((part) => (
                  <span key={part} className="inline-flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" aria-hidden />
                    <span>{part}</span>
                  </span>
                ))}
              </nav>

              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                  {eyebrow ? (
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-wxViolet700">
                      {eyebrow}
                    </p>
                  ) : null}
                  <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-wxIndigo900 md:text-[2.5rem]">
                    {title}
                  </h1>
                  {description ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-wxIndigo500 md:text-[15px]">
                      {description}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {actions || (
                    <>
                      <Link
                        href={hiringOnly ? "/admin/hiring/applications" : "/admin/help"}
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold text-wxIndigo700 transition hover:border-wxViolet700"
                      >
                        {hiringOnly ? "Open Candidates" : "Page guidance"}
                      </Link>
                      <Link
                        href={hiringOnly ? "/admin/hiring" : "/admin/action-centre"}
                        className="wx-gradient-action inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white"
                      >
                        {hiringOnly ? "Hiring Overview" : "Open Action Centre"}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {nextAction ? (
                <div className="mt-5 flex flex-col gap-3 rounded-md border border-[color:var(--wx-border-strong)] bg-wxSurfaceSoft px-4 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wxViolet700">
                      Next recommended action
                    </p>
                    <p className="mt-1 text-sm text-wxIndigo600">
                      <strong className="font-semibold text-wxIndigo900">
                        {nextAction.label}.
                      </strong>{" "}
                      {nextAction.reason}
                    </p>
                  </div>
                  <Link
                    href={nextAction.href}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold text-wxViolet700 transition hover:border-wxViolet700"
                  >
                    Open action
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}
            </div>
          </section>

          <div className="mx-auto max-w-[1540px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="wx-admin-enter">{children}</div>
          </div>
        </main>

        {!hiringOnly ? <AdminGuidanceLayer
          role={session.role}
          adminUserId={session.adminUserId}
        /> : null}
      </div>
    </div>
  );
}
