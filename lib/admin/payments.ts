import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import {
  paymentVerificationStatuses,
  type PaymentVerificationStatus
} from "@/lib/payments/constants";

export { paymentVerificationStatuses, type PaymentVerificationStatus };

export type AdminPaymentEvent = {
  id: string;
  invoice_id: string;
  client_session_id: string | null;
  event_type: string;
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
  client_name: string | null;
  whatsapp: string | null;
  notes: string | null;
  admin_notes: string | null;
  source: string;
  raw_payload: unknown;
  created_at: string | Date;
  updated_at: string | Date;
  proof_file_name: string | null;
  proof_mime_type: string | null;
  proof_file_size: number | null;
};

function normalizeStatus(status?: string | null) {
  return paymentVerificationStatuses.includes(
    status as PaymentVerificationStatus
  )
    ? (status as PaymentVerificationStatus)
    : undefined;
}

function buildFilters({
  status,
  search
}: {
  status?: string | null;
  search?: string | null;
}) {
  const values: unknown[] = [];
  const where = ["payment_events.event_type = 'proof_submitted'"];
  const safeStatus = normalizeStatus(status);
  const cleanSearch = search?.trim();

  if (safeStatus) {
    values.push(safeStatus);
    where.push(`payment_events.verification_status = $${values.length}`);
  }

  if (cleanSearch) {
    values.push(`%${cleanSearch}%`);
    const position = values.length;
    where.push(`(
      payment_events.invoice_id ilike $${position}
      or payment_events.client_name ilike $${position}
      or payment_events.whatsapp ilike $${position}
      or payment_events.payment_reference ilike $${position}
    )`);
  }

  return {
    whereSql: `where ${where.join(" and ")}`,
    values,
    status: safeStatus,
    search: cleanSearch || ""
  };
}

export async function getAdminPaymentEvents({
  page = 1,
  pageSize = 20,
  status,
  search
}: {
  page?: number;
  pageSize?: number;
  status?: string | null;
  search?: string | null;
}) {
  if (!isDatabaseConfigured()) {
    return {
      payments: [] as AdminPaymentEvent[],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      status: normalizeStatus(status),
      search: search?.trim() || ""
    };
  }

  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const safePageSize = Number.isFinite(pageSize)
    ? Math.min(Math.max(1, Math.floor(pageSize)), 100)
    : 20;
  const offset = (safePage - 1) * safePageSize;
  const filters = buildFilters({ status, search });
  const count = await dbQuery<{ count: string }>(
    `select count(*)::text as count from payment_events ${filters.whereSql}`,
    filters.values
  );
  const rows = await dbQuery<AdminPaymentEvent>(
    `
      select
        payment_events.*,
        file_assets.file_name as proof_file_name,
        file_assets.mime_type as proof_mime_type,
        file_assets.file_size as proof_file_size
      from payment_events
      left join file_assets on file_assets.id = payment_events.proof_file_asset_id
      ${filters.whereSql}
      order by payment_events.created_at desc
      limit $${filters.values.length + 1}
      offset $${filters.values.length + 2}
    `,
    [...filters.values, safePageSize, offset]
  );
  const total = Number(count.rows[0]?.count || 0);

  return {
    payments: rows.rows,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil(total / safePageSize),
    status: filters.status,
    search: filters.search
  };
}

export async function getAdminPaymentEvent(id: string) {
  if (!isDatabaseConfigured()) return null;

  const result = await dbQuery<AdminPaymentEvent>(
    `
      select
        payment_events.*,
        file_assets.file_name as proof_file_name,
        file_assets.mime_type as proof_mime_type,
        file_assets.file_size as proof_file_size
      from payment_events
      left join file_assets on file_assets.id = payment_events.proof_file_asset_id
      where payment_events.id = $1
      limit 1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}
