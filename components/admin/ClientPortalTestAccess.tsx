"use client";

import {
  FlaskConical,
  LogIn,
  RefreshCw,
  ScrollText,
  ShieldX
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import {
  clientTestProfileOptions,
  type ClientTestAccessAuditEvent,
  type ClientTestAccessRecord,
  type ClientTestAccessSummary
} from "@/lib/client/test-access-types";

type GeneratedAccess = {
  record: ClientTestAccessRecord;
};

export function ClientPortalTestAccess({
  enabled,
  databaseReady,
  initialRecords,
  initialSummary
}: {
  enabled: boolean;
  databaseReady: boolean;
  initialRecords: ClientTestAccessRecord[];
  initialSummary: ClientTestAccessSummary;
}) {
  const [records, setRecords] =
    useState<ClientTestAccessRecord[]>(initialRecords);
  const [generated, setGenerated] = useState<GeneratedAccess | null>(null);
  const [summary, setSummary] = useState(initialSummary);
  const [auditByRecord, setAuditByRecord] = useState<
    Record<string, ClientTestAccessAuditEvent[]>
  >({});
  const [openAuditId, setOpenAuditId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  async function loadRecords() {
    if (!enabled || !databaseReady) return;
    setLoading(true);
    const response = await fetch("/api/admin/client-portal/test-access", {
      cache: "no-store"
    });
    const payload = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setMessage(
        payload?.error?.message ||
          "Temporary-access records could not be loaded."
      );
      return;
    }
    setRecords(payload?.data?.records || []);
    if (payload?.data?.summary) setSummary(payload.data.summary);
  }

  const creators = useMemo(
    () =>
      Array.from(
        new Map(
          records.map((record) => [
            record.createdByAdminId,
            record.createdByEmail || record.createdByAdminId
          ])
        )
      ),
    [records]
  );

  const visibleRecords = useMemo(
    () =>
      records.filter((record) => {
        if (statusFilter !== "all" && record.status !== statusFilter) {
          return false;
        }
        if (
          creatorFilter !== "all" &&
          record.createdByAdminId !== creatorFilter
        ) {
          return false;
        }
        if (
          dateFilter &&
          record.createdAt.slice(0, 10) !== dateFilter
        ) {
          return false;
        }
        return true;
      }),
    [creatorFilter, dateFilter, records, statusFilter]
  );

  if (!enabled) return null;

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setGenerated(null);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/client-portal/test-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        testProfileReference: String(data.get("testProfileReference") || ""),
        testInvoiceReference: String(data.get("testInvoiceReference") || ""),
        durationMinutes: Number(data.get("durationMinutes") || 15),
        singleUse: data.get("singleUse") === "on",
        reason: String(data.get("reason") || "")
      })
    });
    const payload = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok || !payload?.data?.record) {
      setMessage(
        payload?.error?.message || "Temporary access could not be generated."
      );
      return;
    }
    const next = payload.data as GeneratedAccess;
    setGenerated(next);
    setRecords((current) => [
      next.record,
      ...current.filter((record) => record.id !== next.record.id)
    ]);
    setMessage("Temporary access generated. Launch it from this admin panel only.");
    event.currentTarget.reset();
    await loadRecords();
  }

  async function launch(id: string) {
    setLoading(true);
    setMessage("");
    const response = await fetch(
      `/api/admin/client-portal/test-access/${encodeURIComponent(id)}/launch`,
      { method: "POST" }
    );
    const payload = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok || !payload?.data?.authenticated) {
      setMessage(
        payload?.error?.message || "Temporary test session could not be launched."
      );
      return;
    }
    setMessage("Test session launched in a new tab.");
    window.open(payload.data.defaultRoute || "/client/overview", "_blank", "noopener,noreferrer");
    await loadRecords();
  }

  async function revoke(id: string) {
    setLoading(true);
    setMessage("");
    const response = await fetch(
      `/api/admin/client-portal/test-access/${encodeURIComponent(id)}/revoke`,
      { method: "POST" }
    );
    setLoading(false);
    if (!response.ok) {
      setMessage("Temporary access could not be revoked.");
      return;
    }
    setRecords((current) =>
      current.map((record) =>
        record.id === id
          ? {
              ...record,
              revokedAt: new Date().toISOString(),
              status: "revoked"
            }
          : record
      )
    );
    if (generated?.record.id === id) setGenerated(null);
    setMessage("Temporary access and its active test sessions were revoked.");
    await loadRecords();
  }

  async function viewAudit(id: string) {
    if (openAuditId === id) {
      setOpenAuditId(null);
      return;
    }
    setLoading(true);
    setMessage("");
    const response = await fetch(
      `/api/admin/client-portal/test-access/${encodeURIComponent(id)}/audit`,
      { cache: "no-store" }
    );
    const payload = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setMessage(payload?.error?.message || "Audit history could not be loaded.");
      return;
    }
    setAuditByRecord((current) => ({
      ...current,
      [id]: payload?.data?.events || []
    }));
    setOpenAuditId(id);
  }

  return (
    <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-wxViolet700">
            Super Admin only
          </p>
          <h2 className="mt-2 text-lg font-semibold">Temporary Portal Testing</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-wxIndigo500">
      Creates short-lived internal access scoped to one sanitized test
            profile and invoice. No real LTS, PMT, customer, payment, or file
            data is used.
          </p>
        </div>
        <FlaskConical className="h-6 w-6 shrink-0 text-wxViolet700" aria-hidden />
      </div>

      {!databaseReady ? (
        <p className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
          Apply the reviewed temporary-access migration before generating
          access.
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatusCard label="Active Test Access" value={summary.active} />
        <StatusCard label="Used" value={summary.used} />
        <StatusCard label="Expired" value={summary.expired} />
        <StatusCard label="Revoked" value={summary.revoked} />
        <StatusCard label="Active Test Sessions" value={summary.activeSessions} />
      </div>

      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={generate}>
        <Field label="Test profile">
          <select
            name="testProfileReference"
            required
            className="min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm"
          >
            {clientTestProfileOptions.map((profile) => (
              <option key={profile.value} value={profile.value}>
                {profile.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Test invoice reference">
          <input
            name="testInvoiceReference"
            required
            defaultValue="WX-TEST-PORTAL-1001"
            pattern="WX-TEST-[A-Za-z0-9-]{4,64}"
            className="min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm uppercase"
          />
        </Field>
        <Field label="Access duration">
          <select
            name="durationMinutes"
            defaultValue="30"
            className="min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </Field>
        <label className="flex min-h-11 items-center gap-3 self-end rounded-md border border-wxBorder px-3 text-sm font-semibold">
          <input
            name="singleUse"
            type="checkbox"
            defaultChecked
            className="h-4 w-4"
          />
          Single-use credential
        </label>
        <Field label="Reason for access" className="sm:col-span-2">
          <textarea
            name="reason"
            required
            minLength={10}
            maxLength={500}
            className="min-h-24 w-full rounded-md border border-wxBorder bg-wxSurface p-3 text-sm"
            placeholder="State the approved test purpose."
          />
        </Field>
        <button
          type="submit"
          disabled={loading || !databaseReady}
          className="wx-gradient-action inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <FlaskConical className="h-4 w-4" aria-hidden />
          )}
          Generate Test Access
        </button>
      </form>

      {message ? (
        <p role="status" className="mt-4 text-sm font-semibold">
          {message}
        </p>
      ) : null}

      {generated ? (
        <div className="mt-5 rounded-lg border border-wxBorder bg-wxSurfaceSoft p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">
                Temporary access ready
              </h3>
              <p className="mt-1 text-xs leading-5 text-wxIndigo500">
                Launching creates a restricted test session with sanitized
                demonstration data only.
              </p>
            </div>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Item
              label="Expiry"
              value={new Date(generated.record.expiresAt).toLocaleString("en-IN")}
            />
            <Item
              label="Profile"
              value={generated.record.testProfileReference.replaceAll("_", " ")}
            />
            <Item
              label="Test invoice"
              value={generated.record.testInvoiceReference}
            />
            <Item
              label="Single-use"
              value={generated.record.singleUse ? "Yes" : "No"}
            />
          </dl>
          <button
            type="button"
            onClick={() => launch(generated.record.id)}
            disabled={loading || generated.record.status !== "active"}
            className="mt-5 mr-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-wxViolet700 px-4 text-sm font-semibold text-wxViolet700 disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Launch Test Portal
          </button>
          <button
            type="button"
            onClick={() => revoke(generated.record.id)}
            disabled={loading}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-4 text-sm font-semibold disabled:opacity-50"
          >
            <ShieldX className="h-4 w-4" aria-hidden />
            Revoke access
          </button>
        </div>
      ) : null}

      <div className="mt-7 border-t border-wxBorder pt-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-base font-semibold">Temporary access records</h3>
            <p className="mt-1 text-xs text-wxIndigo500">
              Test sessions can be launched only from this Super Admin panel.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[auto_repeat(3,minmax(0,1fr))]">
            <button
              type="button"
              onClick={loadRecords}
              disabled={loading}
              aria-label="Refresh temporary access records"
              className="inline-flex h-11 w-11 items-center justify-center self-end rounded-md border border-wxBorder text-wxIndigo500 hover:text-wxViolet700 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                aria-hidden
              />
            </button>
            <label className="text-xs font-semibold text-wxIndigo500">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="used">Used</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-wxIndigo500">
              Creator
              <select
                value={creatorFilter}
                onChange={(event) => setCreatorFilter(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900"
              >
                <option value="all">All</option>
                {creators.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-wxIndigo500">
              Created date
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {visibleRecords.length ? (
            visibleRecords.map((record) => (
              <article
                key={record.id}
                className="rounded-md border border-wxBorder p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{record.testId}</p>
                      <span className="rounded-full border border-wxBorder px-2 py-0.5 text-[11px] font-bold uppercase text-wxIndigo500">
                        {record.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-wxIndigo500">
                      {record.testInvoiceReference} ·{" "}
                      {record.testProfileReference.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-wxIndigo500">
                      Expires{" "}
                      {new Date(record.expiresAt).toLocaleString("en-IN")} ·{" "}
                      {record.singleUse ? "Single-use" : "Multi-use"} ·{" "}
                      {record.usedAt ? "Used" : "Unused"}
                    </p>
                    <p className="mt-1 text-xs text-wxIndigo500">
                      Created by{" "}
                      {record.createdByEmail || record.createdByAdminId}
                    </p>
                  </div>
                  {record.status === "active" ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => launch(record.id)}
                        disabled={loading}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-wxViolet700 px-3 text-sm font-semibold text-wxViolet700 disabled:opacity-50"
                      >
                        <LogIn className="h-4 w-4" aria-hidden />
                        Launch Test Portal
                      </button>
                      <button
                        type="button"
                        onClick={() => revoke(record.id)}
                        disabled={loading}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold disabled:opacity-50"
                      >
                        <ShieldX className="h-4 w-4" aria-hidden />
                        Revoke
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 border-t border-wxBorder pt-3">
                  <button
                    type="button"
                    onClick={() => viewAudit(record.id)}
                    disabled={loading}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-wxViolet700 disabled:opacity-50"
                  >
                    <ScrollText className="h-4 w-4" aria-hidden />
                    {openAuditId === record.id ? "Hide Audit" : "View Audit"}
                  </button>
                  {openAuditId === record.id ? (
                    <AuditTimeline events={auditByRecord[record.id] || []} />
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 text-sm text-wxIndigo500">
              No temporary-access records match these filters.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function StatusCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-3">
      <p className="text-xs font-semibold text-wxIndigo500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function AuditTimeline({ events }: { events: ClientTestAccessAuditEvent[] }) {
  if (!events.length) {
    return <p className="mt-2 text-xs text-wxIndigo500">No audit events recorded.</p>;
  }
  return (
    <ol className="mt-2 grid gap-2" aria-label="Temporary access audit history">
      {events.map((event) => (
        <li key={event.id} className="rounded-md bg-wxSurfaceSoft px-3 py-2 text-xs">
          <span className="font-semibold">
            {event.eventType.replaceAll("_", " ")} - {event.result}
          </span>
          <span className="ml-2 text-wxIndigo500">
            {new Date(event.createdAt).toLocaleString("en-IN")}
            {event.userAgentCategory ? ` | ${event.userAgentCategory}` : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs font-semibold text-wxIndigo500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
