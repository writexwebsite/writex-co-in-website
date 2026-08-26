"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Database,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Star,
  X
} from "lucide-react";
import type {
  AdminRepresentative,
  AdminRepresentativeNumber,
  RepresentativeNumberAction
} from "@/lib/trust/representative-admin";
import type { RepresentativeSyncStatus } from "@/lib/trust/representative-sync-status";

type SyncSummary = {
  received: number;
  created: number;
  updated: number;
  deactivated: number;
  rejected: number;
  numbersReceived: number;
  numbersCreated: number;
  numbersUpdated: number;
  numbersDeactivated: number;
  rejectedNumbers: number;
  finalActiveCount: number;
  finalActiveNumberCount: number;
  completedAt: string;
};

function formatIst(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  }).format(new Date(value));
}

function failureLabel(reason: string | null) {
  if (!reason) return null;
  const labels: Record<string, string> = {
    network_error: "Network error",
    timeout: "LTS timeout",
    unauthorized: "LTS authentication rejected",
    forbidden: "LTS access denied",
    upstream_server_error: "LTS server error",
    upstream_response_error: "Unexpected LTS response",
    malformed_response: "Malformed LTS response",
    empty_response: "Empty LTS response",
    overlap: "Another sync was already running",
    not_configured: "Sync configuration unavailable",
    unexpected_error: "Unexpected sync error"
  };
  return labels[reason] || "Sync unavailable";
}

export function RepresentativeDirectoryControl({
  initialStatus,
  initialRepresentatives
}: {
  initialStatus: RepresentativeSyncStatus;
  initialRepresentatives: AdminRepresentative[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editorRef = useRef<HTMLDialogElement>(null);
  const numberEditorRef = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState(initialStatus);
  const [representatives, setRepresentatives] = useState(initialRepresentatives);
  const [selectedRepresentative, setSelectedRepresentative] =
    useState<AdminRepresentative | null>(null);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingNumber, setIsSavingNumber] = useState(false);
  const [numberInput, setNumberInput] = useState("");
  const [numberReason, setNumberReason] = useState("");
  const [makePrimary, setMakePrimary] = useState(false);
  const [message, setMessage] = useState("");
  const [editorMessage, setEditorMessage] = useState("");
  const [numberEditorMessage, setNumberEditorMessage] = useState("");

  async function refreshStatus() {
    const response = await fetch("/api/admin/representatives/status", {
      cache: "no-store"
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.data) setStatus(payload.data);
  }

  async function refreshRepresentatives() {
    const response = await fetch("/api/admin/representatives", {
      cache: "no-store"
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.data?.representatives) {
      setRepresentatives(payload.data.representatives);
    }
  }

  async function confirmSync() {
    if (isSyncing) return;

    dialogRef.current?.close();
    setIsSyncing(true);
    setMessage("");
    setSummary(null);

    try {
      const response = await fetch("/api/admin/representatives/sync-lts", {
        method: "POST"
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.data) {
        setMessage(
          "Representative sync could not be completed. The last successful directory has been preserved."
        );
        await refreshStatus();
        return;
      }

      setSummary(payload.data);
      setMessage("Representative directory synchronized successfully.");
      await Promise.all([refreshStatus(), refreshRepresentatives()]);
    } catch {
      setMessage(
        "Representative sync could not be completed. The last successful directory has been preserved."
      );
    } finally {
      setIsSyncing(false);
    }
  }

  const lastFailure = failureLabel(status.safeFailureReason);

  function openDisplayNameEditor(representative: AdminRepresentative) {
    setSelectedRepresentative(representative);
    setDisplayNameInput(
      representative.manualPublicDisplayName ||
        representative.publicDisplayName
    );
    setEditorMessage("");
    editorRef.current?.showModal();
  }

  function openNumberEditor(representative: AdminRepresentative) {
    setSelectedRepresentative(representative);
    setNumberInput("");
    setNumberReason("");
    setMakePrimary(false);
    setNumberEditorMessage("");
    numberEditorRef.current?.showModal();
  }

  function updateRepresentativeNumber(
    representativeId: string,
    number: AdminRepresentativeNumber,
    created = false
  ) {
    const update = (representative: AdminRepresentative) => {
      if (representative.id !== representativeId) return representative;
      const numbers = created
        ? [...representative.numbers, number]
        : representative.numbers.map((current) =>
            current.id === number.id ? number : current
          );
      return {
        ...representative,
        numbers: numbers.map((current) =>
          number.isPrimary && current.id !== number.id
            ? { ...current, isPrimary: false }
            : current
        )
      };
    };
    setRepresentatives((current) => current.map(update));
    setSelectedRepresentative((current) => (current ? update(current) : current));
  }

  async function addOfficialNumber() {
    if (!selectedRepresentative || isSavingNumber) return;
    setIsSavingNumber(true);
    setNumberEditorMessage("");
    try {
      const response = await fetch(
        `/api/admin/representatives/${selectedRepresentative.id}/numbers`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mobile: numberInput,
            makePrimary,
            reason: numberReason
          })
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.number) {
        setNumberEditorMessage(
          payload?.error?.message || "The official number could not be added."
        );
        return;
      }
      updateRepresentativeNumber(
        selectedRepresentative.id,
        payload.data.number,
        true
      );
      setNumberInput("");
      setNumberReason("");
      setMakePrimary(false);
      setNumberEditorMessage("Approved official number added.");
    } catch {
      setNumberEditorMessage("The official number could not be added.");
    } finally {
      setIsSavingNumber(false);
    }
  }

  async function changeOfficialNumber(
    number: AdminRepresentativeNumber,
    action: RepresentativeNumberAction
  ) {
    if (!selectedRepresentative || isSavingNumber) return;
    if (numberReason.trim().length < 10) {
      setNumberEditorMessage(
        "Enter an approval reason of at least 10 characters."
      );
      return;
    }

    setIsSavingNumber(true);
    setNumberEditorMessage("");
    try {
      const response = await fetch(
        `/api/admin/representatives/${selectedRepresentative.id}/numbers/${number.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, reason: numberReason })
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.number) {
        setNumberEditorMessage(
          payload?.error?.message || "The official number could not be updated."
        );
        return;
      }
      updateRepresentativeNumber(
        selectedRepresentative.id,
        payload.data.number
      );
      setNumberReason("");
      setNumberEditorMessage("Official number status updated.");
    } catch {
      setNumberEditorMessage("The official number could not be updated.");
    } finally {
      setIsSavingNumber(false);
    }
  }

  async function saveDisplayNameOverride(publicDisplayName: string | null) {
    if (!selectedRepresentative || isSavingName) return;
    setIsSavingName(true);
    setEditorMessage("");

    try {
      const response = await fetch(
        `/api/admin/representatives/${selectedRepresentative.id}/display-name`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ publicDisplayName })
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.representative) {
        setEditorMessage(
          payload?.error?.message ||
            "The public display name could not be updated."
        );
        return;
      }

      const responseRepresentative =
        payload.data.representative as AdminRepresentative;
      const updated = {
        ...responseRepresentative,
        numbers: responseRepresentative.numbers.length
          ? responseRepresentative.numbers
          : selectedRepresentative.numbers
      };
      setRepresentatives((current) =>
        current.map((representative) =>
          representative.id === updated.id ? updated : representative
        )
      );
      setSelectedRepresentative(updated);
      setDisplayNameInput(
        updated.manualPublicDisplayName || updated.publicDisplayName
      );
      setEditorMessage(
        publicDisplayName
          ? "Manual override saved."
          : "Manual override cleared. The approved source name is active."
      );
    } catch {
      setEditorMessage("The public display name could not be updated.");
    } finally {
      setIsSavingName(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-mutedCopper">
              Representative Directory
            </p>
            <h2 className="mt-2 text-2xl font-bold">LTS directory status</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slateText">
              Approved representative records used by the public Trust Centre verification service.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-wxGreen500/30 bg-wxGreen500/10 px-3 py-1.5 text-xs font-bold text-wxIndigo900">
            <CheckCircle2 className="h-4 w-4 text-wxGreen500" aria-hidden />
            Source: {status.source}
          </span>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <StatusLine label="Active representatives" value={String(status.activeRepresentatives)} />
          <StatusLine label="Active official numbers" value={String(status.activeNumbers)} />
          <StatusLine label="Last sync attempted" value={formatIst(status.lastAttemptedAt)} />
          <StatusLine label="Last successful sync" value={formatIst(status.lastSuccessfulAt)} />
          <StatusLine
            label="Last sync result"
            value={lastFailure ? `Failed: ${lastFailure}` : status.lastSuccessfulAt ? "Successful" : "Not recorded"}
            warning={Boolean(lastFailure)}
          />
          <StatusLine
            label="Next automatic sync"
            value={
              status.automaticSync.configured
                ? formatIst(status.automaticSync.nextRunAt)
                : "Automatic sync not configured"
            }
          />
          <StatusLine
            label="Automatic schedule"
            value={
              status.automaticSync.configured
                ? `${status.automaticSync.schedule} · ${status.automaticSync.timezone}`
                : "Not configured"
            }
          />
        </dl>

        <div className="mt-6 flex flex-col gap-3 border-t border-sageBorder pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slateText">
            A failed sync preserves the last successful directory and Excel fallback.
          </p>
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => dialogRef.current?.showModal()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-academicEmerald px-4 text-sm font-bold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mutedCopper disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} aria-hidden />
            {isSyncing ? "Syncing representatives…" : "Sync Representatives Now"}
          </button>
        </div>

        <div aria-live="polite" aria-busy={isSyncing} className="mt-4 min-h-6">
          {message ? (
            <p className={`text-sm font-semibold ${summary ? "text-wxGreen500" : "text-wxOrange500"}`}>
              {message}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-sageBorder bg-white shadow-soft lg:col-span-2">
        <div className="border-b border-sageBorder px-5 py-5 md:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-mutedCopper">
            Public identity controls
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Representative display names</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slateText">
                Source names remain internal. Manual overrides take priority over the LTS public name and fallback.
              </p>
            </div>
            <span className="text-xs font-semibold text-slateText">
              {representatives.length} records
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
            <thead className="bg-paleSage text-xs uppercase text-slateText">
              <tr>
                <th className="px-5 py-3 font-bold md:px-6">Source / legal name</th>
                <th className="px-5 py-3 font-bold">Public display name</th>
                <th className="px-5 py-3 font-bold">Source</th>
                <th className="px-5 py-3 font-bold">Role</th>
                <th className="px-5 py-3 font-bold">Official numbers</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 text-right font-bold md:px-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sageBorder">
              {representatives.map((representative) => (
                <tr key={representative.id}>
                  <td className="px-5 py-4 font-semibold text-charcoalInk md:px-6">
                    {representative.sourceFullName}
                  </td>
                  <td className="px-5 py-4 font-bold text-wxIndigo900">
                    {representative.publicDisplayName}
                  </td>
                  <td className="px-5 py-4">
                    <DisplayNameSource source={representative.displayNameSource} />
                  </td>
                  <td className="px-5 py-4 text-slateText">
                    <span className="block font-semibold text-charcoalInk">
                      {representative.designation}
                    </span>
                    {representative.department}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {representative.numbers.length ? (
                        representative.numbers.map((number) => (
                          <span
                            key={number.id}
                            className="inline-flex items-center gap-1 rounded-full border border-sageBorder bg-paleSage px-2.5 py-1 text-xs font-semibold text-wxIndigo900"
                          >
                            {number.isPrimary ? (
                              <Star className="h-3 w-3" aria-label="Primary" />
                            ) : null}
                            {number.maskedNumber}
                            <span className="text-slateText">
                              {number.status}
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slateText">No number stored</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`font-semibold ${
                        representative.status === "Active"
                          ? "text-wxGreen500"
                          : "text-slateText"
                      }`}
                    >
                      {representative.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right md:px-6">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openNumberEditor(representative)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-sageBorder px-3 font-bold text-wxIndigo900 transition hover:bg-paleSage"
                      >
                        <Phone className="h-4 w-4" aria-hidden />
                        Numbers
                      </button>
                      <button
                        type="button"
                        onClick={() => openDisplayNameEditor(representative)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-sageBorder px-3 font-bold text-wxIndigo900 transition hover:bg-paleSage"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                        Name
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft md:p-6">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-mutedCopper" aria-hidden />
          <h2 className="text-xl font-bold">Latest sync summary</h2>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <SummaryMetric label="Received" value={summary?.received ?? status.counts.received} />
          <SummaryMetric label="Created" value={summary?.created ?? status.counts.created} />
          <SummaryMetric label="Updated" value={summary?.updated ?? status.counts.updated} />
          <SummaryMetric label="Deactivated" value={summary?.deactivated ?? status.counts.deactivated} />
          <SummaryMetric label="Rejected" value={summary?.rejected ?? status.counts.rejected} />
          <SummaryMetric label="Final active" value={summary?.finalActiveCount ?? status.activeRepresentatives} />
          <SummaryMetric label="Numbers received" value={summary?.numbersReceived ?? status.counts.numbersReceived} />
          <SummaryMetric label="Numbers created" value={summary?.numbersCreated ?? status.counts.numbersCreated} />
          <SummaryMetric label="Numbers updated" value={summary?.numbersUpdated ?? status.counts.numbersUpdated} />
          <SummaryMetric label="Numbers deactivated" value={summary?.numbersDeactivated ?? status.counts.numbersDeactivated} />
          <SummaryMetric label="Rejected numbers" value={summary?.rejectedNumbers ?? status.counts.rejectedNumbers} />
          <SummaryMetric label="Active official numbers" value={summary?.finalActiveNumberCount ?? status.activeNumbers} />
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-sageBorder pt-4 text-xs text-slateText">
          <Clock3 className="h-4 w-4" aria-hidden />
          {summary ? `Completed ${formatIst(summary.completedAt)}` : `Last successful ${formatIst(status.lastSuccessfulAt)}`}
        </div>
      </section>

      <dialog
        ref={dialogRef}
        aria-labelledby="representative-sync-title"
        className="w-[min(92vw,32rem)] rounded-lg border border-sageBorder bg-white p-0 text-charcoalInk shadow-2xl backdrop:bg-wxIndigo900/50"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-mutedCopper">Confirm manual sync</p>
              <h2 id="representative-sync-title" className="mt-2 text-xl font-bold">Sync representatives now?</h2>
            </div>
            <button
              type="button"
              aria-label="Close confirmation"
              onClick={() => dialogRef.current?.close()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-sageBorder text-slateText transition hover:bg-paleSage"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <p className="mt-4 text-sm leading-7 text-slateText">
            This will fetch the latest approved representatives from LTS and update the Trust Centre directory.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-11 rounded-md border border-sageBorder px-4 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmSync}
              className="min-h-11 rounded-md bg-academicEmerald px-4 text-sm font-bold text-white"
            >
              Confirm sync
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        ref={editorRef}
        aria-labelledby="display-name-editor-title"
        className="w-[min(92vw,34rem)] rounded-lg border border-sageBorder bg-white p-0 text-charcoalInk shadow-2xl backdrop:bg-wxIndigo900/50"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-mutedCopper">
                Public display name
              </p>
              <h2 id="display-name-editor-title" className="mt-2 text-xl font-bold">
                Edit approved customer-facing name
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close display name editor"
              onClick={() => editorRef.current?.close()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-sageBorder text-slateText transition hover:bg-paleSage"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {selectedRepresentative ? (
            <>
              <dl className="mt-5 grid gap-3 rounded-md bg-paleSage p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-slateText">Source / legal name</dt>
                  <dd className="mt-1 font-bold">{selectedRepresentative.sourceFullName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slateText">LTS public name</dt>
                  <dd className="mt-1 font-bold">
                    {selectedRepresentative.ltsPublicDisplayName || "Not supplied"}
                  </dd>
                </div>
              </dl>

              <label className="mt-5 block text-sm font-bold" htmlFor="representative-public-display-name">
                Approved public display name
              </label>
              <input
                id="representative-public-display-name"
                value={displayNameInput}
                maxLength={100}
                onChange={(event) => setDisplayNameInput(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-md border border-sageBorder bg-white px-3 text-sm outline-none transition focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
              />
              <p className="mt-2 text-xs leading-5 text-slateText">
                Saving creates a website-approved manual override. Clearing restores the LTS or fallback name.
              </p>

              <div aria-live="polite" className="mt-3 min-h-5 text-sm font-semibold text-slateText">
                {editorMessage}
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 border-t border-sageBorder pt-5 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  disabled={isSavingName || !selectedRepresentative.manualPublicDisplayName}
                  onClick={() => saveDisplayNameOverride(null)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-sageBorder px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Clear override
                </button>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => editorRef.current?.close()}
                    className="min-h-11 rounded-md border border-sageBorder px-4 text-sm font-bold"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={isSavingName || !displayNameInput.trim()}
                    onClick={() => saveDisplayNameOverride(displayNameInput)}
                    className="min-h-11 rounded-md bg-academicEmerald px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingName ? "Saving..." : "Save override"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </dialog>

      <dialog
        ref={numberEditorRef}
        aria-labelledby="representative-number-editor-title"
        className="w-[min(94vw,44rem)] rounded-lg border border-sageBorder bg-white p-0 text-charcoalInk shadow-2xl backdrop:bg-wxIndigo900/50"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-mutedCopper">
                Approved official numbers
              </p>
              <h2 id="representative-number-editor-title" className="mt-2 text-xl font-bold">
                Manage representative numbers
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close number editor"
              onClick={() => numberEditorRef.current?.close()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-sageBorder text-slateText transition hover:bg-paleSage"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {selectedRepresentative ? (
            <>
              <p className="mt-3 text-sm leading-6 text-slateText">
                Only masked values are displayed. Personal numbers must never be added.
              </p>
              <div className="mt-5 grid gap-3">
                {selectedRepresentative.numbers.map((number) => (
                  <div
                    key={number.id}
                    className="grid gap-3 rounded-md border border-sageBorder p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{number.maskedNumber}</span>
                        {number.isPrimary ? (
                          <span className="rounded-full bg-wxGreen500/10 px-2 py-1 text-xs font-bold text-wxGreen500">
                            Primary
                          </span>
                        ) : null}
                        <span className="rounded-full bg-paleSage px-2 py-1 text-xs font-semibold text-slateText">
                          {number.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slateText">
                        {number.sourcePhoneType.replaceAll("_", " ")} · {number.source}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!number.isPrimary && number.status === "Active" ? (
                        <button
                          type="button"
                          disabled={isSavingNumber}
                          onClick={() => changeOfficialNumber(number, "make_primary")}
                          className="min-h-11 rounded-md border border-sageBorder px-3 text-xs font-bold"
                        >
                          Make primary
                        </button>
                      ) : null}
                      {number.status === "Active" ? (
                        <button
                          type="button"
                          disabled={isSavingNumber}
                          onClick={() => changeOfficialNumber(number, "deactivate")}
                          className="min-h-11 rounded-md border border-sageBorder px-3 text-xs font-bold"
                        >
                          Deactivate
                        </button>
                      ) : number.status === "Inactive" ? (
                        <button
                          type="button"
                          disabled={isSavingNumber}
                          onClick={() => changeOfficialNumber(number, "activate")}
                          className="min-h-11 rounded-md border border-sageBorder px-3 text-xs font-bold"
                        >
                          Activate
                        </button>
                      ) : null}
                      {number.status !== "Revoked" ? (
                        <button
                          type="button"
                          disabled={isSavingNumber}
                          onClick={() => changeOfficialNumber(number, "revoke")}
                          className="min-h-11 rounded-md border border-red-200 px-3 text-xs font-bold text-red-700"
                        >
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-sageBorder pt-5">
                <h3 className="font-bold">Add approved temporary official number</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-bold">
                    Official mobile
                    <input
                      value={numberInput}
                      onChange={(event) => setNumberInput(event.target.value)}
                      inputMode="tel"
                      autoComplete="off"
                      placeholder="+91 XXXXX XXXXX"
                      className="mt-2 min-h-11 w-full rounded-md border border-sageBorder px-3 text-sm"
                    />
                  </label>
                  <label className="text-sm font-bold">
                    Approval reason
                    <input
                      value={numberReason}
                      onChange={(event) => setNumberReason(event.target.value)}
                      maxLength={500}
                      placeholder="Management approval reference"
                      className="mt-2 min-h-11 w-full rounded-md border border-sageBorder px-3 text-sm"
                    />
                  </label>
                </div>
                <label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={makePrimary}
                    onChange={(event) => setMakePrimary(event.target.checked)}
                  />
                  Mark as the primary official number
                </label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p aria-live="polite" className="text-sm font-semibold text-slateText">
                    {numberEditorMessage}
                  </p>
                  <button
                    type="button"
                    disabled={
                      isSavingNumber ||
                      !numberInput.trim() ||
                      numberReason.trim().length < 10
                    }
                    onClick={addOfficialNumber}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-academicEmerald px-4 text-sm font-bold text-white disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Add approved number
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </dialog>
    </div>
  );
}

function DisplayNameSource({
  source
}: {
  source: AdminRepresentative["displayNameSource"];
}) {
  const label =
    source === "manual_override" || source === "management_mapping"
      ? "Manual Override"
      : source === "lts_public_display_name" ||
          source === "lts_sales_display_name"
        ? "LTS"
        : "Fallback";

  return (
    <span className="inline-flex rounded-full border border-sageBorder bg-paleSage px-2.5 py-1 text-xs font-bold text-wxIndigo900">
      {label}
    </span>
  );
}

function StatusLine({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="rounded-md bg-paleSage px-4 py-3">
      <dt className="text-xs font-semibold text-slateText">{label}</dt>
      <dd className={`mt-1 text-sm font-bold ${warning ? "text-wxOrange500" : "text-charcoalInk"}`}>{value}</dd>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-sageBorder p-4">
      <p className="text-xs font-semibold text-slateText">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
