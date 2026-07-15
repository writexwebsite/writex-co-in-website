"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SlaAlertActions({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function mutate(action: "acknowledge" | "resolve" | "dismiss") {
    setIsLoading(true);
    setMessage("");
    const response = await fetch(`/api/admin/sla-alerts/${alertId}/${action}`, {
      method: "PATCH"
    });
    const payload = await response.json().catch(() => null);
    setIsLoading(false);

    if (!response.ok) {
      setMessage(payload?.error?.message || "SLA alert update failed.");
      return;
    }

    setMessage("Updated.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={isLoading}
        onClick={() => mutate("acknowledge")}
        className="rounded-md border border-sageBorder px-3 py-2 text-xs font-bold"
      >
        Acknowledge
      </button>
      <button
        type="button"
        disabled={isLoading}
        onClick={() => mutate("resolve")}
        className="rounded-md bg-academicEmerald px-3 py-2 text-xs font-bold text-white"
      >
        Resolve
      </button>
      <button
        type="button"
        disabled={isLoading}
        onClick={() => mutate("dismiss")}
        className="rounded-md bg-paleSage px-3 py-2 text-xs font-bold"
      >
        Dismiss
      </button>
      {message ? <span className="text-xs text-slateText">{message}</span> : null}
    </div>
  );
}
