"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileLock2,
  Filter,
  Mail,
  Search,
  ShieldAlert,
  Trash2
} from "lucide-react";
import type { AdminSuspiciousReport } from "@/lib/trust/admin-operations";
import {
  AdminStatus,
  humaniseAdminStatus
} from "@/components/admin/AdminPrimitives";

const statuses: AdminSuspiciousReport["status"][] = [
  "received",
  "under_review",
  "resolved",
  "dismissed"
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  }).format(new Date(value));
}

export function SuspiciousReportQueue({
  initialReports
}: {
  initialReports: AdminSuspiciousReport[];
}) {
  const [reports, setReports] = useState(initialReports);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [evidenceFilter, setEvidenceFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [reviewerFilter, setReviewerFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const categories = useMemo(
    () => Array.from(new Set(reports.map((report) => report.reportType))).sort(),
    [reports]
  );
  const visibleReports = useMemo(
    () =>
      reports.filter((report) => {
        const search = query.trim().toLowerCase();
        const searchMatch =
          !search ||
          [
            report.reference,
            report.reportType,
            report.maskedIdentifier,
            report.relatedReference,
            report.description
          ].some((value) => String(value || "").toLowerCase().includes(search));
        const statusMatch =
          statusFilter === "all" || report.status === statusFilter;
        const categoryMatch =
          categoryFilter === "all" || report.reportType === categoryFilter;
        const hasEvidence = Boolean(
          report.evidenceFileAssetId && !report.evidenceRevokedAt
        );
        const evidenceMatch =
          evidenceFilter === "all" ||
          (evidenceFilter === "with_evidence" && hasEvidence) ||
          (evidenceFilter === "without_evidence" && !hasEvidence);
        const priority = reportPriority(report);
        const priorityMatch =
          priorityFilter === "all" || priority === priorityFilter;
        const reviewerMatch =
          reviewerFilter === "all" || reviewerFilter === "unassigned";
        const createdAt = new Date(report.createdAt);
        const fromMatch =
          !fromDate || createdAt >= new Date(`${fromDate}T00:00:00.000Z`);
        const toMatch =
          !toDate || createdAt <= new Date(`${toDate}T23:59:59.999Z`);
        return (
          searchMatch &&
          statusMatch &&
          categoryMatch &&
          evidenceMatch &&
          priorityMatch &&
          reviewerMatch &&
          fromMatch &&
          toMatch
        );
      }),
    [
      categoryFilter,
      evidenceFilter,
      fromDate,
      priorityFilter,
      query,
      reports,
      reviewerFilter,
      statusFilter,
      toDate
    ]
  );

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setEvidenceFilter("all");
    setPriorityFilter("all");
    setReviewerFilter("all");
    setFromDate("");
    setToDate("");
  }

  async function updateStatus(
    report: AdminSuspiciousReport,
    status: AdminSuspiciousReport["status"]
  ) {
    setMessage("");
    const response = await fetch(
      `/api/admin/trust-centre/reports/${report.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.data?.report) {
      setMessage(
        payload?.error?.message || "The report status could not be updated."
      );
      return;
    }
    setReports((current) =>
      current.map((item) =>
        item.id === report.id ? payload.data.report : item
      )
    );
    setMessage(`Case ${report.reference} updated and recorded.`);
  }

  async function openEvidence(fileAssetId: string) {
    setMessage("");
    const response = await fetch(
      `/api/admin/files/${fileAssetId}/signed-url`,
      { cache: "no-store" }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.data?.url) {
      setMessage("The private evidence link could not be issued.");
      return;
    }
    window.open(payload.data.url, "_blank", "noopener,noreferrer");
  }

  async function revokeEvidence(report: AdminSuspiciousReport) {
    if (
      !window.confirm(
        `Revoke the private evidence for ${report.reference}?\n\nThe file will be permanently deleted. The case and audit history will remain, and this action cannot restore the file.`
      )
    ) {
      return;
    }
    setMessage("");
    const response = await fetch(
      `/api/admin/trust-centre/reports/${report.id}/evidence`,
      {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Removed by Super Admin review" })
      }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.data?.revoked) {
      setMessage(
        payload?.error?.message || "The private evidence could not be revoked."
      );
      return;
    }
    setReports((current) =>
      current.map((item) =>
        item.id === report.id
          ? {
              ...item,
              evidenceRevokedAt:
                payload.data.revokedAt || new Date().toISOString()
            }
          : item
      )
    );
    setMessage("Private evidence deleted. The case audit record was preserved.");
  }

  return (
    <section className="rounded-lg border border-wxBorder bg-wxSurface shadow-soft">
      <div className="border-b border-wxBorder px-5 py-5 md:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wxViolet700">
          Trust operations
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-wxIndigo900">
              Management review queue
            </h2>
            <p className="mt-1 text-sm leading-6 text-wxIndigo500">
              Identifiers and mobiles remain masked. Evidence links expire
              after five minutes.
            </p>
          </div>
          <span className="text-xs font-semibold text-wxIndigo500">
            {visibleReports.length} of {reports.length} cases
          </span>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative">
            <span className="sr-only">Search reports</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-wxIndigo400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search reference, category or masked identifier"
              className="h-11 w-full rounded-md border border-wxBorder bg-wxSurface pl-10 pr-3 text-sm outline-none focus:border-wxViolet700"
            />
          </label>
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={statuses}
          />
          <FilterSelect
            label="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categories}
          />
          <FilterSelect
            label="Evidence"
            value={evidenceFilter}
            onChange={setEvidenceFilter}
            options={["with_evidence", "without_evidence"]}
          />
          <FilterSelect
            label="Priority"
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={["high", "review", "standard"]}
          />
          <FilterSelect
            label="Reviewer"
            value={reviewerFilter}
            onChange={setReviewerFilter}
            options={["unassigned"]}
          />
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-xs font-semibold text-wxIndigo500">
            From
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs text-wxIndigo700"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-xs font-semibold text-wxIndigo500">
            To
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs text-wxIndigo700"
            />
          </label>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxIndigo700"
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="divide-y divide-wxBorder">
        {visibleReports.length ? (
          visibleReports.map((report) => (
            <article
              key={report.id}
              className="grid gap-4 px-5 py-5 md:px-6 lg:grid-cols-[1fr_14rem]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-wxIndigo900">
                    {report.reference}
                  </h3>
                  <span className="text-xs font-medium text-wxIndigo500">
                    {formatDate(report.createdAt)}
                  </span>
                  <AdminStatus status={report.status} />
                  <AdminStatus status={reportPriority(report)} />
                </div>
                <p className="mt-2 text-sm font-semibold text-wxIndigo700">
                  {humaniseAdminStatus(report.reportType)}
                </p>
                <p className="mt-1 text-xs text-wxIndigo500">
                  Identifier: {report.maskedIdentifier}
                  {report.relatedReference
                    ? ` / Reference: ${report.relatedReference}`
                    : ""}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-wxIndigo500">
                  {report.description}
                </p>
                <p className="mt-3 text-xs text-wxIndigo500">
                  Contact: {report.customerEmail}
                  {report.maskedCustomerMobile
                    ? ` / ${report.maskedCustomerMobile}`
                    : ""}
                  {` / Alert: ${humaniseAdminStatus(report.notificationStatus)}`}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-wxIndigo500">
                  Case status
                  <select
                    value={report.status}
                    onChange={(event) =>
                      updateStatus(
                        report,
                        event.target
                          .value as AdminSuspiciousReport["status"]
                      )
                    }
                    className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-semibold text-wxIndigo900"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {humaniseAdminStatus(status)}
                      </option>
                    ))}
                  </select>
                </label>
                {report.evidenceFileAssetId && !report.evidenceRevokedAt ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        openEvidence(report.evidenceFileAssetId as string)
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold text-wxIndigo700"
                    >
                      <FileLock2 className="h-4 w-4" aria-hidden />
                      Open evidence
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => revokeEvidence(report)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Revoke evidence
                    </button>
                  </>
                ) : report.evidenceRevokedAt ? (
                  <p className="rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 py-2 text-xs font-semibold text-wxIndigo500">
                    Evidence revoked. Case history preserved.
                  </p>
                ) : null}
                {report.status === "received" ? (
                  <button
                    type="button"
                    onClick={() => updateStatus(report, "under_review")}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-spectrum px-3 text-sm font-semibold text-white"
                  >
                    <ShieldAlert className="h-4 w-4" aria-hidden />
                    Review report
                  </button>
                ) : null}
                <a
                  href={`mailto:${encodeURIComponent(report.customerEmail)}?subject=${encodeURIComponent(`WriteX Trust Centre case ${report.reference}`)}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold text-wxIndigo700"
                >
                  <Mail className="h-4 w-4" aria-hidden />
                  Request information
                </a>
                <button
                  type="button"
                  onClick={() => updateStatus(report, "under_review")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 text-sm font-semibold text-orange-700"
                >
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                  Escalate review
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(report, "resolved")}
                  disabled={report.status === "resolved"}
                  title={
                    report.status === "resolved"
                      ? "This case is already resolved."
                      : "Close the case as resolved and retain its audit history."
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Close case
                </button>
                <button
                  type="button"
                  disabled
                  title="Reviewer assignment is unavailable until an audited case-owner field is added to the Trust Centre schema."
                  className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm font-semibold text-wxIndigo400"
                >
                  Assign reviewer
                </button>
                <Link
                  href="/admin/audit-logs"
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-wxBorder px-3 text-sm font-semibold text-wxViolet700"
                >
                  View audit
                </Link>
              </div>
            </article>
          ))
        ) : (
          <div className="px-5 py-10 text-center md:px-6">
            <p className="text-sm font-semibold text-wxIndigo900">
              No reports match this view
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-sm font-semibold text-wxViolet700"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
      <p
        aria-live="polite"
        className="px-5 pb-4 text-sm font-medium text-wxOrange500"
      >
        {message}
      </p>
    </section>
  );
}

function reportPriority(report: AdminSuspiciousReport) {
  if (
    [
      "Personal UPI or bank request",
      "Fake invoice",
      "Fake QR code",
      "Different payment details"
    ].includes(report.reportType)
  ) {
    return "high";
  }
  if (report.evidenceFileAssetId && !report.evidenceRevokedAt) {
    return "review";
  }
  return "standard";
}

function FilterSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <Filter className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-wxIndigo400" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-wxBorder bg-wxSurface pl-9 pr-8 text-sm font-medium text-wxIndigo700"
      >
        <option value="all">All {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {humaniseAdminStatus(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
