"use client";

import { FormEvent, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Link2,
  ShieldCheck,
  Users
} from "lucide-react";
import type { ConnectedCandidateReviewRecord } from "@/lib/hiring/connected-candidate-admin";
import { hiringRoleLabel } from "@/lib/hiring/domain";

type Summary = {
  total: number;
  low: number;
  review: number;
  high: number;
  pending: number;
};

const controlLabels = {
  separateAssessors: "Separate assessors",
  separateReportingLines: "Separate reporting lines",
  restrictedCrossSystemAccess: "Restricted cross-system access",
  enhancedProbationMonitoring: "Enhanced probation monitoring",
  noDirectWorkAllocationAuthority: "No direct work-allocation authority",
  noSharedApprovalChain: "No shared approval chain",
  postJoiningAuditRequired: "Post-joining audit review"
} as const;

type ControlKey = keyof typeof controlLabels;

export function ConnectedCandidateReviewQueue({
  initialSummary,
  initialReviews
}: {
  initialSummary: Summary;
  initialReviews: ConnectedCandidateReviewRecord[];
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [reviews, setReviews] = useState(initialReviews);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function saveDecision(
    event: FormEvent<HTMLFormElement>,
    review: ConnectedCandidateReviewRecord
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const controls = Object.fromEntries(
      Object.keys(controlLabels).map((key) => [
        key,
        form.get(key) === "on"
      ])
    );
    setSavingId(review.id);
    setMessage("");
    const response = await fetch(
      `/api/admin/hiring/connected-candidates/${encodeURIComponent(review.id)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decision: form.get("decision"),
          reviewerNotes: form.get("reviewerNotes"),
          finalOfferApproved: form.get("finalOfferApproved") === "on",
          controls,
          controlNotes: form.get("controlNotes") || null
        })
      }
    );
    const payload = await response.json().catch(() => null);
    setSavingId(null);
    if (!response.ok || !payload?.data?.review) {
      setMessage(
        payload?.error?.message || "The review decision could not be saved."
      );
      return;
    }
    const updated = payload.data.review as ConnectedCandidateReviewRecord;
    setReviews((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    );
    setSummary((current) => ({
      ...current,
      pending: Math.max(
        0,
        current.pending - (review.reviewStatus === "pending_review" ? 1 : 0)
      )
    }));
    setMessage("Review decision and controls saved to the audit trail.");
  }

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm leading-6 text-wxIndigo500">
        Connection signals initiate a human review. They do not establish
        misconduct and never reject a candidate automatically.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total links" value={summary.total} icon={Link2} />
        <Metric label="Pending review" value={summary.pending} icon={Users} />
        <Metric label="High" value={summary.high} icon={AlertTriangle} />
        <Metric label="Review" value={summary.review} icon={ShieldCheck} />
        <Metric label="Low" value={summary.low} icon={CheckCircle2} />
      </div>

      {message ? (
        <p
          role="status"
          className="rounded-md border border-wxBorder bg-wxSurfaceSoft px-4 py-3 text-sm"
        >
          {message}
        </p>
      ) : null}

      {reviews.length === 0 ? (
        <section className="rounded-lg border border-wxBorder bg-wxSurface p-6">
          <h2 className="text-lg font-semibold">No connected candidates</h2>
          <p className="mt-2 text-sm text-wxIndigo500">
            No evidence-based candidate links currently require review.
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="overflow-hidden rounded-lg border border-wxBorder bg-wxSurface shadow-soft"
            >
              <header className="grid gap-4 border-b border-wxBorder p-5 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge level={review.riskLevel} />
                    <span className="text-xs font-semibold text-wxIndigo500">
                      Score {review.riskScore}/100
                    </span>
                    <span className="text-xs text-wxIndigo400">
                      {review.reviewStatus.replaceAll("_", " ")}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-wxIndigo900">
                    {review.candidateA.reference} and{" "}
                    {review.candidateB.reference}
                  </h2>
                  <p className="mt-1 text-sm text-wxIndigo500">
                    {review.candidateA.role} / {review.candidateB.role}
                  </p>
                </div>
                <p className="max-w-sm text-xs leading-5 text-wxIndigo500">
                  {review.requiresManagementApproval
                    ? "Super Admin approval is required before a final offer."
                    : review.requiresHumanReview
                      ? "Human review is required before final selection."
                      : "No review action is currently required."}
                </p>
              </header>

              <div className="grid gap-6 p-5 lg:grid-cols-2">
                <section>
                  <h3 className="text-sm font-semibold text-wxIndigo900">
                    Link evidence
                  </h3>
                  <ul className="mt-3 divide-y divide-wxBorder border-y border-wxBorder">
                    {review.signals.map((signal) => (
                      <li
                        key={signal.type}
                        className="flex items-center justify-between gap-3 py-3 text-sm"
                      >
                        <span>{formatSignal(signal.type)}</span>
                        <span className="text-xs text-wxIndigo500">
                          {signal.confidence} confidence / {signal.weight}
                          {signal.similarity !== null
                            ? ` / ${Math.round(signal.similarity * 100)}% similarity`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <h3 className="mt-6 text-sm font-semibold text-wxIndigo900">
                    Relationship disclosure
                  </h3>
                  <div className="mt-3 space-y-3">
                    {review.disclosures.map((disclosure) => (
                      <div
                        key={disclosure.candidateReference}
                        className="border-l-2 border-wxViolet500 pl-3 text-sm"
                      >
                        <p className="font-semibold">
                          {disclosure.candidateReference}:{" "}
                          {disclosure.disclosed ? "Disclosed" : "None declared"}
                        </p>
                        {disclosure.disclosed ? (
                          <p className="mt-1 text-wxIndigo500">
                            {disclosure.relatedPersonName} /{" "}
                            {disclosure.relationship} /{" "}
                            {disclosure.relatedRole
                              ? hiringRoleLabel(disclosure.relatedRole)
                              : "Role not provided"}
                            {disclosure.details
                              ? ` / ${disclosure.details}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>

                <form
                  className="space-y-4"
                  onSubmit={(event) => saveDecision(event, review)}
                >
                  <label className="block">
                    <span className="text-sm font-semibold">Decision</span>
                    <select
                      name="decision"
                      required
                      defaultValue={review.decision ?? ""}
                      className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"
                    >
                      <option value="" disabled>
                        Select decision
                      </option>
                      <option value="approved_no_additional_controls">
                        Approve without additional controls
                      </option>
                      <option value="approved_with_controls">
                        Approve with controls
                      </option>
                      <option value="declined_after_review">
                        Decline after human review
                      </option>
                      <option value="false_positive">
                        Mark as false positive
                      </option>
                    </select>
                  </label>

                  <fieldset>
                    <legend className="text-sm font-semibold">
                      Access-separation and monitoring controls
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {(
                        Object.keys(controlLabels) as ControlKey[]
                      ).map((key) => (
                        <label
                          key={key}
                          className="flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            name={key}
                            defaultChecked={review.controls[key]}
                          />
                          <span>{controlLabels[key]}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {review.requiresManagementApproval ? (
                    <label className="flex min-h-11 items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 text-sm text-orange-950">
                      <input
                        type="checkbox"
                        name="finalOfferApproved"
                        defaultChecked={Boolean(review.finalOfferApprovedAt)}
                      />
                      <span>Approve final offer as Super Admin</span>
                    </label>
                  ) : null}

                  <label className="block">
                    <span className="text-sm font-semibold">Reviewer notes</span>
                    <textarea
                      name="reviewerNotes"
                      required
                      minLength={10}
                      maxLength={2000}
                      rows={4}
                      defaultValue={review.reviewerNotes ?? ""}
                      className="mt-2 w-full rounded-md border border-wxBorder bg-wxSurface px-3 py-2"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold">Control notes</span>
                    <textarea
                      name="controlNotes"
                      maxLength={2000}
                      rows={3}
                      defaultValue={review.controls.notes ?? ""}
                      className="mt-2 w-full rounded-md border border-wxBorder bg-wxSurface px-3 py-2"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={savingId === review.id}
                    className="min-h-11 rounded-md bg-brand-spectrum px-5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {savingId === review.id
                      ? "Saving..."
                      : "Save reviewed decision"}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: number;
  icon: typeof Link2;
}) {
  return (
    <div className="rounded-lg border border-wxBorder bg-wxSurface p-4">
      <Icon className="h-4 w-4 text-wxViolet600" aria-hidden="true" />
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-wxIndigo500">{label}</p>
    </div>
  );
}

function RiskBadge({
  level
}: {
  level: ConnectedCandidateReviewRecord["riskLevel"];
}) {
  const classes = {
    low: "border-green-200 bg-green-50 text-green-800",
    review: "border-orange-200 bg-orange-50 text-orange-900",
    high: "border-red-200 bg-red-50 text-red-900"
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[level]}`}
    >
      {level === "review" ? "Review" : `${level[0].toUpperCase()}${level.slice(1)}`}
    </span>
  );
}

function formatSignal(value: string) {
  return value
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
