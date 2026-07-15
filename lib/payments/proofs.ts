import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import type { PaymentVerificationStatus } from "@/lib/payments/constants";

export { paymentVerificationStatuses, type PaymentVerificationStatus } from "@/lib/payments/constants";

export type PaymentProofSnapshot = {
  id: string;
  invoice_id: string;
  amount: string | number | null;
  currency: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_date: string | Date | null;
  payment_status: string | null;
  pmt_payment_status: string | null;
  verification_status: PaymentVerificationStatus | null;
  local_verification_status: PaymentVerificationStatus | null;
  proof_file_asset_id: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

export function isLocalPaymentUnlockAllowed() {
  return process.env.ALLOW_LOCAL_PAYMENT_UNLOCK === "true";
}

export async function getLatestPaymentProof(invoiceId: string) {
  if (!isDatabaseConfigured()) return null;

  const result = await dbQuery<PaymentProofSnapshot>(
    `
      select
        id,
        invoice_id,
        amount,
        currency,
        payment_method,
        payment_reference,
        payment_date,
        payment_status,
        pmt_payment_status,
        verification_status,
        local_verification_status,
        proof_file_asset_id,
        notes,
        admin_notes,
        created_at,
        updated_at
      from payment_events
      where invoice_id = $1
        and event_type = 'proof_submitted'
      order by created_at desc
      limit 1
    `,
    [invoiceId]
  );

  return result.rows[0] ?? null;
}

export async function canUnlockFromLocalPaymentProof(invoiceId: string) {
  if (!isLocalPaymentUnlockAllowed()) return false;

  const proof = await getLatestPaymentProof(invoiceId);

  return proof?.local_verification_status === "verified";
}
