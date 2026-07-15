import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { revisionStatuses, type RevisionStatus } from "@/lib/admin/constants";

export { revisionStatuses, type RevisionStatus };

export type AdminRevision = {
  id: string;
  invoice_id: string;
  request_type: string;
  issue_category: string;
  related_section: string | null;
  priority: string;
  message: string;
  file_asset_id: string | null;
  status: RevisionStatus;
  lts_event_id: string | null;
  internal_note: string | null;
  client_name: string | null;
  whatsapp: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
};

export async function getAdminRevisions() {
  if (!isDatabaseConfigured()) return [] as AdminRevision[];

  try {
    const result = await dbQuery<AdminRevision>(`
      select
        revision_requests.*,
        file_assets.file_name,
        file_assets.mime_type,
        file_assets.file_size
      from revision_requests
      left join file_assets on file_assets.id = revision_requests.file_asset_id
      order by revision_requests.created_at desc
      limit 100
    `);
    return result.rows;
  } catch {
    return [] as AdminRevision[];
  }
}

export async function getAdminRevision(id: string) {
  if (!isDatabaseConfigured()) return null;

  const result = await dbQuery<AdminRevision>(
    `
      select
        revision_requests.*,
        file_assets.file_name,
        file_assets.mime_type,
        file_assets.file_size
      from revision_requests
      left join file_assets on file_assets.id = revision_requests.file_asset_id
      where revision_requests.id = $1
      limit 1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function getClientRevisionRequests(invoiceId: string) {
  if (!isDatabaseConfigured()) return [] as AdminRevision[];

  try {
    const result = await dbQuery<AdminRevision>(
      `
        select *
        from revision_requests
        where invoice_id = $1
        order by created_at desc
        limit 10
      `,
      [invoiceId]
    );
    return result.rows;
  } catch {
    return [] as AdminRevision[];
  }
}
