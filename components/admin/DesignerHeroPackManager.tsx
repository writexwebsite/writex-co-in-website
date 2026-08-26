"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, ImagePlus, Loader2, ShieldCheck } from "lucide-react";
import { AdminStatusBadge } from "./AdminPrimitives";

type Pack = { id: string; festival_slug: string; variant_slug: string; display_name: string; target_support: string; source_width: number; source_height: number; status: string; created_at: string };
type Theme = { id: string; name: string; status: string };

export function DesignerHeroPackManager() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/website-experience/designer-hero-packs", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) throw new Error(payload?.error?.message || "Designer Hero Packs could not be loaded.");
    setPacks(payload.data.packs || []);
    setThemes(payload.data.festivalSnapshot?.themes || []);
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/website-experience/designer-hero-packs", { cache: "no-store", signal: controller.signal })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (!response.ok || !payload?.ok) throw new Error(payload?.error?.message || "Designer Hero Packs could not be loaded.");
        setPacks(payload.data.packs || []);
        setThemes(payload.data.festivalSnapshot?.themes || []);
      })
      .catch((issue) => { if (issue.name !== "AbortError") setError(issue.message); });
    return () => controller.abort();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    try {
      const form = new FormData(event.currentTarget);
      form.set("artworkOnlyConfirmed", String(form.get("artworkOnlyConfirmed") === "on"));
      const response = await fetch("/api/admin/website-experience/designer-hero-packs", { method: "POST", body: form });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error?.message || "The Hero Pack could not be created.");
      setMessage("Responsive Designer Hero Pack created as a private ready-for-review draft. Nothing was activated publicly.");
      event.currentTarget.reset(); await load();
    } catch (issue) { setError(issue instanceof Error ? issue.message : "The Hero Pack could not be created."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    {message ? <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{message}</div> : null}
    {error ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div> : null}
    <section className="rounded-lg border border-wxBorder bg-wxSurface p-6 shadow-soft">
      <div className="flex items-start gap-3"><ImagePlus className="mt-1 h-5 w-5 text-wxViolet700"/><div><h2 className="text-xl font-semibold text-wxIndigo900">Add New Event Pack</h2><p className="mt-1 text-sm leading-6 text-wxIndigo500">Upload one clean 8K background artwork. WriteX keeps the logo, tagline and one functional form separate.</p></div></div>
      <form onSubmit={submit} className="mt-6 grid gap-5 lg:grid-cols-2">
        <label className="text-sm font-semibold text-wxIndigo700">Existing Festival (optional)<select name="themeId" className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"><option value="">Create a new event</option>{themes.map((theme)=><option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label>
        <label className="text-sm font-semibold text-wxIndigo700">Festival Name<input required name="festivalName" maxLength={100} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"/></label>
        <label className="text-sm font-semibold text-wxIndigo700">Variant Name<input required name="variantName" maxLength={100} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"/></label>
        <label className="text-sm font-semibold text-wxIndigo700">Apply Target<select name="target" defaultValue="both" className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"><option value="client">Client Login</option><option value="employee">Employee Login</option><option value="both">Client + Employee</option></select></label>
        <label className="text-sm font-semibold text-wxIndigo700">Main 8K Hero Image<input required type="file" name="mainHero" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full rounded-md border border-wxBorder bg-wxSurface p-3"/></label>
        <label className="text-sm font-semibold text-wxIndigo700">Optional Mobile Hero<input type="file" name="mobileHero" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full rounded-md border border-wxBorder bg-wxSurface p-3"/></label>
        <label className="text-sm font-semibold text-wxIndigo700">Form Placement<select name="formPlacement" defaultValue="right" className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"><option value="right">Right</option><option value="left">Left</option></select></label>
        <label className="text-sm font-semibold text-wxIndigo700">Overlay Safety<select name="overlayMode" defaultValue="auto" className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"><option value="auto">Automatic</option><option value="light_safe">Light-safe</option><option value="dark_safe">Dark-safe</option></select></label>
        <label className="lg:col-span-2 text-sm font-semibold text-wxIndigo700">Notes<textarea name="notes" maxLength={1000} rows={3} className="mt-2 w-full rounded-md border border-wxBorder bg-wxSurface p-3"/></label>
        <label className="lg:col-span-2 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950"><input required type="checkbox" name="artworkOnlyConfirmed" className="mt-1"/>This image contains background/hero artwork only. It has no logo, tagline, form, fields, buttons, CTA or fake interface.</label>
        <div className="lg:col-span-2 flex items-center justify-between gap-4"><p className="flex items-center gap-2 text-xs text-wxIndigo500"><ShieldCheck className="h-4 w-4"/>Original remains immutable. Public activation stays off.</p><button disabled={busy} className="wx-gradient-action inline-flex min-h-12 items-center gap-2 rounded-md px-5 text-sm font-semibold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <ImagePlus className="h-4 w-4"/>}{busy ? "Creating responsive pack" : "Create Private Hero Pack"}</button></div>
      </form>
    </section>
    <section className="rounded-lg border border-wxBorder bg-wxSurface p-6 shadow-soft">
      <h2 className="text-xl font-semibold text-wxIndigo900">Simple workflow</h2>
      <ol className="mt-4 grid gap-3 text-sm text-wxIndigo700 sm:grid-cols-2 lg:grid-cols-3">
        {["1. Festival choose karo", "2. Variant ka naam do", "3. Client, Employee ya Both select karo", "4. Clean 8K artwork upload karo", "5. Private preview dekho", "6. Festival Studio se Apply ya Schedule karo"].map((step) => <li key={step} className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-3 font-semibold">{step}</li>)}
      </ol>
      <p className="mt-4 text-sm leading-6 text-wxIndigo500">Upload kabhi public activation nahi karta. Review aur exact preview ke baad hi existing Festival Studio se theme apply hota hai.</p>
      <Link href="/admin/website-experience/festival-studio?section=configure" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxViolet700"><ExternalLink className="h-4 w-4"/>Open Festival Studio</Link>
    </section>
    <section className="rounded-lg border border-wxBorder bg-wxSurface p-6 shadow-soft"><h2 className="text-xl font-semibold text-wxIndigo900">Future Designer Hero Packs</h2><div className="mt-5 grid gap-3 md:grid-cols-2">{packs.length ? packs.map((pack)=><article key={pack.id} className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"><div className="flex justify-between gap-3"><div><p className="font-semibold text-wxIndigo900">{pack.display_name}</p><p className="mt-1 text-xs text-wxIndigo500">{pack.festival_slug} / {pack.target_support} / {pack.source_width} x {pack.source_height}</p></div><AdminStatusBadge tone={pack.status === "approved" ? "success" : "warning"}>{pack.status}</AdminStatusBadge></div><p className="mt-3 flex items-center gap-2 text-xs text-wxIndigo500"><CheckCircle2 className="h-4 w-4 text-emerald-600"/>Private until reviewed, previewed and applied.</p></article>) : <p className="text-sm text-wxIndigo500">No future Designer Hero Pack has been uploaded.</p>}</div></section>
  </div>;
}
