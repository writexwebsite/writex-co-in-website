"use client";

import type { ReactNode } from "react";
import {
  BadgeCheck,
  CreditCard,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import type { ClientPortalTrustSummary } from "@/lib/trust/client-portal-summary";

function formatVerifiedAt(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusText(value?: string) {
  return value ? value.replace(/_/g, " ") : "Not available";
}

export function ClientTrustPanel({
  trust
}: {
  trust: ClientPortalTrustSummary;
}) {
  return (
    <section
      aria-labelledby="client-trust-heading"
      className="rounded-2xl border border-wxBorder bg-wxSurface p-6 shadow-soft sm:p-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-wxViolet700">
            <ShieldCheck className="h-5 w-5" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-[0.14em]">
              Trust &amp; verification
            </p>
          </div>
          <h2 id="client-trust-heading" className="mt-2 text-xl font-semibold">
            Billing &amp; order assurance
          </h2>
          <p className="mt-2 text-sm leading-6 text-wxIndigo500">
            Compact verification for the invoice and payment records linked to
            this signed-in workspace.
          </p>
        </div>
        <a
          href="/trust-centre"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-wxBorder px-4 text-sm font-semibold text-wxViolet700 transition-colors hover:bg-wxSurfaceSoft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
        >
          Open Trust Centre
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <TrustItem
          icon={<BadgeCheck className="h-5 w-5" aria-hidden />}
          title="Invoice"
          state={trust.invoice.state}
          label={trust.invoice.label}
        />
        <TrustItem
          icon={<UserCheck className="h-5 w-5" aria-hidden />}
          title="Assigned representative"
          state={trust.representative.state}
          label={trust.representative.label}
          detail={
            trust.representative.state === "verified"
              ? [
                  trust.representative.name,
                  trust.representative.designation,
                  trust.representative.department
                ]
                  .filter(Boolean)
                  .join(" | ")
              : undefined
          }
        />
        <TrustItem
          icon={<CreditCard className="h-5 w-5" aria-hidden />}
          title="Payment"
          state={trust.payment.state}
          label={trust.payment.label}
          detail={`Current status: ${statusText(trust.payment.status)}`}
        />
      </div>

      <div className="mt-5 grid gap-4 rounded-lg border border-wxBorder bg-wxSurfaceSoft p-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <p className="font-semibold text-wxIndigo900">
            {trust.safePaymentNotice}
          </p>
          <p className="mt-2 text-xs leading-5 text-wxIndigo500">
            Verification ID:{" "}
            <span className="font-semibold text-wxIndigo900">
              {trust.verificationId || "Not available"}
            </span>
            <span aria-hidden> | </span>
            Last verified:{" "}
            <span className="font-semibold text-wxIndigo900">
              {formatVerifiedAt(trust.lastVerifiedAt)}
            </span>
          </p>
        </div>
        <a
          href="/trust-centre/report"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-wxViolet700 underline decoration-wxBorder underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
        >
          <ShieldAlert className="h-4 w-4" aria-hidden />
          Report Suspicious Activity
        </a>
      </div>
    </section>
  );
}

function TrustItem({
  icon,
  title,
  state,
  label,
  detail
}: {
  icon: ReactNode;
  title: string;
  state: "verified" | "unavailable";
  label: string;
  detail?: string;
}) {
  const verified = state === "verified";

  return (
    <article className="min-h-32 rounded-lg border border-wxBorder bg-wxSurfaceSoft p-4">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          verified
            ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
            : "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
        }`}
      >
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-wxIndigo900">{title}</h3>
      <p
        className={`mt-1 text-sm font-semibold ${
          verified ? "text-green-700 dark:text-green-300" : "text-wxIndigo500"
        }`}
      >
        {label}
      </p>
      {detail ? (
        <p className="mt-1 text-xs capitalize leading-5 text-wxIndigo500">
          {detail}
        </p>
      ) : null}
    </article>
  );
}
