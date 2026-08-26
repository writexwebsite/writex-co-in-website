"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MailCheck } from "lucide-react";

export function IntegrationHealthTestButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/system-health", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "test_email_delivery" })
      });
      const body = (await response.json()) as {
        ok?: boolean;
        data?: { sent?: boolean; messageIdStored?: boolean };
        error?: { message?: string };
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.error?.message || "The delivery test did not complete.");
      }
      setMessage(
        body.data?.sent
          ? body.data.messageIdStored
            ? "Delivery accepted; message ID stored privately."
            : "Delivery accepted."
          : "Delivery was not accepted. Review the SES health card."
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The delivery test failed safely."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-semibold text-wxIndigo700 transition hover:border-wxViolet700 disabled:opacity-50"
      >
        <MailCheck className="h-4 w-4" />
        {busy ? "Testing delivery..." : "Test SES delivery"}
      </button>
      {message ? (
        <span role="status" className="max-w-xs text-right text-xs text-wxIndigo500">
          {message}
        </span>
      ) : null}
    </div>
  );
}
