import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminSession } from "@/lib/auth";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { ThemeMenu } from "@/components/theme/ThemeMenu";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/leads", label: "Quote Leads" },
  { href: "/admin/crm", label: "CRM" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/revisions", label: "Revisions" },
  { href: "/admin/sla", label: "SLA" },
  { href: "/admin/founder-report", label: "Founder" }
];

export function AdminShell({
  session,
  title,
  eyebrow,
  children
}: {
  session: AdminSession;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paleSage text-charcoalInk">
      <header className="sticky top-0 z-40 border-b border-wxBorder bg-wxSurfaceElevated text-wxIndigo900 shadow-soft">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/admin/dashboard" className="text-lg font-bold">
              WriteX Admin
            </Link>
            <p className="text-xs text-wxIndigo500">
              {session.email} · {session.role.replace("_", " ")}
            </p>
          </div>
          <nav aria-label="Admin navigation" className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-semibold text-wxIndigo500 transition hover:bg-wxSurfaceSoft hover:text-wxViolet700"
              >
                {item.label}
              </Link>
            ))}
            <ThemeMenu />
            <AdminLogoutButton />
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-6 md:py-8">
        {eyebrow ? (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-mutedCopper">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      </section>
      <div className="mx-auto max-w-7xl px-5 pb-12">{children}</div>
    </div>
  );
}
