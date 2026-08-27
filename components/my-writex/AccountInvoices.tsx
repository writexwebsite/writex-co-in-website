import Link from "next/link";
import { FileText, ReceiptText } from "lucide-react";
import type { MyWritexCustomer } from "@/lib/my-writex/types";
import { formatDate, formatMoney } from "@/components/my-writex/MyWritexPrimitives";
import { ProductPageHeader } from "@/components/my-writex/ProductUI";

const paymentStyles: Record<MyWritexCustomer["invoices"][number]["paymentStatus"], string> = {
  Paid: "bg-[#e8f7f0] text-[#116747]",
  Pending: "bg-[#fff3dd] text-[#8a4f00]",
  "Partially Paid": "bg-[#eee9ff] text-[#5423b6]",
  Cancelled: "bg-[#f2efea] text-[#69636d]",
};

export function AccountInvoices({ customer }: { customer: MyWritexCustomer }) {
  const invoices = [...customer.invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  return (
    <div className="mw-page-stack">
      <ProductPageHeader
        eyebrow="Clear and verified"
        title="Invoices & payments"
        copy="A customer-friendly history of invoice and payment positions connected to your authorised projects."
      />
      <section className="mw-list-surface">
        {invoices.map((invoice) => (
          <article key={invoice.invoiceReference} className="border-b border-[var(--mw-line)] p-4 last:border-b-0">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px_120px_auto] md:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <ReceiptText className="h-6 w-6 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} aria-hidden />
                <div className="min-w-0"><p className="mw-meta">{invoice.invoiceReference}</p><h2 className="mw-object-title mt-1 truncate">{invoice.projectTitle}</h2><p className="mw-meta mt-1">Issued {formatDate(invoice.issuedAt)}</p></div>
              </div>
              <div><p className="mw-meta">Amount</p><p className="mt-1 text-sm font-medium">{formatMoney(invoice.amount, invoice.currency)}</p></div>
              <span className={`mw-status-pill justify-self-start ${paymentStyles[invoice.paymentStatus]}`}>{invoice.paymentStatus}</span>
              <Link href={`/my-writex/projects/${invoice.projectId}#invoice`} className="flex h-11 w-11 items-center justify-center rounded-[8px] text-[var(--mw-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]" aria-label={`View ${invoice.invoiceReference} in Project Room`}><FileText className="h-4 w-4" strokeWidth={1.75} /></Link>
            </div>
          </article>
        ))}
      </section>
      <p className="mw-meta">Only use payment instructions shown on an official WriteX invoice. No payment or accounting action is performed from this localhost view.</p>
    </div>
  );
}
