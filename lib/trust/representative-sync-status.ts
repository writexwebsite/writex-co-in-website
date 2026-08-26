import "server-only";

import { notConfigured } from "@/lib/api/response";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import {
  getNextRepresentativeSyncAt,
  REPRESENTATIVE_SYNC_TIMEZONE,
  REPRESENTATIVE_SYNC_TIME_LABEL
} from "@/lib/trust/representative-sync-schedule";

type RepresentativeSyncStatusRow = {
  last_attempted_at: Date | string | null;
  last_successful_at: Date | string | null;
  received: number;
  created: number;
  updated: number;
  deactivated: number;
  rejected: number;
  numbers_received: number;
  numbers_created: number;
  numbers_updated: number;
  numbers_deactivated: number;
  rejected_numbers: number;
  safe_failure_reason: string | null;
  active_representatives: number;
  active_numbers: number;
};

export type RepresentativeSyncStatus = {
  source: "LTS";
  activeRepresentatives: number;
  lastAttemptedAt: string | null;
  lastSuccessfulAt: string | null;
  counts: {
    received: number;
    created: number;
    updated: number;
    deactivated: number;
    rejected: number;
    numbersReceived: number;
    numbersCreated: number;
    numbersUpdated: number;
    numbersDeactivated: number;
    rejectedNumbers: number;
  };
  activeNumbers: number;
  safeFailureReason: string | null;
  automaticSync: {
    configured: boolean;
    timezone: typeof REPRESENTATIVE_SYNC_TIMEZONE;
    schedule: typeof REPRESENTATIVE_SYNC_TIME_LABEL;
    nextRunAt: string | null;
  };
};

function iso(value: Date | string | null) {
  return value ? new Date(value).toISOString() : null;
}

export async function getRepresentativeSyncStatus(
  now = new Date()
): Promise<RepresentativeSyncStatus> {
  if (!isDatabaseConfigured()) {
    throw notConfigured("Representative directory status is not configured.");
  }

  const result = await dbQuery<RepresentativeSyncStatusRow>(
    `
      select state.last_attempted_at,
             state.last_successful_at,
             coalesce(state.received, 0)::int as received,
             coalesce(state.created, 0)::int as created,
             coalesce(state.updated, 0)::int as updated,
             coalesce(state.deactivated, 0)::int as deactivated,
             coalesce(state.rejected, 0)::int as rejected,
             coalesce(state.numbers_received, 0)::int as numbers_received,
             coalesce(state.numbers_created, 0)::int as numbers_created,
             coalesce(state.numbers_updated, 0)::int as numbers_updated,
             coalesce(state.numbers_deactivated, 0)::int as numbers_deactivated,
             coalesce(state.rejected_numbers, 0)::int as rejected_numbers,
             state.safe_failure_reason,
             (
               select count(*)::int
               from official_representatives
               where source_system = 'lts'
                 and status = 'Active'
                 and is_publicly_verifiable = true
                 and deactivated_at is null
             ) as active_representatives
             ,
             (
               select count(*)::int
               from official_representative_numbers number
               inner join official_representatives representative
                 on representative.id = number.representative_id
               where number.status = 'Active'
                 and number.deactivated_at is null
                 and representative.status = 'Active'
                 and representative.is_publicly_verifiable = true
             ) as active_numbers
      from (select 1) seed
      left join representative_sync_state state
        on state.source_system = 'lts'
    `
  );

  const row = result.rows[0];
  const scheduleConfigured =
    process.env.REPRESENTATIVE_SYNC_SCHEDULE_ENABLED === "true";

  return {
    source: "LTS",
    activeRepresentatives: Number(row?.active_representatives ?? 0),
    activeNumbers: Number(row?.active_numbers ?? 0),
    lastAttemptedAt: iso(row?.last_attempted_at ?? null),
    lastSuccessfulAt: iso(row?.last_successful_at ?? null),
    counts: {
      received: Number(row?.received ?? 0),
      created: Number(row?.created ?? 0),
      updated: Number(row?.updated ?? 0),
      deactivated: Number(row?.deactivated ?? 0),
      rejected: Number(row?.rejected ?? 0),
      numbersReceived: Number(row?.numbers_received ?? 0),
      numbersCreated: Number(row?.numbers_created ?? 0),
      numbersUpdated: Number(row?.numbers_updated ?? 0),
      numbersDeactivated: Number(row?.numbers_deactivated ?? 0),
      rejectedNumbers: Number(row?.rejected_numbers ?? 0)
    },
    safeFailureReason: row?.safe_failure_reason ?? null,
    automaticSync: {
      configured: scheduleConfigured,
      timezone: REPRESENTATIVE_SYNC_TIMEZONE,
      schedule: REPRESENTATIVE_SYNC_TIME_LABEL,
      nextRunAt: getNextRepresentativeSyncAt(now, scheduleConfigured)
    }
  };
}
