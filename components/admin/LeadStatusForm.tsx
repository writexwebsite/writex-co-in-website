"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { leadStatuses, type LeadStatus } from "@/lib/admin/constants";

export function LeadStatusForm({
  leadId,
  currentStatus
}: {
  leadId: string;
  currentStatus: LeadStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<LeadStatus>(currentStatus);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function saveStatus() {
    setIsSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/leads/${leadId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const payload = await response.json().catch(() => null);

    setIsSaving(false);

    if (!response.ok) {
      setMessage(payload?.error?.message || "Status could not be updated.");
      return;
    }

    setMessage("Status updated.");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
      <h2 className="text-lg font-bold">Lead status</h2>
      <label className="mt-4 block text-sm font-semibold" htmlFor="lead-status">
        Current status
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <select
          id="lead-status"
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as LeadStatus)}
          className="min-h-11 flex-1 rounded-md border border-sageBorder bg-white px-3 py-2 text-sm outline-none focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
        >
          {leadStatuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={saveStatus}
          disabled={isSaving || status === currentStatus}
          className="rounded-md bg-academicEmerald px-4 py-2 text-sm font-bold text-white transition hover:bg-academicEmerald/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Update"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-slateText">{message}</p> : null}
    </div>
  );
}
