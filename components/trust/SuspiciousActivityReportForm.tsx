"use client";

import { useRef, useState, type FormEvent } from "react";
import { FileWarning, ShieldCheck } from "lucide-react";

const reportTypes = [
  "Unknown representative",
  "Different payment details",
  "Personal UPI or bank request",
  "Fake invoice",
  "Fake QR code",
  "Brand impersonation",
  "Suspicious WhatsApp or email",
  "Other"
];

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; referenceId: string }
  | { status: "error"; message: string };

export function SuspiciousActivityReportForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const submissionKeyRef = useRef<string>(crypto.randomUUID());
  const [state, setState] = useState<SubmissionState>({ status: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "submitting") return;
    setState({ status: "submitting" });

    try {
      const response = await fetch("/api/trust/report-suspicious-activity", {
        method: "POST",
        headers: { "Idempotency-Key": submissionKeyRef.current },
        body: new FormData(event.currentTarget),
        cache: "no-store"
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.received || !payload?.referenceId) {
        setState({
          status: "error",
          message:
            payload?.error?.message ||
            "The report could not be submitted securely. Please email business@writex.co.in."
        });
        return;
      }

      setState({ status: "success", referenceId: payload.referenceId });
      formRef.current?.reset();
      submissionKeyRef.current = crypto.randomUUID();
    } catch {
      setState({
        status: "error",
        message:
          "The report could not be submitted securely. Please email business@writex.co.in."
      });
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="rounded-md border border-sageBorder bg-white p-5 shadow-soft sm:p-7"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label
          htmlFor="trust-report-type"
          className="text-sm font-semibold text-wxIndigo900"
        >
          Report type
          <select
            id="trust-report-type"
            name="reportType"
            required
            defaultValue=""
            className="mt-2 min-h-12 w-full rounded-md border border-wxBorder bg-white px-4 text-base font-normal outline-none focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15"
          >
            <option value="" disabled>
              Select report type
            </option>
            {reportTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label
          htmlFor="trust-report-identifier"
          className="text-sm font-semibold text-wxIndigo900"
        >
          Mobile, email, or identifier involved
          <input
            id="trust-report-identifier"
            name="identifier"
            required
            maxLength={254}
            className="mt-2 min-h-12 w-full rounded-md border border-wxBorder bg-white px-4 text-base font-normal outline-none focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15"
          />
        </label>

        <label
          htmlFor="trust-report-reference"
          className="text-sm font-semibold text-wxIndigo900"
        >
          Invoice or enquiry reference (optional)
          <input
            id="trust-report-reference"
            name="relatedReference"
            maxLength={120}
            className="mt-2 min-h-12 w-full rounded-md border border-wxBorder bg-white px-4 text-base font-normal outline-none focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15"
          />
        </label>

        <label
          htmlFor="trust-report-evidence"
          className="text-sm font-semibold text-wxIndigo900"
        >
          Screenshot or file (optional)
          <input
            id="trust-report-evidence"
            name="evidence"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
            className="mt-2 min-h-12 w-full rounded-md border border-wxBorder bg-white px-3 py-2 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-wxSurfaceSoft file:px-3 file:py-2 file:font-semibold file:text-wxIndigo900"
          />
          <span className="mt-1 block text-xs font-normal leading-5 text-wxIndigo500">
            PDF, PNG, JPG, or WebP. Maximum 10 MB. Evidence stays private.
          </span>
        </label>

        <label
          htmlFor="trust-report-description"
          className="text-sm font-semibold text-wxIndigo900 md:col-span-2"
        >
          Description
          <textarea
            id="trust-report-description"
            name="description"
            required
            minLength={20}
            maxLength={5000}
            rows={6}
            className="mt-2 w-full rounded-md border border-wxBorder bg-white px-4 py-3 text-base font-normal outline-none focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15"
          />
        </label>

        <label
          htmlFor="trust-report-email"
          className="text-sm font-semibold text-wxIndigo900"
        >
          Your email
          <input
            id="trust-report-email"
            name="customerEmail"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className="mt-2 min-h-12 w-full rounded-md border border-wxBorder bg-white px-4 text-base font-normal outline-none focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15"
          />
        </label>

        <label
          htmlFor="trust-report-mobile"
          className="text-sm font-semibold text-wxIndigo900"
        >
          Your mobile (optional)
          <input
            id="trust-report-mobile"
            name="customerMobile"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            className="mt-2 min-h-12 w-full rounded-md border border-wxBorder bg-white px-4 text-base font-normal outline-none focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15"
          />
        </label>
      </div>

      <div className="sr-only" aria-hidden="true">
        <label htmlFor="trust-report-website">Website</label>
        <input
          id="trust-report-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        disabled={state.status === "submitting"}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-spectrum px-5 text-sm font-semibold text-white shadow-spectrum focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 disabled:cursor-wait disabled:opacity-65 sm:w-auto"
      >
        <FileWarning className="h-5 w-5" aria-hidden />
        {state.status === "submitting"
          ? "Submitting securely..."
          : "Submit Suspicious Activity Report"}
      </button>

      <div
        aria-live="polite"
        aria-busy={state.status === "submitting"}
        className="mt-5 min-h-6"
      >
        {state.status === "success" ? (
          <div className="rounded-md border border-wxGreen500/30 bg-wxGreen500/5 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck
                className="mt-0.5 h-6 w-6 shrink-0 text-wxGreen500"
                aria-hidden
              />
              <div>
                <p className="font-semibold text-wxIndigo900">
                  Report received.
                </p>
                <p className="mt-1 text-sm text-wxIndigo500">
                  Reference ID:{" "}
                  <strong className="text-wxIndigo900">
                    {state.referenceId}
                  </strong>
                </p>
              </div>
            </div>
          </div>
        ) : state.status === "error" ? (
          <p className="text-sm font-semibold text-wxOrange500">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
