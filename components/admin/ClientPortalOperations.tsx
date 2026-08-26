"use client";

import { FormEvent, useState } from "react";
import {
  Ban,
  CheckCircle2,
  RefreshCw,
  Search,
  ShieldCheck
} from "lucide-react";
import type { ClientPortalOperationsSummary } from "@/lib/client/admin-operations";
import { clientPublicStages } from "@/lib/client/status-overrides";
import { ClientPortalTestAccess } from "@/components/admin/ClientPortalTestAccess";
import type {
  ClientTestAccessRecord,
  ClientTestAccessSummary
} from "@/lib/client/test-access-types";

type SearchResult = {
  invoiceReference: string;
  access: {
    access_status: string;
    disabled_reason: string | null;
  };
  sessions: Array<{
    id: string;
    created_at: string;
    last_seen_at: string | null;
    expires_at: string;
    revoked_at: string | null;
  }>;
  billingSnapshot: {
    service_type: string | null;
    currency: string | null;
    payment_status: string | null;
    synced_at: string | null;
  } | null;
  statusOverride: {
    mode: string;
    public_stage: string | null;
    expires_at: string | null;
  } | null;
  audit: Array<{
    action: string;
    result: string;
    created_at: string;
  }>;
};

export function ClientPortalOperations({
  summary,
  testAccessEnabled,
  initialTestAccessRecords,
  initialTestAccessSummary,
  initialSearch = ""
}: {
  summary: ClientPortalOperationsSummary;
  testAccessEnabled: boolean;
  initialTestAccessRecords: ClientTestAccessRecord[];
  initialTestAccessSummary: ClientTestAccessSummary;
  initialSearch?: string;
}) {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const invoiceReference = String(data.get("invoiceReference") || "").trim();
    setLoading(true);
    setMessage("");
    const response = await fetch(
      `/api/admin/client-portal/operations?invoiceReference=${encodeURIComponent(invoiceReference)}`,
      { cache: "no-store" }
    );
    const payload = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok || !payload?.data?.record) {
      setResult(null);
      setMessage(
        payload?.error?.message || "No client portal record was found."
      );
      return;
    }
    setResult(payload.data.record);
  }

  async function updateAccess(enabled: boolean) {
    if (!result) return;
    setLoading(true);
    const response = await fetch("/api/admin/client-portal/access", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        invoiceReference: result.invoiceReference,
        enabled,
        reason: enabled
          ? "Access restored by Super Admin."
          : "Access disabled by Super Admin."
      })
    });
    setLoading(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setMessage(payload?.error?.message || "Access could not be updated.");
      return;
    }
    setResult({
      ...result,
      access: {
        access_status: enabled ? "enabled" : "disabled",
        disabled_reason: enabled ? null : "Access disabled by Super Admin."
      }
    });
    setMessage(enabled ? "Client access enabled." : "Client access disabled and active sessions revoked.");
  }

  async function revokeSession(sessionId: string) {
    setLoading(true);
    const response = await fetch(
      `/api/admin/client-portal/sessions/${encodeURIComponent(sessionId)}/revoke`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: "Session revoked from Client Portal Operations."
        })
      }
    );
    setLoading(false);
    if (!response.ok || !result) {
      setMessage("The session could not be revoked.");
      return;
    }
    setResult({
      ...result,
      sessions: result.sessions.map((session) =>
        session.id === sessionId
          ? { ...session, revoked_at: new Date().toISOString() }
          : session
      )
    });
    setMessage("Session revoked.");
  }

  async function saveViewControl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result) return;
    const data = new FormData(event.currentTarget);
    const mode = String(data.get("mode") || "automatic");
    const response = await fetch(
      `/api/admin/client-portal/status-overrides/${encodeURIComponent(result.invoiceReference)}`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          publicStage: String(data.get("publicStage") || "") || null,
          approvedPublicMessage:
            String(data.get("approvedPublicMessage") || "") || null,
          overrideReason: String(data.get("overrideReason") || "") || null,
          expiresAt: String(data.get("expiresAt") || "") || null
        })
      }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(payload?.error?.message || "Client View Control was not saved.");
      return;
    }
    setMessage(
      mode === "automatic"
        ? "Client view returned to Automatic."
        : "Client View Control saved and audited."
    );
    setResult({
      ...result,
      statusOverride:
        mode === "automatic"
          ? null
          : {
              mode,
              public_stage: String(data.get("publicStage") || "") || null,
              expires_at: String(data.get("expiresAt") || "") || null
            }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active sessions" value={summary.activeSessions} />
        <Metric label="Failed logins (24h)" value={summary.failedLogins24h} />
        <Metric label="Rate-limit events (24h)" value={summary.rateLimitEvents24h} />
        <Metric label="Disabled clients" value={summary.disabledClients} />
      </div>

      <ClientPortalTestAccess
        enabled={testAccessEnabled}
        databaseReady={
          summary.databaseReady && summary.testAccessDatabaseReady
        }
        initialRecords={initialTestAccessRecords}
        initialSummary={initialTestAccessSummary}
      />

      {!summary.databaseReady ? (
        <p className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          Client Portal Operations is prepared but its reviewed migration has
          not been applied in this environment.
        </p>
      ) : null}

      <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Client access lookup</h2>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={search}>
          <label className="flex-1">
            <span className="text-xs font-semibold text-wxIndigo500">
              Invoice number
            </span>
            <input
              name="invoiceReference"
              defaultValue={initialSearch}
              required
              className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"
              placeholder="Enter invoice number"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !summary.databaseReady}
            className="wx-gradient-action inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-md px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </form>
        {message ? <p role="status" className="mt-4 text-sm font-semibold">{message}</p> : null}
      </section>

      {result ? (
        <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-wxIndigo500">
                Invoice
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                {result.invoiceReference}
              </h2>
              <p className="mt-2 flex items-center gap-2 text-sm">
                {result.access.access_status === "enabled" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Ban className="h-4 w-4 text-red-600" />
                )}
                Access {result.access.access_status}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                updateAccess(result.access.access_status !== "enabled")
              }
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-4 text-sm font-semibold"
            >
              <ShieldCheck className="h-4 w-4" />
              {result.access.access_status === "enabled"
                ? "Disable access"
                : "Re-enable access"}
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Metric
              label="Current sessions"
              value={result.sessions.filter((session) => !session.revoked_at).length}
            />
            <Metric
              label="Billing snapshot"
              value={result.billingSnapshot?.payment_status || "Unavailable"}
            />
            <Metric
              label="Client view mode"
              value={result.statusOverride?.mode || "Automatic"}
            />
          </div>
          <div className="mt-6 border-t border-wxBorder pt-6">
            <h3 className="text-base font-semibold">Active sessions</h3>
            {result.sessions.length ? (
              <div className="mt-3 grid gap-2">
                {result.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col gap-3 rounded-md border border-wxBorder p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold">
                        {session.revoked_at ? "Revoked" : "Active session"}
                      </p>
                      <p className="mt-1 text-xs text-wxIndigo500">
                        Created {new Date(session.created_at).toLocaleString("en-IN")}
                      </p>
                    </div>
                    {!session.revoked_at ? (
                      <button
                        type="button"
                        onClick={() => revokeSession(session.id)}
                        disabled={loading}
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-wxBorder px-3 text-sm font-semibold"
                      >
                        Revoke session
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-wxIndigo500">
                No session records are available.
              </p>
            )}
          </div>
          <form
            className="mt-6 border-t border-wxBorder pt-6"
            onSubmit={saveViewControl}
          >
            <h3 className="text-base font-semibold">Client View Control</h3>
            <p className="mt-1 text-sm text-wxIndigo500">
              Overrides change only the approved public view. PMT source truth
              remains unchanged.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Mode">
                <select
                  name="mode"
                  defaultValue={result.statusOverride?.mode || "automatic"}
                  className="min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"
                >
                  <option value="automatic">Automatic</option>
                  <option value="manual">Manual</option>
                  <option value="frozen">Frozen</option>
                </select>
              </Field>
              <Field label="Public stage">
                <select
                  name="publicStage"
                  defaultValue={result.statusOverride?.public_stage || ""}
                  className="min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"
                >
                  <option value="">Select stage</option>
                  {clientPublicStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Approved public message">
                <textarea
                  name="approvedPublicMessage"
                  maxLength={500}
                  className="min-h-24 w-full rounded-md border border-wxBorder bg-wxSurface p-3"
                />
              </Field>
              <Field label="Override reason">
                <textarea
                  name="overrideReason"
                  minLength={10}
                  maxLength={500}
                  className="min-h-24 w-full rounded-md border border-wxBorder bg-wxSurface p-3"
                />
              </Field>
              <Field label="Override expiry">
                <input
                  name="expiresAt"
                  type="datetime-local"
                  className="min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"
                />
              </Field>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="wx-gradient-action mt-4 inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold text-white"
            >
              Save & Publish
            </button>
          </form>
        </section>
      ) : null}

      <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Provider status</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {["LTS client verification", "LTS billing", "PMT project", "PMT deliverables"].map(
            (provider) => (
              <div key={provider} className="rounded-md border border-wxBorder p-4">
                <p className="text-sm font-semibold">{provider}</p>
                <p className="mt-1 text-xs text-wxIndigo500">
                  Awaiting approved live API activation
                </p>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-semibold text-wxIndigo500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Metric({
  label,
  value
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-wxBorder bg-wxSurface p-4 shadow-soft">
      <p className="text-xs font-semibold text-wxIndigo500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
