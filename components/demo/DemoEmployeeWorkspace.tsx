"use client";

import { useState } from "react";
import { AlertTriangle, Bell, LayoutDashboard, ListChecks, LogOut, Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { trackDemoEvent } from "@/lib/demo/analytics";
import { getEmployeeDemoData } from "@/lib/demo/employeeDemoData";

type DemoEmployeeData = ReturnType<typeof getEmployeeDemoData>;

export function DemoEmployeeWorkspace({ data }: { data: DemoEmployeeData }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function block(action: string) {
    setNotice("This action is disabled in demo mode.");
    trackDemoEvent("demo_action_blocked", { demo_type: "employee", workspace: data.workspace, page_path: `${data.defaultRoute}#${action}` });
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/demo/logout", { method: "POST" });
    trackDemoEvent("demo_logout", { demo_type: "employee", workspace: data.workspace, page_path: data.defaultRoute });
    router.push("/employee-login");
    router.refresh();
  }

  const nav = <nav aria-label="Employee navigation" className="grid gap-1">
    <a href="#overview" className="flex min-h-11 items-center gap-3 rounded-lg bg-wxViolet700 px-3 text-sm font-semibold text-white"><LayoutDashboard className="h-4 w-4" aria-hidden />Overview</a>
    <a href="#work-queue" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-wxIndigo700 hover:bg-wxSurfaceSoft"><ListChecks className="h-4 w-4" aria-hidden />Work queue</a>
    <a href="#alerts" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-wxIndigo700 hover:bg-wxSurfaceSoft"><Bell className="h-4 w-4" aria-hidden />Alerts</a>
  </nav>;

  return (
    <main className="min-h-screen bg-wxBg text-wxIndigo900">
      <DemoBanner />
      <header className="sticky top-0 z-30 border-b border-wxBorder bg-wxSurface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[96rem] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3"><button type="button" onClick={() => setMenuOpen(true)} aria-label="Open navigation" className="grid h-11 w-11 place-items-center rounded-lg border border-wxBorder lg:hidden"><Menu className="h-5 w-5" /></button><BrandLogo markClassName="h-9 w-32" /><span className="rounded-full border border-wxBorder px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-wxViolet700">Demo</span></div>
          <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold">Demo Team Member</p><p className="text-xs text-wxIndigo500">{data.user.designation.name}</p></div><button type="button" onClick={logout} disabled={loggingOut} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-wxBorder px-3 text-sm font-semibold hover:border-wxViolet700 disabled:opacity-60"><LogOut className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">{loggingOut ? "Leaving..." : "Logout"}</span></button></div>
        </div>
      </header>

      {menuOpen ? <div className="fixed inset-0 z-50 bg-wxIndigo900/40 lg:hidden" onClick={() => setMenuOpen(false)}><aside className="h-full w-72 bg-wxSurface p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-6 flex items-center justify-between"><strong>Navigation</strong><button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation" className="grid h-11 w-11 place-items-center rounded-lg border border-wxBorder"><X className="h-5 w-5" /></button></div>{nav}</aside></div> : null}

      <div className="mx-auto grid max-w-[96rem] lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-wxBorder bg-wxSurface p-5 lg:block"><p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-wxIndigo500">{data.user.department.name}</p>{nav}</aside>
        <section id="overview" className="min-w-0 p-4 sm:p-6 lg:p-8">
          <header>
            <p className="text-sm font-semibold text-wxViolet700">{data.user.designation.name}</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{data.view.heading}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-wxIndigo500 sm:text-base">{data.view.description}</p>
          </header>

          <section aria-label="Summary metrics" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.metrics.map((metric) => <article key={metric.label} className="rounded-2xl border border-wxBorder bg-wxSurface p-5 shadow-soft"><p className="text-sm text-wxIndigo500">{metric.label}</p><p className="mt-2 text-3xl font-semibold">{metric.value}</p><p className="mt-2 text-xs text-wxIndigo500">{metric.note}</p></article>)}
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,.5fr)]">
            <section id="work-queue" className="min-w-0 rounded-2xl border border-wxBorder bg-wxSurface p-5 shadow-soft sm:p-6">
              <h2 className="text-xl font-semibold">{data.view.listTitle}</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead><tr className="border-b border-wxBorder text-wxIndigo500">{data.view.columns.map((column) => <th key={column} className="pb-3 font-semibold">{column}</th>)}<th className="pb-3 text-right font-semibold">Action</th></tr></thead>
                  <tbody>{data.view.rows.map((row) => <tr key={row.join("-")} className="border-b border-wxBorder/70 last:border-0"><td className="py-4 font-semibold">{row[0]}</td><td className="py-4">{row[1]}</td><td className="py-4">{row[2]}</td><td className="py-4 text-right"><button type="button" onClick={() => block("open_record")} className="min-h-11 font-semibold text-wxViolet700">View</button></td></tr>)}</tbody>
                </table>
              </div>
            </section>

            <aside id="alerts" className="rounded-2xl border border-orange-200 bg-orange-50 p-6 text-orange-950 shadow-soft">
              <AlertTriangle className="h-6 w-6" aria-hidden />
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em]">Needs attention</p>
              <h2 className="mt-2 text-xl font-semibold">{data.view.alertTitle}</h2>
              <p className="mt-3 text-sm leading-6">{data.view.alertBody}</p>
              <button type="button" onClick={() => block("primary_action")} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-wxIndigo900 px-4 text-sm font-semibold text-white">{data.view.primaryAction}</button>
              {notice ? <p role="status" className="mt-4 rounded-lg bg-white px-3 py-3 text-xs font-semibold">{notice}</p> : null}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
