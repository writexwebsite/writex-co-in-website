"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { revisionStatuses, type RevisionStatus } from "@/lib/admin/constants";

export function RevisionStatusForm({
  revisionId,
  currentStatus,
  currentNote
}: {
  revisionId: string;
  currentStatus: RevisionStatus;
  currentNote?: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsSaving(true);
    setMessage("");

    const response = await fetch(`/api/admin/revisions/${revisionId}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: formData.get("status"),
        internalNote: formData.get("internalNote")
      })
    });
    const payload = await response.json().catch(() => null);
    setIsSaving(false);

    if (!response.ok) {
      setMessage(payload?.error?.message || "Revision status could not be updated.");
      return;
    }

    setMessage("Revision status updated.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
      <h2 className="text-lg font-bold">Revision review action</h2>
      <label className="mt-4 block text-sm font-semibold" htmlFor="revision-status">
        Status
      </label>
      <select
        id="revision-status"
        name="status"
        defaultValue={currentStatus}
        className="mt-2 min-h-11 w-full rounded-md border border-sageBorder bg-white px-3 py-2 text-sm outline-none focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
      >
        {revisionStatuses.map((status) => (
          <option key={status} value={status}>
            {status.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <label className="mt-4 block text-sm font-semibold" htmlFor="internalNote">
        Internal note
      </label>
      <textarea
        id="internalNote"
        name="internalNote"
        rows={4}
        defaultValue={currentNote || ""}
        className="mt-2 w-full rounded-md border border-sageBorder px-3 py-3 text-sm outline-none focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
        placeholder="Add operations note, clarification needed, scope outcome, or completion context."
      />
      <button
        type="submit"
        disabled={isSaving}
        className="mt-4 rounded-md bg-mutedCopper px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Save revision status"}
      </button>
      {message ? <p className="mt-3 text-sm text-slateText">{message}</p> : null}
    </form>
  );
}
