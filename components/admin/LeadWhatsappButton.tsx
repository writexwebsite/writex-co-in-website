"use client";

import { useState } from "react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export function LeadWhatsappButton({ leadId }: { leadId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function openWhatsapp() {
    setIsLoading(true);
    setMessage("");
    const response = await fetch(`/api/admin/leads/${leadId}/whatsapp-click`, {
      method: "POST"
    });
    const payload = await response.json().catch(() => null);
    setIsLoading(false);

    if (!response.ok || !payload?.ok) {
      setMessage(payload?.error?.message || "Could not prepare WhatsApp link.");
      return;
    }

    window.open(payload.data.whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <button
        type="button"
        onClick={openWhatsapp}
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-mutedCopper px-4 py-2 text-center text-sm font-bold text-white disabled:opacity-60"
      >
        <WhatsAppIcon className="h-4 w-4" />
        {isLoading ? "Preparing..." : "Message on WhatsApp"}
      </button>
      {message ? <p className="mt-2 text-xs text-deepCrimson">{message}</p> : null}
    </div>
  );
}
