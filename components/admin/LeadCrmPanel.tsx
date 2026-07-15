"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AdminUserOption = {
  id: string;
  name: string;
  email: string;
};

export function LeadCrmPanel({
  leadId,
  owners,
  assignedTo,
  priority,
  quality,
  nextFollowUpAt,
  quotedAmount,
  quotedCurrency,
  lossReason
}: {
  leadId: string;
  owners: AdminUserOption[];
  assignedTo?: string | null;
  priority: string;
  quality: string;
  nextFollowUpAt?: string | Date | null;
  quotedAmount?: string | number | null;
  quotedCurrency?: string | null;
  lossReason?: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function patch(endpoint: string, body: Record<string, unknown>) {
    setMessage("");
    const response = await fetch(`/api/admin/leads/${leadId}/${endpoint}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(payload?.error?.message || "CRM update failed.");
      return;
    }
    setMessage("CRM update saved.");
    router.refresh();
  }

  async function handleAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = String(formData.get("assignedToAdminUserId") || "");
    await patch("assign", { assignedToAdminUserId: value || null });
  }

  async function handlePriority(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await patch("priority", { leadPriority: formData.get("leadPriority") });
    await patch("quality", { leadQuality: formData.get("leadQuality") });
  }

  async function handleFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await patch("follow-up", {
      nextFollowUpAt: formData.get("nextFollowUpAt"),
      note: formData.get("note")
    });
  }

  async function handleQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await patch("quote", {
      quotedAmount: formData.get("quotedAmount"),
      quotedCurrency: formData.get("quotedCurrency"),
      expectedCloseDate: formData.get("expectedCloseDate"),
      note: formData.get("quoteNote")
    });
  }

  async function handleClose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const action = String(formData.get("closeAction") || "");
    if (action === "converted") {
      await patch("convert", {
        convertedAmount: formData.get("convertedAmount"),
        convertedCurrency: formData.get("convertedCurrency"),
        note: formData.get("closeNote")
      });
    } else {
      await patch("lost", {
        lossReason: formData.get("lossReason"),
        note: formData.get("closeNote")
      });
    }
  }

  return (
    <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
      <h2 className="text-lg font-bold">CRM controls</h2>
      {message ? <p className="mt-3 rounded-md bg-paleSage p-3 text-sm font-semibold">{message}</p> : null}

      <form onSubmit={handleAssignment} className="mt-4 border-t border-sageBorder pt-4">
        <label className="block text-sm font-semibold" htmlFor="assignedToAdminUserId">
          Owner
        </label>
        <div className="mt-2 flex gap-2">
          <select
            id="assignedToAdminUserId"
            name="assignedToAdminUserId"
            defaultValue={assignedTo || ""}
            className="min-h-11 flex-1 rounded-md border border-sageBorder px-3 text-sm"
          >
            <option value="">Unassigned</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name} ({owner.email})
              </option>
            ))}
          </select>
          <button className="rounded-md bg-academicEmerald px-3 text-sm font-bold text-white">
            Save
          </button>
        </div>
      </form>

      <form onSubmit={handlePriority} className="mt-4 grid gap-3 border-t border-sageBorder pt-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Priority
          <select name="leadPriority" defaultValue={priority} className="mt-1 min-h-11 w-full rounded-md border border-sageBorder px-3 text-sm">
            {["low", "normal", "high", "urgent"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Quality
          <select name="leadQuality" defaultValue={quality} className="mt-1 min-h-11 w-full rounded-md border border-sageBorder px-3 text-sm">
            {["unqualified", "low", "medium", "high", "premium", "spam"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <button className="rounded-md bg-academicEmerald px-3 py-2 text-sm font-bold text-white sm:col-span-2">
          Save priority and quality
        </button>
      </form>

      <form onSubmit={handleFollowUp} className="mt-4 border-t border-sageBorder pt-4">
        <label className="block text-sm font-semibold">
          Next follow-up
          <input
            type="datetime-local"
            name="nextFollowUpAt"
            defaultValue={nextFollowUpAt ? new Date(nextFollowUpAt).toISOString().slice(0, 16) : ""}
            className="mt-1 min-h-11 w-full rounded-md border border-sageBorder px-3 text-sm"
          />
        </label>
        <textarea
          name="note"
          rows={2}
          className="mt-2 w-full rounded-md border border-sageBorder px-3 py-2 text-sm"
          placeholder="Follow-up note"
        />
        <button className="mt-2 rounded-md bg-mutedCopper px-3 py-2 text-sm font-bold text-white">
          Schedule follow-up
        </button>
      </form>

      <form onSubmit={handleQuote} className="mt-4 grid gap-3 border-t border-sageBorder pt-4 sm:grid-cols-2">
        <input name="quotedAmount" type="number" min="1" step="0.01" defaultValue={quotedAmount ? String(quotedAmount) : ""} placeholder="Quoted amount" className="min-h-11 rounded-md border border-sageBorder px-3 text-sm" />
        <input name="quotedCurrency" defaultValue={quotedCurrency || "INR"} placeholder="Currency" className="min-h-11 rounded-md border border-sageBorder px-3 text-sm" />
        <input name="expectedCloseDate" type="date" className="min-h-11 rounded-md border border-sageBorder px-3 text-sm" />
        <input name="quoteNote" placeholder="Quote note" className="min-h-11 rounded-md border border-sageBorder px-3 text-sm" />
        <button className="rounded-md bg-academicEmerald px-3 py-2 text-sm font-bold text-white sm:col-span-2">
          Mark quote sent
        </button>
      </form>

      <form onSubmit={handleClose} className="mt-4 grid gap-3 border-t border-sageBorder pt-4 sm:grid-cols-2">
        <select name="closeAction" className="min-h-11 rounded-md border border-sageBorder px-3 text-sm">
          <option value="converted">Converted</option>
          <option value="lost">Lost</option>
        </select>
        <select name="lossReason" defaultValue={lossReason || "no_response"} className="min-h-11 rounded-md border border-sageBorder px-3 text-sm">
          {["price_high", "no_response", "deadline_missed", "irrelevant_request", "competitor", "not_serviceable", "spam", "other"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input name="convertedAmount" type="number" min="1" step="0.01" placeholder="Converted amount" className="min-h-11 rounded-md border border-sageBorder px-3 text-sm" />
        <input name="convertedCurrency" defaultValue="INR" placeholder="Currency" className="min-h-11 rounded-md border border-sageBorder px-3 text-sm" />
        <input name="closeNote" placeholder="Close note" className="min-h-11 rounded-md border border-sageBorder px-3 text-sm sm:col-span-2" />
        <button className="rounded-md bg-mutedCopper px-3 py-2 text-sm font-bold text-white sm:col-span-2">
          Save close outcome
        </button>
      </form>
    </section>
  );
}
