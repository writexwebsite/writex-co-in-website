import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";

type LeadAutoAssignmentInput = {
  id: string;
};

export async function assignLeadAutomatically(lead: LeadAutoAssignmentInput) {
  if (process.env.AUTO_ASSIGN_LEADS !== "true" || !isDatabaseConfigured()) {
    return null;
  }

  const users = await dbQuery<{ id: string }>(
    `
      select id
      from admin_users
      where is_active = true
        and role in ('super_admin', 'sales', 'support')
      order by coalesce(last_login_at, created_at) asc
      limit 1
    `
  );
  const owner = users.rows[0];

  if (!owner) return null;

  await dbQuery(
    `
      update quote_leads
      set assigned_to_admin_user_id = $2
      where id = $1
    `,
    [lead.id, owner.id]
  );
  await dbQuery(
    `
      insert into lead_activity_logs (lead_id, admin_user_id, activity_type, new_value)
      values ($1, $2, 'lead_assigned', $2)
    `,
    [lead.id, owner.id]
  );

  return owner.id;
}
