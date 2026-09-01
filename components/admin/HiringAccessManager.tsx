"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck, UserMinus, UserPlus, X } from "lucide-react";

type Grant = {
  id: string; adminUserId: string; name: string; email: string; hiringRole: string;
  status: string; grantedAt: string; revokedAt: string | null;
  mustChangePassword: boolean; passwordChangedAt: string | null;
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
  const [passwordTarget, setPasswordTarget] = useState<Grant | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Grant | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

  async function revoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!revokeTarget) return;
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") || "").trim();
    setBusy(true); setMessage(null);
    const response = await fetch("/api/admin/hiring/access", {
      method: "DELETE", headers: { "content-type": "application/json" },
      body: JSON.stringify({ grantId: revokeTarget.id, reason })
    });
    const payload = await response.json();
    setMessage(response.ok
      ? { tone: "success", text: `${revokeTarget.name}'s Smart Hiring access was revoked immediately.` }
      : { tone: "error", text: payload.error?.message || "Access could not be revoked." });
    if (response.ok) { setRevokeTarget(null); await refresh(); }
    setBusy(false);
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordTarget) return;
    setBusy(true); setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/hiring/access", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        adminUserId: passwordTarget.adminUserId,
        newPassword: form.get("newPassword"),
        confirmPassword: form.get("confirmPassword"),
        reason: form.get("reason")
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage({ tone: "error", text: payload.error?.message || "The secondary-user password could not be reset." });
    } else {
      setMessage({ tone: "success", text: `${passwordTarget.name}'s temporary password is ready. Their previous password and Hiring sessions are invalid; they must choose a private password at sign-in.` });
      setPasswordTarget(null); setShowPassword(false); await refresh();
    }
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
    <div className="overflow-x-auto rounded-md border border-wxBorder"><table className="min-w-full text-left text-sm"><thead className="bg-wxSurfaceSoft text-xs text-wxIndigo500"><tr><th className="px-4 py-3">Person</th><th className="px-4 py-3">Hiring role</th><th className="px-4 py-3">Credential</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-wxBorder">{grants.map((grant)=><tr key={grant.id}><td className="px-4 py-3"><p className="font-semibold text-wxIndigo900">{grant.name}</p><p className="text-xs text-wxIndigo500">{grant.email}</p></td><td className="px-4 py-3">{roles.find(([value])=>value===grant.hiringRole)?.[1]||grant.hiringRole}</td><td className="px-4 py-3 text-xs text-wxIndigo500">{grant.mustChangePassword?"Change required at sign-in":"Active"}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" />{grant.status}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-2">{grant.status==="ACTIVE"?<><button type="button" disabled={busy} onClick={()=>setPasswordTarget(grant)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder px-3 font-semibold text-wxViolet700 hover:border-wxViolet700"><KeyRound className="h-4 w-4" />Set / Reset password</button><button type="button" disabled={busy} onClick={()=>setRevokeTarget(grant)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 px-3 font-semibold text-red-700 hover:bg-red-50"><UserMinus className="h-4 w-4" />Revoke</button></>:<span className="text-xs text-wxIndigo500">Revoked</span>}</div></td></tr>)}</tbody></table></div>
    {passwordTarget?<div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#090d25]/55 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="hiring-password-title"><form onSubmit={resetPassword} className="w-full max-w-lg rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-lift sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wxViolet700">Secondary Hiring user</p><h3 id="hiring-password-title" className="mt-1 text-xl font-semibold text-wxIndigo900">Set / Change / Reset password</h3><p className="mt-2 text-sm leading-6 text-wxIndigo500">{passwordTarget.name} · {passwordTarget.email}</p></div><button type="button" onClick={()=>{setPasswordTarget(null);setShowPassword(false);}} className="inline-flex h-11 w-11 items-center justify-center rounded-md text-wxIndigo500 hover:bg-wxSurfaceSoft" aria-label="Close password reset"><X className="h-5 w-5" /></button></div><p className="mt-4 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 py-3 text-sm leading-6 text-wxIndigo600">Set a temporary password and share it through an approved secure channel. The user must replace it at sign-in. The current password cannot be viewed.</p><label className="mt-4 block text-sm font-semibold text-wxIndigo900">Temporary password<div className="relative mt-2"><input name="newPassword" type={showPassword?"text":"password"} autoComplete="new-password" required minLength={14} maxLength={128} className="min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 pr-12" /><button type="button" onClick={()=>setShowPassword((current)=>!current)} className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center text-wxIndigo500" aria-label={showPassword?"Hide temporary password":"Show temporary password"}>{showPassword?<EyeOff className="h-4 w-4" />:<Eye className="h-4 w-4" />}</button></div></label><p className="mt-1 text-xs text-wxIndigo500">At least 14 characters with upper and lowercase letters, a number and a symbol.</p><label className="mt-4 block text-sm font-semibold text-wxIndigo900">Confirm temporary password<input name="confirmPassword" type={showPassword?"text":"password"} autoComplete="new-password" required minLength={14} maxLength={128} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3" /></label><label className="mt-4 block text-sm font-semibold text-wxIndigo900">Reason<input name="reason" required minLength={5} maxLength={500} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3" placeholder="Initial credential or authorised reset" /></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>{setPasswordTarget(null);setShowPassword(false);}} className="min-h-11 rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxIndigo700">Cancel</button><button disabled={busy} className="wx-gradient-action min-h-11 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-60">{busy?"Securing password...":"Set temporary password"}</button></div></form></div>:null}
    {revokeTarget?<div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#090d25]/55 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="hiring-revoke-title"><form onSubmit={revoke} className="w-full max-w-lg rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-lift sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-700">Hiring access control</p><h3 id="hiring-revoke-title" className="mt-1 text-xl font-semibold text-wxIndigo900">Revoke Hiring access</h3><p className="mt-2 text-sm leading-6 text-wxIndigo500">{revokeTarget.name} · {revokeTarget.email}</p></div><button type="button" onClick={()=>setRevokeTarget(null)} className="inline-flex h-11 w-11 items-center justify-center rounded-md text-wxIndigo500 hover:bg-wxSurfaceSoft" aria-label="Close access revocation"><X className="h-5 w-5" /></button></div><p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm leading-6 text-red-800">This immediately removes the secondary user from Smart Hiring. Their underlying Website Admin identity and historical audit records remain unchanged.</p><label className="mt-4 block text-sm font-semibold text-wxIndigo900">Reason<input name="reason" required minLength={5} maxLength={500} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3" placeholder="Why Hiring access is being removed" /></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>setRevokeTarget(null)} className="min-h-11 rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxIndigo700">Cancel</button><button disabled={busy} className="min-h-11 rounded-md bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{busy?"Revoking access...":"Revoke Hiring access"}</button></div></form></div>:null}
  </div>;
}
