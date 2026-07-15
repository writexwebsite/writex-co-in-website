import "server-only";

import { dbQuery } from "@/lib/db";

export async function logLeadActivity({
  leadId,
  adminUserId,
  activityType,
  note,
  oldValue,
  newValue,
  metadata
}: {
  leadId: string;
  adminUserId?: string | null;
  activityType: string;
  note?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  await dbQuery(
    `
      insert into lead_activity_logs (
        lead_id,
        admin_user_id,
        activity_type,
        note,
        old_value,
        new_value,
        metadata
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      leadId,
      adminUserId ?? null,
      activityType,
      note ?? null,
      oldValue ?? null,
      newValue ?? null,
      metadata ? JSON.stringify(metadata) : null
    ]
  );
}
