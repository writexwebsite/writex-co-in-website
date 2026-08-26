import "server-only";

import { ApiError } from "@/lib/api/response";
import { dbQuery, withDatabaseAdvisoryLock } from "@/lib/db";
import {
  previewLtsRepresentatives,
  syncLtsRepresentatives
} from "@/lib/trust/lts-representative-sync";
import {
  safeLtsFailureReason,
  type LtsSyncFailureReason
} from "@/lib/trust/lts-representative-sync-policy";

const REPRESENTATIVE_SYNC_LOCK = "writex:lts-representative-sync:v1";

export type LtsRepresentativeSyncTrigger =
  | "manual_admin"
  | "scheduled"
  | "dry_run";

function failureReason(error: unknown): LtsSyncFailureReason {
  if (error instanceof ApiError && error.code === "NOT_CONFIGURED") {
    return "not_configured";
  }
  return safeLtsFailureReason(error);
}

async function recordAttempt(
  trigger: LtsRepresentativeSyncTrigger,
  dryRun: boolean
) {
  await dbQuery(
    `
      insert into representative_sync_state (
        source_system, last_attempted_at, last_trigger,
        last_run_was_dry_run, safe_failure_reason, updated_at
      )
      values ('lts', now(), $1, $2, null, now())
      on conflict (source_system) do update set
        last_attempted_at = excluded.last_attempted_at,
        last_trigger = excluded.last_trigger,
        last_run_was_dry_run = excluded.last_run_was_dry_run,
        safe_failure_reason = null,
        updated_at = now()
    `,
    [trigger, dryRun]
  );
}

async function recordSuccess(summary: {
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
}) {
  await dbQuery(
    `
      update representative_sync_state
      set last_successful_at = now(),
          received = $1,
          created = $2,
          updated = $3,
          deactivated = $4,
          rejected = $5,
          numbers_received = $6,
          numbers_created = $7,
          numbers_updated = $8,
          numbers_deactivated = $9,
          rejected_numbers = $10,
          safe_failure_reason = null,
          updated_at = now()
      where source_system = 'lts'
    `,
    [
      summary.received,
      summary.created,
      summary.updated,
      summary.deactivated,
      summary.rejected,
      summary.numbersReceived,
      summary.numbersCreated,
      summary.numbersUpdated,
      summary.numbersDeactivated,
      summary.rejectedNumbers
    ]
  );
}

async function recordFailure(reason: LtsSyncFailureReason) {
  await dbQuery(
    `
      update representative_sync_state
      set safe_failure_reason = $1,
          updated_at = now()
      where source_system = 'lts'
    `,
    [reason]
  );
}

export async function runLtsRepresentativeSyncJob({
  trigger,
  dryRun = false
}: {
  trigger: LtsRepresentativeSyncTrigger;
  dryRun?: boolean;
}) {
  const locked = await withDatabaseAdvisoryLock(
    REPRESENTATIVE_SYNC_LOCK,
    async () => {
      await recordAttempt(trigger, dryRun);
      try {
        if (dryRun) {
          const summary = await previewLtsRepresentatives();
          return { dryRun: true as const, ...summary };
        }

        const summary = await syncLtsRepresentatives();
        await recordSuccess(summary);
        return { dryRun: false as const, ...summary };
      } catch (error) {
        await recordFailure(failureReason(error));
        throw error;
      }
    }
  );

  if (!locked.acquired) {
    throw new ApiError(
      409,
      "INTEGRATION_UNAVAILABLE",
      "A representative synchronization is already in progress."
    );
  }

  return locked.value;
}
