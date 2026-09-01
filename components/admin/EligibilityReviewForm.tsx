"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { HiringRole } from "@/lib/hiring/domain";
import { eligibilityChecksByRole } from "@/lib/hiring/eligibility";

export function EligibilityReviewForm({
  applicationReference,
  role
}: {
  applicationReference: string;
  role: HiringRole;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("busy");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const checks = Object.fromEntries(
      eligibilityChecksByRole[role].map((check) => [
        check.key,
        form.get(`check_${check.key}`) === "on"
      ])
    );
    try {
      const response = await fetch("/api/admin/hiring/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resource: "eligibility",
          applicationReference,
          checks,
          reviewerOutcome: form.get("reviewerOutcome"),
          notes: form.get("notes"),
          reason: form.get("reason")
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Eligibility review could not be saved.");
      setState("success");
      setMessage(
        `Review saved. Advisory score ${payload.data.automatedScore}%; reviewer outcome ${String(payload.data.reviewerOutcome).replace(/_/g, " ")}.`
      );
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Eligibility review could not be saved.");
    }
  }

  return (
    <form id="candidate-eligibility-action" onSubmit={submit} className="grid gap-4 rounded-lg border border-wxBorder bg-white p-5 shadow-soft">
      <div>
        <h2 className="text-lg font-bold text-wxIndigo900">Eligibility review</h2>
        <p className="mt-1 text-sm text-wxIndigo500">
          These checks create an advisory score only. The reviewer outcome is separate and no result automatically rejects a candidate.
        </p>
      </div>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Eligibility evidence checks</legend>
        {eligibilityChecksByRole[role].map((check) => (
          <label key={check.key} className="flex min-h-12 items-center gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft px-4 text-sm font-semibold">
            <input name={`check_${check.key}`} type="checkbox" className="h-4 w-4" />
            <span>{check.label}</span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold text-wxIndigo900">
          Human reviewer outcome
          <select name="reviewerOutcome" className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-white px-3 text-sm">
            <option value="review">Manual review required</option>
            <option value="eligible">Eligible to progress</option>
          </select>
        </label>
        <label className="text-sm font-bold text-wxIndigo900">
          Review reason
          <input name="reason" required minLength={3} maxLength={500} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder px-3 text-sm" />
        </label>
      </div>
      <label className="text-sm font-bold text-wxIndigo900">
        Reviewer notes
        <textarea name="notes" required minLength={3} maxLength={3000} rows={4} className="mt-2 w-full rounded-md border border-wxBorder px-3 py-2 text-sm" />
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-wxIndigo500">Every review is tied to the signed-in administrator and written to the hiring audit log.</p>
        <button disabled={state === "busy"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-spectrum px-5 font-bold text-white disabled:opacity-60">
          {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save eligibility review
        </button>
      </div>
      {message ? (
        <p role={state === "error" ? "alert" : "status"} className={`flex gap-2 rounded-md border p-3 text-sm ${state === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {state === "error" ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
          {message}
        </p>
      ) : null}
    </form>
  );
}
