"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BriefcaseBusiness,
  CalendarRange,
  CircleUserRound,
  Home,
  Layers3,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { ClientLogoutButton } from "@/components/client/ClientLogoutButton";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  matches?: string[];
};

const customerNavigation: NavigationItem[] = [
  { href: "/my-writex", label: "Home", icon: Home, exact: true },
  {
    href: "/my-writex/work",
    label: "Work",
    icon: Layers3,
    matches: ["/my-writex/work", "/my-writex/projects", "/my-writex/start", "/my-writex/new-requirement", "/my-writex/requests", "/my-writex/documents", "/my-writex/invoices", "/my-writex/support"],
  },
  { href: "/my-writex/career", label: "Career", icon: BriefcaseBusiness },
  { href: "/my-writex/plan", label: "Plan", icon: CalendarRange, matches: ["/my-writex/plan", "/my-writex/upcoming"] },
  {
    href: "/my-writex/account",
    label: "My WriteX",
    icon: CircleUserRound,
    matches: ["/my-writex/account", "/my-writex/manager", "/my-writex/profile", "/my-writex/benefits"],
  },
];

const drawerShortcuts = [
  { href: "/my-writex/new-requirement", label: "Start new requirement" },
  { href: "/my-writex/requests", label: "My Requests" },
  { href: "/my-writex/projects", label: "Projects" },
  { href: "/my-writex/career/jobs", label: "Job Radar" },
  { href: "/my-writex/career/cv", label: "CV Studio" },
  { href: "/my-writex/upcoming", label: "Upcoming work" },
  { href: "/my-writex/manager", label: "My manager" },
];

function isActive(item: NavigationItem, pathname: string) {
  if (item.exact) return pathname === item.href;
  return (item.matches || [item.href]).some((value) => pathname.startsWith(value));
}

function NavLink({ item, onNavigate }: { item: NavigationItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(item, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className="mw-desktop-nav-link"
      data-active={active}
      title={item.label}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="mw-sidebar-copy">{item.label}</span>
    </Link>
  );
}

export function DesktopCustomerNavigation() {
  return (
    <nav aria-label="My WriteX navigation" className="mw-desktop-nav">
      <div className="mw-desktop-nav-list">{customerNavigation.map((item) => <NavLink key={item.href} item={item} />)}</div>
      <div className="mw-sidebar-concierge mt-auto border-t border-[var(--mw-line)] px-3 pt-4">
        <p className="mw-meta font-medium text-[var(--mw-ink)]">Need a person?</p>
        <Link href="/my-writex/manager?intent=message" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--mw-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]">Ask your manager</Link>
      </div>
    </nav>
  );
}

export function MobileCustomerNavigation() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-12 w-12 items-center justify-center rounded-[10px] text-[var(--mw-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)] lg:hidden" aria-label="Open My WriteX menu"><Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden /></button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-[#171a1f]/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col overflow-hidden bg-white p-5 text-[var(--mw-ink)] shadow-[0_8px_28px_rgba(16,24,40,0.06)]">
            <div className="flex items-center justify-between">
              <div><p className="mw-eyebrow">My WriteX</p><p className="mw-section-title mt-1">Your complete space</p></div>
              <button onClick={() => setOpen(false)} aria-label="Close My WriteX menu" className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-[var(--mw-line)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]"><X className="h-5 w-5" strokeWidth={1.75} aria-hidden /></button>
            </div>
            <div className="mt-5 shrink-0 border-y border-[var(--mw-line)] py-4"><ClientLogoutButton /></div>
            <nav aria-label="Mobile My WriteX navigation" className="mt-7 min-h-0 flex-1 overflow-y-auto pb-5">
              <div className="grid gap-1">{customerNavigation.map((item) => <NavLink key={item.href} item={item} onNavigate={() => setOpen(false)} />)}</div>
              <div className="mt-7 border-t border-[var(--mw-line)] pt-5">
                <p className="mw-meta px-3 font-medium">Shortcuts</p>
                <div className="mt-3 grid gap-1">{drawerShortcuts.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-[10px] px-3 text-sm font-medium text-[var(--mw-muted)] outline-none hover:bg-[var(--mw-soft)] focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]">{item.label}</Link>)}</div>
              </div>
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}

export function MobileCustomerBottomNavigation() {
  return (
    <nav aria-label="Mobile My WriteX navigation" className="mw-mobile-bottom-nav">
      {customerNavigation.map((item) => <CompactLink key={item.href} item={item} />)}
    </nav>
  );
}

function CompactLink({ item }: { item: NavigationItem }) {
  const pathname = usePathname();
  const active = isActive(item, pathname);
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className="mw-mobile-nav-link" data-active={active}>
      <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden /><span className="truncate">{item.label === "My WriteX" ? "You" : item.label}</span>
    </Link>
  );
}
