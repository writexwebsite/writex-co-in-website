"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  PanelLeftClose,
  Wrench,
  X
} from "lucide-react";
import { LogoWithTrademark } from "@/components/LogoWithTrademark";
import {
  getVisibleAdminNavigation,
  isAdminNavigationGroupActive,
  isAdminNavigationItemActive
} from "@/lib/admin/navigation";

export function AdminNavigation({
  role,
  hiringEnabled
}: {
  role: string;
  hiringEnabled: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const visibleGroups = getVisibleAdminNavigation({ role, hiringEnabled });
  const activeGroup = visibleGroups.find((group) =>
    isAdminNavigationGroupActive(pathname, group)
  );
  const [expandedOverride, setExpandedOverride] = useState<{
    pathname: string;
    href: string | null;
  } | null>(null);
  const expandedGroup =
    expandedOverride?.pathname === pathname
      ? expandedOverride.href
      : activeGroup?.href || null;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCollapsed(
        localStorage.getItem("writex-admin-sidebar-collapsed") === "true"
      );
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("writex-admin-sidebar-collapsed", String(next));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-[65] inline-flex h-11 w-11 items-center justify-center rounded-md border border-wxBorder bg-wxSurface text-wxIndigo900 shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 lg:hidden"
        aria-label="Open Admin navigation"
        aria-expanded={mobileOpen}
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-[#090d25]/45 backdrop-blur-sm lg:hidden"
          aria-label="Close Admin navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        aria-label="Admin sidebar"
        className={`fixed inset-y-0 left-0 z-[60] flex border-r border-wxBorder bg-wxSurfaceElevated/96 shadow-[12px_0_42px_rgba(85,22,242,.07)] backdrop-blur-xl transition-[width,transform] duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-[80px]" : "w-[292px]"}`}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[72px] items-center justify-between border-b border-wxBorder px-4">
            <Link
              href="/admin/dashboard"
              className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
              title="WriteX Command Centre"
            >
              {collapsed ? (
                <span className="wx-gradient-action inline-flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold text-white">
                  WX
                </span>
              ) : (
                <span className="flex min-w-0 items-center gap-3">
                  <LogoWithTrademark
                    className="w-[106px]"
                    sizes="106px"
                    priority
                  />
                  <span className="min-w-0 border-l border-wxBorder pl-3">
                    <span className="block truncate text-xs font-semibold uppercase tracking-[0.14em] text-wxViolet700">
                      Command Centre
                    </span>
                    <span className="mt-0.5 block text-[11px] text-wxIndigo500">
                      Super Admin
                    </span>
                  </span>
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-wxIndigo500 hover:bg-wxSurfaceSoft lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav
            aria-label="Admin navigation"
            className="min-h-0 flex-1 overflow-y-auto px-3 py-5"
          >
            <p className={`${collapsed ? "sr-only" : "mb-3 px-3"} text-[10px] font-semibold uppercase tracking-[0.16em] text-wxIndigo400`}>
              Workspaces
            </p>
            <div className="grid gap-1.5">
              {visibleGroups.map((group) => {
                const groupActive = isAdminNavigationGroupActive(pathname, group);
                const expanded = expandedGroup === group.href;
                const GroupIcon = group.icon;
                const advancedActive = group.advancedItems.some((item) =>
                  isAdminNavigationItemActive(pathname, item.href)
                );
                return (
                  <div key={group.href}>
                    <div className="flex items-center gap-1">
                      <Link
                        href={group.href}
                        onClick={() => {
                          setExpandedOverride({ pathname, href: group.href });
                          setMobileOpen(false);
                        }}
                        title={collapsed ? group.label : undefined}
                        aria-current={pathname === group.href ? "page" : undefined}
                        data-state={groupActive ? "selected" : "default"}
                        className={`wx-interactive-nav wx-interactive-state group relative flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md border border-transparent px-3 text-sm font-semibold transition ${
                          groupActive ? "shadow-[inset_3px_0_0_var(--wx-border-selected)]" : ""
                        } ${collapsed ? "justify-center" : ""}`}
                      >
                        <GroupIcon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                        {collapsed ? (
                          <span className="sr-only">{group.label}</span>
                        ) : (
                          <span className="truncate">{group.label}</span>
                        )}
                      </Link>
                      {!collapsed ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedOverride({
                              pathname,
                              href: expanded ? null : group.href
                            })
                          }
                          className="inline-flex h-11 w-9 shrink-0 items-center justify-center rounded-md text-wxIndigo500 hover:bg-wxSurfaceSoft hover:text-wxIndigo900"
                          aria-label={`${expanded ? "Hide" : "Show"} ${group.label} tasks`}
                          aria-expanded={expanded}
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      ) : null}
                    </div>

                    {expanded && !collapsed ? (
                      <div className="ml-5 mt-1 grid gap-0.5 border-l border-wxBorder pl-2">
                        {group.items.map((item) => {
                    const active = isAdminNavigationItemActive(
                      pathname,
                      item.href
                    );
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        data-state={active ? "selected" : "default"}
                        className="wx-interactive-nav wx-interactive-state group relative flex min-h-10 items-center gap-2.5 rounded-md border border-transparent px-3 text-[13px] font-medium transition"
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                        })}

                        {group.advancedItems.length ? (
                          <details className="mt-1" open={advancedActive || undefined}>
                            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2.5 rounded-md px-3 text-[12px] font-semibold text-wxIndigo500 hover:bg-wxSurfaceSoft hover:text-wxIndigo900">
                              <Wrench className="h-4 w-4" />
                              Advanced
                              <ChevronDown className="ml-auto h-3.5 w-3.5" />
                            </summary>
                            <div className="grid gap-0.5 pl-2">
                              {group.advancedItems.map((item) => {
                                const active = isAdminNavigationItemActive(
                                  pathname,
                                  item.href
                                );
                                const Icon = item.icon;
                                return (
                                  <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    aria-current={active ? "page" : undefined}
                                    data-state={active ? "selected" : "default"}
                                    className="wx-interactive-nav wx-interactive-state flex min-h-10 items-center gap-2.5 rounded-md border border-transparent px-3 text-[13px] font-medium"
                                  >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{item.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-wxBorder p-3">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden min-h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-medium text-wxIndigo500 transition hover:bg-wxSurfaceSoft hover:text-wxIndigo900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 lg:flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4" />
                  Collapse navigation
                  <ChevronLeft className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      <div
        aria-hidden
        className={`hidden shrink-0 transition-[width] duration-200 lg:block ${
          collapsed ? "w-[80px]" : "w-[292px]"
        }`}
      />
    </>
  );
}
