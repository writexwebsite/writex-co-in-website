"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Command,
  FileSearch,
  Search,
  ShieldCheck,
  UserRound,
  X
} from "lucide-react";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { ThemeMenu } from "@/components/theme/ThemeMenu";
import { adminSearchActions, getVisibleAdminNavigation } from "@/lib/admin/navigation";

export function AdminToolbar({
  email,
  role,
  environment,
  hiringEnabled
}: {
  email: string;
  role: string;
  environment: string;
  hiringEnabled: boolean;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const items = useMemo(
    () =>
      [
        ...getVisibleAdminNavigation({ role, hiringEnabled }).flatMap((group) => [
          { ...group, group: "Workspaces" },
          ...group.items.map((item) => ({ ...item, group: group.label })),
          ...group.advancedItems.map((item) => ({
            ...item,
            group: `${group.label} - Advanced`
          }))
        ]),
        ...(role === "super_admin" || role === "website_experience_admin" || role === "read_only_auditor"
          ? adminSearchActions.map((item) => ({ ...item, group: "Festival Studio" }))
          : [])
      ],
    [role, hiringEnabled]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setAccountOpen(false);
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [searchOpen]);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      const target = event.target as Node;
      if (!accountRef.current?.contains(target)) setAccountOpen(false);
      if (!notificationRef.current?.contains(target)) setNotificationsOpen(false);
    }
    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const destinationResults = items
    .filter((item) => {
      const haystack = `${item.label} ${item.group} ${
        item.keywords?.join(" ") || ""
      }`.toLowerCase();
      return !normalizedQuery || haystack.includes(normalizedQuery);
    })
    .slice(0, normalizedQuery ? 12 : 8);
  const recordSearchResults = normalizedQuery.length >= 2
    ? [
        {
          href: `/admin/leads?search=${encodeURIComponent(query.trim())}`,
          label: `Search leads for "${query.trim()}"`,
          icon: FileSearch,
          group: "Leads"
        },
        ...(role === "super_admin"
          ? [
              {
                href: `/admin/employees?search=${encodeURIComponent(query.trim())}`,
                label: `Find employee "${query.trim()}"`,
                icon: UserRound,
                group: "Employees"
              },
              {
                href: `/admin/client-portal?search=${encodeURIComponent(query.trim())}`,
                label: `Find client or invoice "${query.trim()}"`,
                icon: Search,
                group: "Clients"
              }
            ]
          : []),
        ...(hiringEnabled
          ? [
              {
                href: `/admin/hiring/applications?search=${encodeURIComponent(query.trim())}`,
                label: `Search candidates and references for "${query.trim()}"`,
                icon: BriefcaseBusiness,
                group: "Candidates"
              }
            ]
          : []),
        {
          href: `/admin/revisions?search=${encodeURIComponent(query.trim())}`,
          label: `Search requests or orders for "${query.trim()}"`,
          icon: ClipboardCheck,
          group: "Requests & orders"
        },
        ...(role === "super_admin"
          ? [
              {
                href: `/admin/client-portal/files?search=${encodeURIComponent(query.trim())}`,
                label: `Find documents or file references for "${query.trim()}"`,
                icon: Archive,
                group: "Documents & references"
              }
            ]
          : [])
      ]
    : [];
  const results = [...recordSearchResults, ...destinationResults];
  const groupedResults = results.reduce<Record<string, typeof results>>(
    (groups, item) => {
      (groups[item.group] ||= []).push(item);
      return groups;
    },
    {}
  );

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center pl-14 lg:pl-0">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex h-11 min-w-0 max-w-[480px] flex-1 items-center gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-left text-sm text-wxIndigo500 transition hover:border-[color:var(--wx-border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
          aria-label="Search Admin work and records"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Search work, people, records and settings</span>
          <span className="ml-auto hidden items-center gap-1 rounded border border-wxBorder bg-wxSurface px-2 py-1 text-[10px] font-semibold sm:inline-flex">
            <Command className="h-3 w-3" /> K
          </span>
        </button>
      </div>

      <div className="ml-3 flex shrink-0 items-center gap-2">
        <Link
          href="/admin/action-centre"
          className="hidden min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-medium text-wxIndigo700 transition hover:border-wxViolet700 hover:text-wxViolet700 xl:inline-flex"
        >
          <ShieldCheck className="h-4 w-4" />
          Action Centre
        </Link>

        <span className="hidden rounded-full border border-wxGreen500/25 bg-wxGreen500/10 px-3 py-1.5 text-[11px] font-semibold text-wxIndigo700 md:inline-flex">
          {humanise(environment)}
        </span>

        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((current) => !current)}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-md border border-wxBorder bg-wxSurface text-wxIndigo700 transition hover:border-wxViolet700 hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
            aria-label="Open notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-5 w-5" />
          </button>
          {notificationsOpen ? (
            <div className="absolute right-0 top-[calc(100%+.65rem)] z-[75] w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-wxBorder bg-wxSurface p-3 shadow-lift">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-wxIndigo900">
                  Notifications
                </p>
                <Link
                  href="/admin/action-centre"
                  className="text-xs font-semibold text-wxViolet700"
                >
                  Open Action Centre
                </Link>
              </div>
              <p className="mt-3 rounded-md bg-wxSurfaceSoft px-3 py-4 text-sm leading-6 text-wxIndigo500">
                Operational alerts are grouped by urgency in the Action Centre.
                No decorative or browser-only alert count is shown here.
              </p>
            </div>
          ) : null}
        </div>

        <Link
          href="/admin/help"
          className="hidden h-11 w-11 items-center justify-center rounded-md border border-wxBorder bg-wxSurface text-wxIndigo700 transition hover:border-wxViolet700 hover:text-wxViolet700 sm:inline-flex"
          aria-label="Help and tutorials"
        >
          <CircleHelp className="h-5 w-5" />
        </Link>
        <ThemeMenu />

        <div className="relative" ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((current) => !current)}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-2.5 text-wxIndigo700 transition hover:border-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
            aria-label="Open administrator menu"
            aria-expanded={accountOpen}
          >
            <span className="wx-gradient-action inline-flex h-7 w-7 items-center justify-center rounded-md text-white">
              <UserRound className="h-4 w-4" />
            </span>
            <ChevronDown className="hidden h-4 w-4 sm:block" />
          </button>
          {accountOpen ? (
            <div className="absolute right-0 top-[calc(100%+.65rem)] z-[75] w-[min(19rem,calc(100vw-2rem))] rounded-lg border border-wxBorder bg-wxSurface p-3 shadow-lift">
              <p className="truncate text-sm font-semibold text-wxIndigo900">
                {email}
              </p>
              <p className="mt-1 text-xs text-wxIndigo500">{humanise(role)}</p>
              <div className="my-3 h-px bg-wxBorder" />
              <Link
                href="/admin/settings"
                className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-wxIndigo700 hover:bg-wxSurfaceSoft"
              >
                Account settings
              </Link>
              <AdminLogoutButton />
            </div>
          ) : null}
        </div>
      </div>

      {searchOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-[#090d25]/45 px-4 pt-[10vh] backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Admin search"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-wxBorder bg-wxSurface shadow-lift">
            <div className="flex items-center gap-3 border-b border-wxBorder px-4">
              <Search className="h-5 w-5 text-wxIndigo400" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-14 min-w-0 flex-1 border-0 bg-transparent text-base text-wxIndigo900 outline-none"
                placeholder="Search a client, lead, candidate, request or page"
                aria-label="Search Admin work and records"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-wxIndigo500 hover:bg-wxSurfaceSoft"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[58vh] overflow-y-auto p-2">
              {results.length ? (
                Object.entries(groupedResults).map(([group, groupItems]) => (
                  <section key={group} aria-labelledby={`admin-search-${group.replace(/\W+/g, "-").toLowerCase()}`}>
                    <p
                      id={`admin-search-${group.replace(/\W+/g, "-").toLowerCase()}`}
                      className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-wxIndigo400"
                    >
                      {group}
                    </p>
                    {groupItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={`${group}-${item.href}`}
                          href={item.href}
                          onClick={() => setSearchOpen(false)}
                          className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-wxIndigo700 hover:bg-wxSurfaceSoft"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-wxViolet700" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </section>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-wxIndigo500">
                  No matching Admin destination.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function humanise(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
