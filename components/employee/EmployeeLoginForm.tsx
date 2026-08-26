"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Headphones, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthInput, SecretInput } from "@/components/auth/AuthFields";
import { DemoEmployeeLogin } from "@/components/demo/DemoEmployeeLogin";
import { navigateWithAxoTransition } from "@/lib/auth/axoLoginTransition";

type Workspace = { key: string; label: string; defaultRoute: string; role?: string; description?: string };

const GENERIC_LOGIN_ERROR = "Unable to sign in with those details. Please try again or contact WriteX IT Support.";
const AUTH_SERVICE_UNAVAILABLE = "Employee sign-in is temporarily unavailable while the secure employee directory connection is being completed. Please contact WriteX IT Support.";

export function EmployeeLoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => { const frame = requestAnimationFrame(() => setIdentifier(localStorage.getItem("writexRememberedEmployeeIdentifier") || "")); return () => cancelAnimationFrame(frame); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const remember = data.get("remember") === "on";
    try {
      const response = await fetch("/api/employee/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: data.get("identifier"), password: data.get("password") }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const code = payload?.error?.code;
        const unavailable = response.status === 503 || code === "NOT_CONFIGURED" || code === "EMPLOYEE_DIRECTORY_UNAVAILABLE";
        setError(unavailable ? AUTH_SERVICE_UNAVAILABLE : GENERIC_LOGIN_ERROR);
        return;
      }

      if (remember) localStorage.setItem("writexRememberedEmployeeIdentifier", identifier);
      else localStorage.removeItem("writexRememberedEmployeeIdentifier");

      const available = Array.isArray(payload?.data?.availableWorkspaces) ? payload.data.availableWorkspaces : [];
      if (available.length > 1) {
        setWorkspaces(available);
        return;
      }

      const defaultRoute = available[0]?.defaultRoute || payload?.data?.defaultRoute;
      if (!defaultRoute || !defaultRoute.startsWith("/employee/")) {
        setError("Your account is active, but no authorised workspace is assigned. Please contact WriteX IT Support.");
        return;
      }
      navigateWithAxoTransition(defaultRoute, router.push);
    } catch {
      setError(AUTH_SERVICE_UNAVAILABLE);
    } finally {
      setLoading(false);
    }
  }

  if (workspaces.length > 1) return (
    <section><h1 className="text-3xl font-semibold">Choose Your Workspace</h1><p className="mt-3 text-sm text-wxIndigo500">Only workspaces assigned to your profile are shown.</p><div className="mt-6 grid gap-3">{workspaces.map((workspace) => <button key={workspace.key} type="button" onClick={() => { localStorage.setItem("writexLastEmployeeWorkspace", workspace.key); navigateWithAxoTransition(workspace.defaultRoute, router.push); }} className="min-h-14 rounded-lg border border-wxBorder bg-wxSurface p-4 text-left transition hover:border-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wxViolet700"><strong className="block text-wxIndigo900">{workspace.label}</strong><span className="mt-1 block text-sm text-wxIndigo500">{workspace.role || workspace.description || "Authorised WriteX workspace"}</span></button>)}</div></section>
  );

  return (
    <form className="wx-auth-form" onSubmit={submit} aria-busy={loading}>
      <div className="text-center"><h1 className="text-3xl font-semibold text-wxIndigo900 sm:text-[2.15rem]">Welcome Back</h1><p className="mx-auto mt-3 max-w-md text-base leading-7 text-wxIndigo500">Sign in to access your assigned WriteX workspace.</p></div>
      <div className="mt-7"><AuthInput id="auth-first-input" label="Employee ID, email, or username" icon={UserRound} name="identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" required aria-describedby={error ? "employee-login-error" : undefined} placeholder="Enter your employee ID or email" /></div>
      <div className="mt-5"><SecretInput label="Password" name="password" autoComplete="current-password" required minLength={8} aria-describedby={error ? "employee-login-error" : undefined} placeholder="Enter your password" /></div>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm"><label className="flex min-h-11 items-center gap-2 text-wxIndigo500"><input name="remember" type="checkbox" className="h-4 w-4 accent-wxViolet700" />Remember username</label><button type="button" onClick={() => setForgot(true)} className="min-h-11 font-semibold text-wxViolet700">Forgot Password?</button></div>
      {forgot ? <p className="rounded-lg border border-wxBorder bg-wxSurfaceSoft p-3 text-sm text-wxIndigo700">Please contact WriteX IT Support or your authorised administrator to reset your password.</p> : null}
      {error ? <p id="employee-login-error" role="alert" aria-live="polite" className="mt-4 rounded-lg border border-deepCrimson/20 bg-deepCrimson/5 p-3 text-sm font-semibold text-deepCrimson">{error}</p> : null}
      <button disabled={loading} className="wx-gradient-action mt-6 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-lg px-5 font-semibold text-white disabled:opacity-60">{loading ? "Preparing Workspace..." : "Sign In"}{loading ? null : <ArrowRight className="h-5 w-5" />}</button>
      <DemoEmployeeLogin />
      <p className="mt-6 flex items-center justify-center gap-2 text-sm text-wxIndigo500"><Headphones className="h-5 w-5" />Need help? <a href="mailto:business@writex.co.in" className="font-semibold text-wxViolet700">Contact IT Support</a></p>
    </form>
  );
}
