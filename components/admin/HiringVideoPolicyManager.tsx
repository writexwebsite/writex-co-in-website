"use client";

import { useState, type FormEvent } from "react";
import { Save, Video } from "lucide-react";
import type { SalesVideoPolicy } from "@/lib/hiring/video-policy";

export function HiringVideoPolicyManager({
  initialPolicy
}: {
  initialPolicy: SalesVideoPolicy;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError(false);
    const form = new FormData(event.currentTarget);
    const policy = {
      enabled: true,
      targetMinSeconds: Number(form.get("targetMinSeconds")),
      targetMaxSeconds: Number(form.get("targetMaxSeconds")),
      absoluteMaxSeconds: Number(form.get("absoluteMaxSeconds")),
      maxBytes: Number(form.get("maxMegabytes")) * 1024 * 1024,
      retentionDays: Number(form.get("retentionDays")),
      prompt: String(form.get("prompt") || "")
    };
    const response = await fetch("/api/admin/hiring/video-policy", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ policy, reason: form.get("reason") })
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    setError(!response.ok);
    setMessage(
      response.ok
        ? "Sales video policy saved and audited. New applications use it immediately."
        : payload?.error?.message || "The Sales video policy could not be saved."
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-md border border-wxBorder bg-wxSurface p-5">
      <div className="flex gap-3">
        <Video className="h-5 w-5 shrink-0 text-wxViolet700" />
        <div>
          <h2 className="font-bold text-wxIndigo900">Sales video introduction</h2>
          <p className="mt-1 text-sm leading-6 text-wxIndigo500">
            Configure candidate guidance and practical upload limits. Videos remain private and human-reviewed.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <NumberField name="targetMinSeconds" label="Minimum seconds" value={initialPolicy.targetMinSeconds} min={30} max={120} />
        <NumberField name="targetMaxSeconds" label="Maximum seconds" value={initialPolicy.targetMaxSeconds} min={60} max={180} />
        <NumberField name="absoluteMaxSeconds" label="Hard limit seconds" value={initialPolicy.absoluteMaxSeconds} min={60} max={300} />
        <NumberField name="maxMegabytes" label="Maximum MB" value={Math.round(initialPolicy.maxBytes / 1024 / 1024)} min={5} max={100} />
        <NumberField name="retentionDays" label="Retention days" value={initialPolicy.retentionDays} min={30} max={730} />
      </div>
      <label className="text-sm font-bold text-wxIndigo800">
        Candidate prompt
        <textarea name="prompt" required minLength={40} maxLength={1000} rows={5} defaultValue={initialPolicy.prompt} className="mt-2 w-full rounded-md border border-wxBorder bg-wxSurface px-3 py-2" />
      </label>
      <label className="text-sm font-bold text-wxIndigo800">
        Required audit reason
        <textarea name="reason" required minLength={5} maxLength={500} rows={2} className="mt-2 w-full rounded-md border border-wxBorder bg-wxSurface px-3 py-2" />
      </label>
      <button disabled={busy} className="wx-gradient-action inline-flex min-h-11 w-fit items-center gap-2 rounded-md px-5 font-bold text-white disabled:opacity-60">
        <Save className="h-4 w-4" />{busy ? "Saving..." : "Save video policy"}
      </button>
      {message ? <p role={error ? "alert" : "status"} className={error ? "text-sm text-red-700" : "text-sm text-emerald-700"}>{message}</p> : null}
    </form>
  );
}

function NumberField({
  name,
  label,
  value,
  min,
  max
}: {
  name: string;
  label: string;
  value: number;
  min: number;
  max: number;
}) {
  return (
    <label className="text-sm font-bold text-wxIndigo800">
      {label}
      <input name={name} type="number" min={min} max={max} defaultValue={value} required className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3" />
    </label>
  );
}
