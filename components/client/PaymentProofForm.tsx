"use client";

import { FormEvent, useState } from "react";
import { UploadCloud } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

type PaymentProofFormProps = {
  invoiceId: string;
  currency: string;
  supportUrl: string;
  onSubmitted?: () => void;
};

type PaymentProofResponse = {
  ok: boolean;
  data?: {
    success?: boolean;
    verificationStatus?: string;
    message?: string;
  };
  error?: { message?: string };
};

export function PaymentProofForm({
  invoiceId,
  currency,
  supportUrl,
  onSubmitted
}: PaymentProofFormProps) {
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFallback(false);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("invoiceId", invoiceId);
    formData.set("currency", currency);

    const response = await fetch("/api/client/payment-proof", {
      method: "POST",
      body: formData
    });
    const payload = (await response.json().catch(() => null)) as
      | PaymentProofResponse
      | null;
    setIsSubmitting(false);

    if (!response.ok || !payload?.data?.success) {
      setMessage(
        payload?.error?.message ||
          "We could not upload the payment proof. Please send the screenshot to WriteX support on WhatsApp."
      );
      setFallback(true);
      return;
    }

    setMessage(
      payload.data.message ||
        "Payment proof received. Accounts will verify the payment."
    );
    form.reset();
    onSubmitted?.();
  }

  return (
    <section className="wx-admin-enter rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-mutedCopper">
            Payment proof
          </p>
          <h2 className="mt-2 text-2xl font-bold">Already paid?</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slateText">
            If you have completed the payment, share the transaction reference
            or payment screenshot. WriteX accounts will verify the payment
            before download unlocks.
          </p>
        </div>
        <a
          href={supportUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-sageBorder bg-white px-4 text-sm font-bold text-charcoalInk transition hover:border-mutedCopper"
        >
          <WhatsAppIcon className="h-4 w-4 shrink-0" />
          Send Payment Proof on WhatsApp
        </a>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-bold">
          Amount paid
          <input
            name="amountPaid"
            type="number"
            min="1"
            step="0.01"
            required
            className="mt-2 w-full rounded-md border border-sageBorder px-4 py-3 text-sm outline-none focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
          />
        </label>

        <label className="block text-sm font-bold">
          Payment method
          <input
            name="paymentMethod"
            required
            placeholder="UPI, bank transfer, card..."
            className="mt-2 w-full rounded-md border border-sageBorder px-4 py-3 text-sm outline-none focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
          />
        </label>

        <label className="block text-sm font-bold">
          Payment reference / transaction ID
          <input
            name="paymentReference"
            required
            className="mt-2 w-full rounded-md border border-sageBorder px-4 py-3 text-sm outline-none focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
          />
        </label>

        <label className="block text-sm font-bold">
          Payment date
          <input
            name="paymentDate"
            type="date"
            required
            className="mt-2 w-full rounded-md border border-sageBorder px-4 py-3 text-sm outline-none focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
          />
        </label>

        <label className="block text-sm font-bold md:col-span-2">
          Optional notes
          <textarea
            name="notes"
            rows={3}
            placeholder="Add any helpful payment context for accounts."
            className="mt-2 w-full rounded-md border border-sageBorder px-4 py-3 text-sm outline-none focus:border-mutedCopper focus:ring-2 focus:ring-mutedCopper/20"
          />
        </label>

        <label className="block text-sm font-bold md:col-span-2">
          Upload screenshot/proof
          <input
            name="proof"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            className="mt-2 w-full rounded-md border border-dashed border-sageBorder bg-paleSage px-4 py-3 text-sm"
          />
          <span className="mt-2 block text-xs font-semibold text-slateText">
            JPG, PNG, or PDF. Files are stored privately and reviewed by accounts.
          </span>
        </label>

        {message ? (
          <p
            className={`wx-admin-enter rounded-md px-4 py-3 text-sm font-semibold md:col-span-2 ${
              fallback
                ? "border border-deepCrimson/20 bg-deepCrimson/5 text-deepCrimson"
                : "border border-softTeal/20 bg-softTeal/10 text-charcoalInk"
            }`}
          >
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="wx-gradient-action inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold transition disabled:opacity-60 md:col-span-2"
        >
          <UploadCloud className="h-4 w-4" aria-hidden />
          {isSubmitting ? "Submitting proof..." : "Submit Payment Proof"}
        </button>
      </form>
    </section>
  );
}
