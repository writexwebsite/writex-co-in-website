"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

type StatusResult = { applicationReference: string; status: string; receivedAt: string; updatedAt: string };

export function CandidateStatusLookup() {
  const [result, setResult] = useState<StatusResult | null>(null);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(""); setResult(null);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/hiring/application-status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ applicationReference: data.get("applicationReference"), contact: data.get("contact") }) });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload?.error?.message || "Status is unavailable."); return; }
    setResult(payload.data);
  }
  return (
    <div className="grid gap-4">
      <form
        onSubmit={submit}
        className="rounded-md border border-wxBorder bg-white p-5 shadow-sm"
      >
        <label className="text-sm font-semibold text-wxIndigo900">
          Application ID
          <input
            required
            name="applicationReference"
            className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900 outline-none focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/20"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold text-wxIndigo900">
          Registered email or mobile
          <input
            required
            name="contact"
            className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900 outline-none focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/20"
          />
        </label>
        <button className="wx-gradient-action mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 sm:text-base">
          <Search className="h-4 w-4" aria-hidden />
          Check Status
        </button>
      </form>
      {message ? (
        <p
          role="alert"
          className="rounded-md border border-wxBorder bg-white p-4 text-sm leading-6 text-wxIndigo700"
        >
          {message}
        </p>
      ) : null}
      {result ? (
        <section
          aria-live="polite"
          className="rounded-md border border-wxBorder bg-white p-5 shadow-sm"
        >
          <p className="text-sm font-semibold text-wxViolet700">
            {result.applicationReference}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-wxIndigo900">
            {result.status}
          </h2>
          <p className="mt-2 text-sm leading-6 text-wxIndigo500">
            Updated {new Date(result.updatedAt).toLocaleString("en-IN")}
          </p>
        </section>
      ) : null}
    </div>
  );
}
