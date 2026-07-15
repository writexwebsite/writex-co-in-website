"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  paymentVerificationStatuses,
  type PaymentVerificationStatus
} from "@/lib/payments/constants";

export function PaymentVerificationForm({
  paymentId,
  currentStatus,
  currentNotes
}: {
  paymentId: string;
  currentStatus: PaymentVerificationStatus | null;
  currentNotes?: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsSaving(true);
    setMessage("");

    const response = await fetch(`/api/admin/payments/${paymentId}/verification`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verificationStatus: formData.get("verificationStatus"),
        adminNotes: formData.get("adminNotes")
      })
    });
    const payload = await response.json().catch(() => null);
    setIsSaving(false);

    if (!response.ok) {
      setMessage(payload?.error?.message || "Verification status could not be updated.");
      return;
    }

    setMessage("Verification status updated.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
      <h2 className="text-lg font-bold">Accounts review</h2>
      <label className="mt-4 block text-sm font-semibold" htmlFor="verificationStatus">
        Local verification status
      </label>
      <select
        id="verificationStatus"
        name="verificationStatus"
        defaultValue={currentStatus || "pending"}
        className="mt-2 w-full rounded-md border border-sageBorder bg-white px-3 py-3 text-sm outline-none focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
      >
        {paymentVerificationStatuses.map((status) => (
          <option key={status} value={status}>
            {status.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <label className="mt-4 block text-sm font-semibold" htmlFor="adminNotes">
        Admin note
      </label>
      <textarea
        id="adminNotes"
        name="adminNotes"
        rows={4}
        defaultValue={currentNotes || ""}
        className="mt-2 w-full rounded-md border border-sageBorder px-3 py-3 text-sm outline-none focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
        placeholder="Add accounts verification context, clarification needed, or PMT handoff notes."
      />

      <button
        type="submit"
        disabled={isSaving}
        className="mt-4 rounded-md bg-mutedCopper px-4 py-2 text-sm font-bold text-white transition hover:bg-mutedCopper/90 disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Update review"}
      </button>
      {message ? <p className="mt-3 text-sm text-slateText">{message}</p> : null}
    </form>
  );
}
