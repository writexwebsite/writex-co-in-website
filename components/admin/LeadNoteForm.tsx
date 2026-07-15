"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LeadNoteForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSaving(true);
    setMessage("");

    const response = await fetch(`/api/admin/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: formData.get("note") })
    });
    const payload = await response.json().catch(() => null);

    setIsSaving(false);

    if (!response.ok) {
      setMessage(payload?.error?.message || "Note could not be saved.");
      return;
    }

    form.reset();
    setMessage("Note saved.");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft"
    >
      <h2 className="text-lg font-bold">Internal note</h2>
      <label className="mt-4 block text-sm font-semibold" htmlFor="note">
        Add note
      </label>
      <textarea
        id="note"
        name="note"
        required
        minLength={2}
        rows={4}
        className="mt-2 w-full rounded-md border border-sageBorder px-3 py-3 text-sm outline-none focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
        placeholder="Add call summary, quote context, missing information, or handoff note."
      />
      <button
        type="submit"
        disabled={isSaving}
        className="mt-3 rounded-md bg-mutedCopper px-4 py-2 text-sm font-bold text-white transition hover:bg-mutedCopper/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Save note"}
      </button>
      {message ? <p className="mt-3 text-sm text-slateText">{message}</p> : null}
    </form>
  );
}
