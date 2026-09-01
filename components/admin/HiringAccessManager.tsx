"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck, UserMinus, UserPlus } from "lucide-react";

type Grant = {
  id: string; name: string; email: string; hiringRole: string;
  status: string; grantedAt: string; revokedAt: string | null;
};

const roles = [
  ["hr_admin", "HR Admin"],
  ["hiring_manager", "Hiring Manager"],
  ["assessor", "Assessor"],
  ["interviewer", "Interviewer"],
  ["read_only_auditor", "Read-only Auditor"]
] as const;

export function HiringAccessManager({ initialGrants }: { initialGrants: Grant[] }) {
  const [grants, setGrants] = useState(initialGrants);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function refresh() {
    const response = await fetch("/api/admin/hiring/access", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setGrants(payload.data.grants);
  }

  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/hiring/access", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form))
    });
    const payload = await response.json();
    if (!response.ok) setMessage({ tone: "error", text: payload.error?.message || "Access could not be granted. Refresh and try again." });
    else {
      setMessage({ tone: "success", text: `Smart Hiring access is ready for ${payload.data.name}.` });
      formElement.reset(); await refresh();
    }
    setBusy(false);
  }

  async function revoke(grantId: string, name: string) {
    const reason = window.prompt(`Reason for revoking ${name}'s Smart Hiring access:`)?.trim();
    if (!reason) return;
    setBusy(true); setMessage(null);
    const response = await fetch("/api/admin/hiring/access", {
      method: "DELETE", headers: { "content-type": "application/json" },
      body: JSON.stringify({ grantId, reason })
    });
    const payload = await response.json();
    setMessage(response.ok
      ? { tone: "success", text: `${name}'s Smart Hiring access was revoked immediately.` }
      : { tone: "error", text: payload.error?.message || "Access could not be revoked." });
    if (response.ok) await refresh();
    setBusy(false);
  }

  return <div className="grid gap-5">
    <div className="flex items-start gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-wxViolet700" />
      <div><p className="font-semibold text-wxIndigo900">Hiring-only authority</p><p className="mt-1 text-sm leading-6 text-wxIndigo500">A grant opens only the approved Smart Hiring tools. It does not create global Website Admin authority, and revocation is checked on every Hiring request.</p></div>
    </div>
    <form onSubmit={grant} className="grid gap-4 rounded-md border border-wxBorder p-4 lg:grid-cols-[1.4fr_1fr_1.4fr_auto] lg:items-end">
      <label className="text-sm font-semibold text-wxIndigo900">Existing login email<input name="email" type="email" required className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3" placeholder="person@writex.co.in" /></label>
      <label className="text-sm font-semibold text-wxIndigo900">Hiring role<select name="hiringRole" required className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3">{roles.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm font-semibold text-wxIndigo900">Reason<input name="reason" required minLength={5} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3" placeholder="Operational hiring responsibility" /></label>
      <button disabled={busy} className="wx-gradient-action inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-60"><UserPlus className="h-4 w-4" />Grant access</button>
    </form>
    {message?<p role="status" className={`rounded-md border px-4 py-3 text-sm ${message.tone==="success"?"border-wxGreen500/40 bg-wxGreen500/10 text-wxIndigo900":"border-red-300 bg-red-50 text-red-800"}`}>{message.text}</p>:null}
    <div className="overflow-x-auto rounded-md border border-wxBorder"><table className="min-w-full text-left text-sm"><thead className="bg-wxSurfaceSoft text-xs text-wxIndigo500"><tr><th className="px-4 py-3">Person</th><th className="px-4 py-3">Hiring role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-wxBorder">{grants.map((grant)=><tr key={grant.id}><td className="px-4 py-3"><p className="font-semibold text-wxIndigo900">{grant.name}</p><p className="text-xs text-wxIndigo500">{grant.email}</p></td><td className="px-4 py-3">{roles.find(([value])=>value===grant.hiringRole)?.[1]||grant.hiringRole}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" />{grant.status}</span></td><td className="px-4 py-3 text-right">{grant.status==="ACTIVE"?<button type="button" disabled={busy} onClick={()=>revoke(grant.id,grant.name)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 px-3 font-semibold text-red-700 hover:bg-red-50"><UserMinus className="h-4 w-4" />Revoke</button>:<span className="text-xs text-wxIndigo500">Revoked</span>}</td></tr>)}</tbody></table></div>
  </div>;
}
