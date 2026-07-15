"use client";

import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { navigateWithAxoTransition } from "@/lib/auth/axoLoginTransition";
import { trackDemoEvent } from "@/lib/demo/analytics";
import { publicDemoWorkspaces } from "@/lib/demo/demoWorkspaces";

export function DemoEmployeeLogin() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  if (process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED !== "true") return null;

  async function chooseWorkspace(workspace: string) {
    setLoading(workspace);
    setError("");
    trackDemoEvent("demo_workspace_selected", { demo_type: "employee", workspace, page_path: "/employee-login" });
    const response = await fetch("/api/demo/employee-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.data?.authenticated || !payload.data.defaultRoute) {
      setLoading(null);
      setError("Team demo is not available in this environment.");
      return;
    }
    trackDemoEvent("demo_employee_login_success", { demo_type: "employee", workspace, page_path: "/employee-login" });
    navigateWithAxoTransition(payload.data.defaultRoute, router.push, "Loading Demo Workspace...");
  }

  return (
    <>
      <div className="mt-4 border-t border-wxBorder pt-4">
        <button type="button" onClick={() => { setOpen(true); trackDemoEvent("demo_employee_login_started", { demo_type: "employee", page_path: "/employee-login" }); }} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-wxViolet700/35 px-5 text-sm font-semibold text-wxViolet700 hover:bg-wxViolet700/5">
          <FlaskConical className="h-4 w-4" aria-hidden />View Team Demo
          <span className="rounded-full bg-wxViolet700/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]">Demo</span>
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-wxIndigo900/55 sm:items-center sm:p-5">
          <section role="dialog" aria-modal="true" aria-labelledby="demo-workspace-title" className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-wxBorder bg-wxSurface p-5 shadow-2xl sm:rounded-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-wxViolet700">Read-only demo</p><h2 id="demo-workspace-title" className="mt-2 text-2xl font-semibold">Choose a Demo Workspace</h2><p className="mt-2 text-sm text-wxIndigo500">Fictional data. Changes are not saved.</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close demo workspace selector" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-wxBorder"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 divide-y divide-wxBorder rounded-xl border border-wxBorder">
              {publicDemoWorkspaces.map((workspace) => (
                <button key={workspace.id} type="button" onClick={() => chooseWorkspace(workspace.id)} disabled={Boolean(loading)} className="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-wxSurfaceSoft disabled:opacity-60">
                  <span><strong className="block text-sm">{workspace.label}</strong><span className="mt-1 block text-xs leading-5 text-wxIndigo500">{workspace.description}</span></span>
                  <span className="shrink-0 text-xs font-semibold text-wxViolet700">{loading === workspace.id ? "Opening..." : "View"}</span>
                </button>
              ))}
            </div>
            {error ? <p role="alert" className="mt-4 rounded-lg border border-deepCrimson/20 bg-deepCrimson/5 p-3 text-sm font-semibold text-deepCrimson">{error}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
