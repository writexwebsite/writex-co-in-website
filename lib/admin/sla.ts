import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export type AdminSlaAlert = {
  id: string;
  entity_type: string;
  entity_id: string;
  alert_type: string;
  severity: string;
  status: string;
  message: string;
  recommended_action: string | null;
  sla_deadline: string | Date | null;
  breached_at: string | Date | null;
  created_at: string | Date;
  assigned_owner: string | null;
};

export async function getSlaAlerts({ status }: { status?: string } = {}) {
  if (!isDatabaseConfigured()) return [] as AdminSlaAlert[];

  const values: unknown[] = [];
  const where: string[] = [];
  if (status) {
    values.push(status);
    where.push(`sla_alerts.status = $${values.length}`);
  }

  const result = await dbQuery<AdminSlaAlert>(
    `
      select
        sla_alerts.id,
        sla_alerts.entity_type,
        sla_alerts.entity_id,
        sla_alerts.alert_type,
        sla_alerts.severity,
        sla_alerts.status,
        sla_alerts.message,
        sla_alerts.recommended_action,
        sla_alerts.sla_deadline,
        sla_alerts.breached_at,
        sla_alerts.created_at,
        admin_users.name as assigned_owner
      from sla_alerts
      left join admin_users on admin_users.id = sla_alerts.assigned_to_admin_user_id
      ${where.length ? `where ${where.join(" and ")}` : ""}
      order by
        case sla_alerts.severity
          when 'critical' then 1
          when 'breached' then 2
          when 'warning' then 3
          else 4
        end,
        sla_alerts.created_at desc
      limit 200
    `,
    values
  );

  return result.rows;
}
