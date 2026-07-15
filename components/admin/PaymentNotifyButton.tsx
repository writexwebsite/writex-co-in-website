"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PaymentNotifyButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleNotify() {
    setIsSending(true);
    setMessage("");
    const response = await fetch(`/api/admin/payments/${paymentId}/notify`, {
      method: "POST"
    });
    const payload = await response.json().catch(() => null);
    setIsSending(false);

    if (!response.ok) {
      setMessage(payload?.error?.message || "Accounts notification could not be sent.");
      return;
    }

    setMessage("Accounts notification queued.");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
      <h2 className="text-lg font-bold">Notify accounts</h2>
      <p className="mt-2 text-sm leading-6 text-slateText">
        Send the payment proof details to the configured accounts inbox again.
      </p>
      <button
        type="button"
        onClick={handleNotify}
        disabled={isSending}
        className="mt-4 rounded-md bg-academicEmerald px-4 py-2 text-sm font-bold text-white transition hover:bg-academicEmerald/90 disabled:opacity-60"
      >
        {isSending ? "Sending..." : "Notify accounts"}
      </button>
      {message ? <p className="mt-3 text-sm text-slateText">{message}</p> : null}
    </div>
  );
}
