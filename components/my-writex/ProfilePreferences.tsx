"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, LockKeyhole, PencilLine, Save } from "lucide-react";
import type { MyWritexCustomer } from "@/lib/my-writex/types";
import { ProductPageHeader } from "@/components/my-writex/ProductUI";

type EditableProfile = MyWritexCustomer["profile"] & { preferredName: string };

export function ProfilePreferences({
  identity,
  initialProfile,
}: {
  identity: {
    writeXId: string;
    preferredName: string;
    relationshipSince: number;
    clientStatus: string;
  };
  initialProfile: MyWritexCustomer["profile"];
}) {
  const storageKey = `my-writex:stage2:profile:${identity.writeXId}`;
  const initial: EditableProfile = { preferredName: identity.preferredName, ...initialProfile };
  const [profile, setProfile] = useState(initial);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let storedProfile: EditableProfile | null = null;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) storedProfile = JSON.parse(stored) as EditableProfile;
    } catch {
      // The verified fixture remains the fallback when local storage is unavailable.
    }
    if (!storedProfile) return;
    const timer = window.setTimeout(() => setProfile(storedProfile), 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(profile));
    } catch {
      // The UI still confirms the in-memory edit for this browser session.
    }
    setSaved(true);
  }

  return (
    <div className="mw-page-stack max-w-[820px]">
      <ProductPageHeader
        eyebrow="Account memory"
        title="Profile & preferences"
        copy="Keep the customer-facing context that helps future requirements begin with less repetition."
      />

      <section className="mw-card mw-card-mobile-pad p-6">
        <div className="flex items-center gap-3 text-[var(--mw-primary)]">
          <LockKeyhole className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          <p className="mw-eyebrow">Verified WriteX identity</p>
        </div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-3">
          <div><dt className="mw-meta">WriteX ID</dt><dd className="mt-1 text-sm font-medium">@{identity.writeXId}</dd></div>
          <div><dt className="mw-meta">Relationship since</dt><dd className="mt-1 text-sm font-medium">{identity.relationshipSince}</dd></div>
          <div><dt className="mw-meta">Client status</dt><dd className="mt-1 text-sm font-medium">{identity.clientStatus}</dd></div>
        </dl>
        <p className="mw-meta mt-5 border-t border-[var(--mw-line)] pt-4">These verified identity fields are read-only. Internal customer identifiers are never shown here.</p>
      </section>

      <form onSubmit={submit} className="mw-card mw-card-mobile-pad p-6">
        <div className="flex items-center gap-3">
          <PencilLine className="h-5 w-5 text-[var(--mw-primary)]" strokeWidth={1.75} aria-hidden />
          <div><h2 className="mw-section-title">Editable preferences</h2><p className="mw-meta mt-1">Saved only in this browser for Stage 2.</p></div>
        </div>

        {saved ? (
          <div role="status" className="mt-6 flex items-center gap-3 rounded-[12px] border border-[#b8e2d0] bg-[#eaf6f0] p-4 text-sm font-medium text-[#116747]"><CheckCircle2 className="h-5 w-5" strokeWidth={1.75} aria-hidden />Your local preferences were saved.</div>
        ) : null}

        <div className="mt-6 grid gap-[18px] md:grid-cols-2">
          <ProfileField label="Preferred name" value={profile.preferredName} onChange={(value) => { setProfile({ ...profile, preferredName: value }); setSaved(false); }} />
          <ProfileField label="Country" value={profile.country} onChange={(value) => { setProfile({ ...profile, country: value }); setSaved(false); }} />
          <ProfileField label="University / institution" value={profile.institution} onChange={(value) => { setProfile({ ...profile, institution: value }); setSaved(false); }} />
          <ProfileField label="Course / programme" value={profile.programme} onChange={(value) => { setProfile({ ...profile, programme: value }); setSaved(false); }} />
          <ProfileField label="Referencing preference" value={profile.referencingPreference} onChange={(value) => { setProfile({ ...profile, referencingPreference: value }); setSaved(false); }} />
          <ProfileField label="Preferred contact time" value={profile.preferredContactTime} onChange={(value) => { setProfile({ ...profile, preferredContactTime: value }); setSaved(false); }} />
          <label className="block md:col-span-2">
            <span className="text-sm font-medium">Service interests</span>
            <input value={profile.serviceInterests.join(", ")} onChange={(event) => { setProfile({ ...profile, serviceInterests: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }); setSaved(false); }} className="mw-control mt-[7px] w-full" aria-describedby="service-interests-help" />
            <span id="service-interests-help" className="mw-meta mt-2 block">Separate interests with commas.</span>
          </label>
        </div>
        <button type="submit" className="mw-button-primary mt-6"><Save className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />Save Local Preferences</button>
        <p className="mw-meta mt-4">No LTS record, Customer Master, or production profile is read or written by this interface.</p>
      </form>
    </div>
  );
}

function ProfileField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mw-control mt-[7px] w-full" />
    </label>
  );
}
