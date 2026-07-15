import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export type AdminAuditLog = {
  id: string;
  actor_type: string;
  actor_email: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  metadata: unknown;
  ip_address: string | null;
  created_at: string | Date;
};

export async function getAuditLogs({ limit = 100 }: { limit?: number } = {}) {
  if (!isDatabaseConfigured()) return [] as AdminAuditLog[];

  try {
    const result = await dbQuery<AdminAuditLog>(
      `
        select id, actor_type, actor_email, entity_type, entity_id, action, metadata, ip_address, created_at
        from audit_logs
        order by created_at desc
        limit $1
      `,
      [Math.min(Math.max(limit, 1), 200)]
    );
    return result.rows;
  } catch {
    return [] as AdminAuditLog[];
  }
}

export type AdminIntegrationLog = {
  id: string;
  system: string;
  endpoint: string;
  request_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string | Date;
};

export async function getIntegrationLogs({ limit = 100 }: { limit?: number } = {}) {
  if (!isDatabaseConfigured()) return [] as AdminIntegrationLog[];

  try {
    const result = await dbQuery<AdminIntegrationLog>(
      `
        select id, system, endpoint, request_id, status, error_message, created_at
        from integration_logs
        order by created_at desc
        limit $1
      `,
      [Math.min(Math.max(limit, 1), 200)]
    );
    return result.rows;
  } catch {
    return [] as AdminIntegrationLog[];
  }
}
