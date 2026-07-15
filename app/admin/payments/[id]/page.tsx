import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminFileButton } from "@/components/admin/AdminFileButton";
import { AdminShell } from "@/components/admin/AdminShell";
import { PaymentNotifyButton } from "@/components/admin/PaymentNotifyButton";
import { PaymentVerificationForm } from "@/components/admin/PaymentVerificationForm";
import { getAdminPaymentEvent } from "@/lib/admin/payments";
import { requireAdminSession } from "@/lib/admin/session";
import { getPaymentDetails } from "@/lib/integrations/pmt";

export const metadata: Metadata = {
  title: "Payment Proof Detail | WriteX Admin",
  robots: { index: false, follow: false }
};

function formatDate(value: string | Date | null) {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatAmount(value: string | number | null, currency?: string | null) {
  if (value === null || value === undefined || value === "") return "Not provided";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function DetailRow({
  label,
  value
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-md bg-paleSage p-3">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slateText">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-charcoalInk">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

export default async function AdminPaymentDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  const { id } = await params;
  const payment = await getAdminPaymentEvent(id);

  if (!payment) notFound();

  let pmtStatus = "Unavailable";
  try {
    const pmt = await getPaymentDetails(payment.invoice_id);
    pmtStatus = `${pmt.paymentStatus} · ${pmt.isSettled ? "settled" : "not settled"}`;
  } catch {
    pmtStatus = payment.pmt_payment_status || "Unavailable";
  }

  return (
    <AdminShell
      session={session}
      eyebrow="Accounts review"
      title={`Payment proof ${payment.invoice_id}`}
    >
      <div className="mb-5">
        <Link
          href="/admin/payments"
          className="text-sm font-bold text-mutedCopper hover:underline"
        >
          Back to payments
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Submitted proof details</h2>
            <dl className="mt-5 grid gap-3 md:grid-cols-2">
              <DetailRow label="Invoice ID" value={payment.invoice_id} />
              <DetailRow label="Client name" value={payment.client_name} />
              <DetailRow label="WhatsApp" value={payment.whatsapp} />
              <DetailRow
                label="Amount claimed"
                value={formatAmount(payment.amount, payment.currency)}
              />
              <DetailRow label="Payment method" value={payment.payment_method} />
              <DetailRow label="Reference" value={payment.payment_reference} />
              <DetailRow
                label="Payment date"
                value={payment.payment_date ? formatDate(payment.payment_date) : null}
              />
              <DetailRow
                label="Submitted"
                value={formatDate(payment.created_at)}
              />
              <DetailRow
                label="Local status"
                value={(payment.verification_status || "pending").replace(/_/g, " ")}
              />
              <DetailRow label="Current PMT status" value={pmtStatus} />
            </dl>
            <div className="mt-5 rounded-md border border-sageBorder bg-white p-4">
              <h3 className="text-sm font-bold">Client notes</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slateText">
                {payment.notes || "No client notes submitted."}
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Proof file</h2>
            {payment.proof_file_asset_id ? (
              <div className="mt-4 grid gap-3 rounded-md border border-sageBorder p-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-bold">
                    {payment.proof_file_name || "Private payment proof file"}
                  </p>
                  <p className="mt-1 text-sm text-slateText">
                    {payment.proof_mime_type || "Unknown type"} ·{" "}
                    {payment.proof_file_size
                      ? `${Math.round(payment.proof_file_size / 1024)} KB`
                      : "Unknown size"}
                  </p>
                  <p className="text-sm text-slateText">
                    File asset ID: {payment.proof_file_asset_id}
                  </p>
                </div>
                <AdminFileButton fileAssetId={payment.proof_file_asset_id} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-slateText">
                No private proof file is attached. Review the payment reference and notes.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold">Raw review context</h2>
            <pre className="mt-4 max-h-80 overflow-auto rounded-md bg-charcoalInk p-4 text-xs leading-5 text-white">
              {JSON.stringify(payment.raw_payload || {}, null, 2)}
            </pre>
          </section>
        </div>

        <aside className="space-y-6">
          <PaymentVerificationForm
            paymentId={payment.id}
            currentStatus={payment.verification_status || "pending"}
            currentNotes={payment.admin_notes}
          />
          <PaymentNotifyButton paymentId={payment.id} />
          <section className="rounded-lg border border-sageBorder bg-white p-5 shadow-soft">
            <h2 className="text-lg font-bold">Download rule</h2>
            <p className="mt-2 text-sm leading-6 text-slateText">
              Local verification does not unlock final delivery by default. PMT
              settled/approved status is still required unless
              `ALLOW_LOCAL_PAYMENT_UNLOCK=true` is explicitly enabled server-side.
            </p>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
