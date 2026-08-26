import "server-only";

import { randomUUID } from "crypto";
import { ApiError, notConfigured } from "@/lib/api/response";
import { isDatabaseConfigured, withDbTransaction } from "@/lib/db";
import {
  planLtsRepresentativeChanges,
  resolveSyncedRepresentativeDisplayName,
  type ExistingLtsRepresentative,
  type LtsRepresentativeSyncRecord
} from "@/lib/trust/lts-representative-records";
import {
  synchronizeLtsRepresentativeDirectory,
  type LtsRepresentativeProvider,
  type LtsRepresentativeRepository
} from "@/lib/trust/lts-representative-sync-core";
import { readLtsTrustCentreConfig } from "@/lib/trust/lts-endpoint-config";
import {
  InvalidRepresentativeDisplayNameConfigError,
  parseRepresentativeDisplayNameMappings
} from "@/lib/trust/representative-display-names";
import {
  executeWithSingleTransientRetry,
  ltsFailureForHttpStatus,
  LtsRepresentativeSyncUnavailableError
} from "@/lib/trust/lts-representative-sync-policy";

function readApprovedDisplayNames() {
  try {
    return parseRepresentativeDisplayNameMappings(
      process.env.WRITEX_REPRESENTATIVE_DISPLAY_NAMES
    );
  } catch (error) {
    if (error instanceof InvalidRepresentativeDisplayNameConfigError) {
      throw notConfigured("Representative display-name mapping is invalid.");
    }
    throw error;
  }
}

function assertLtsSyncConfiguration() {
  const source = process.env.REPRESENTATIVE_DIRECTORY_SOURCE || "unavailable";
  if (source !== "lts") {
    throw new ApiError(
      409,
      "INTEGRATION_UNAVAILABLE",
      "LTS representative synchronization is not enabled."
    );
  }

  const hmacSecret = process.env.REPRESENTATIVE_DIRECTORY_HMAC_SECRET;
  if (!hmacSecret) {
    throw notConfigured("Representative directory hashing is not configured.");
  }

  return { hmacSecret, approvedDisplayNames: readApprovedDisplayNames() };
}

export class LtsRepresentativeSyncProvider implements LtsRepresentativeProvider {
  async fetchDirectoryOnce() {
    const config = readLtsTrustCentreConfig(process.env);
    if (!config) {
      throw notConfigured("LTS representative synchronization is not configured.");
    }

    let representativesEndpoint: URL;
    let healthEndpoint: URL;
    try {
      representativesEndpoint = new URL(config.representatives.url);
      healthEndpoint = new URL(config.health.url);
    } catch {
      throw notConfigured("LTS representative synchronization is not configured.");
    }

    if (
      process.env.NODE_ENV === "production" &&
      (representativesEndpoint.protocol !== "https:" ||
        healthEndpoint.protocol !== "https:")
    ) {
      throw notConfigured("LTS representative synchronization requires HTTPS.");
    }

    const request = async (endpoint: URL, apiKey: string) => {
      try {
        return await fetch(endpoint, {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-correlation-id": randomUUID(),
            [config.headerName]: apiKey
          },
          cache: "no-store",
          signal: AbortSignal.timeout(config.timeoutMs)
        });
      } catch (error) {
        const reason =
          error instanceof Error &&
          (error.name === "AbortError" || error.name === "TimeoutError")
            ? "timeout"
            : "network_error";
        throw new LtsRepresentativeSyncUnavailableError(reason, true);
      }
    };

    try {
      const healthResponse = await request(healthEndpoint, config.health.apiKey);
      if (!healthResponse.ok) throw ltsFailureForHttpStatus(healthResponse.status);

      const response = await request(
        representativesEndpoint,
        config.representatives.apiKey
      );

      if (!response.ok) throw ltsFailureForHttpStatus(response.status);
      try {
        return await response.json();
      } catch {
        throw new LtsRepresentativeSyncUnavailableError(
          "malformed_response",
          false
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof LtsRepresentativeSyncUnavailableError) throw error;
      throw new LtsRepresentativeSyncUnavailableError();
    }
  }

  async fetchDirectory() {
    return executeWithSingleTransientRetry(() => this.fetchDirectoryOnce());
  }
}

type DbRepresentative = {
  id?: string;
  source_employee_id: string;
  full_name: string;
  source_full_name: string | null;
  lts_public_display_name: string | null;
  manual_public_display_name: string | null;
  public_display_name: string | null;
  public_display_name_source: string | null;
  designation: string;
  department: string;
  normalized_mobile_hash: string;
  mobile_last_four: string;
  status: string;
  is_publicly_verifiable: boolean;
};

type DbRepresentativeNumber = {
  id: string;
  representative_id: string;
  normalized_mobile_hash: string;
  source_system: string;
  source_phone_type: string;
  status: string;
  is_primary: boolean;
  management_status_override: string | null;
  management_primary_override: boolean | null;
  deactivated_at: Date | string | null;
};

function toExisting(record: DbRepresentative): ExistingLtsRepresentative {
  return {
    sourceEmployeeId: record.source_employee_id,
    sourceFullName: record.source_full_name || record.full_name,
    ltsPublicDisplayName: record.lts_public_display_name,
    publicDisplayName:
      record.public_display_name || record.source_full_name || record.full_name,
    publicDisplayNameSource:
      (record.public_display_name_source ||
        "full_name_fallback") as ExistingLtsRepresentative["publicDisplayNameSource"],
    designation: record.designation,
    department: record.department,
    normalizedMobileHash: record.normalized_mobile_hash,
    mobileLastFour: record.mobile_last_four,
    status: record.status,
    isPubliclyVerifiable: record.is_publicly_verifiable
  };
}

export class PostgresLtsRepresentativeRepository
  implements LtsRepresentativeRepository
{
  async synchronize(records: LtsRepresentativeSyncRecord[], syncedAt: Date) {
    if (!isDatabaseConfigured()) {
      throw notConfigured("Representative directory storage is not configured.");
    }

    return withDbTransaction(async (query) => {
      const existingRows = await query<DbRepresentative>(
        `
          select source_employee_id, full_name, source_full_name,
                 lts_public_display_name, manual_public_display_name,
                 public_display_name, public_display_name_source,
                 designation, department,
                 normalized_mobile_hash, mobile_last_four, status,
                 is_publicly_verifiable
          from official_representatives
          where source_system = 'lts'
        `
      );
      const existingBySourceId = new Map(
        existingRows.map((record) => [record.source_employee_id, record])
      );
      const approvedDisplayNames = readApprovedDisplayNames();
      const resolvedRecords = records.map((record) =>
        resolveSyncedRepresentativeDisplayName(
          record,
          existingBySourceId.get(record.sourceEmployeeId)
            ?.manual_public_display_name,
          approvedDisplayNames
        )
      );
      const plan = planLtsRepresentativeChanges(
        existingRows.map(toExisting),
        resolvedRecords
      );

      await query(
        `
          insert into official_representatives (
            source_system, source_employee_id, full_name, source_full_name,
            lts_public_display_name,
            public_display_name, public_display_name_source,
            public_display_name_updated_at, designation,
            department, normalized_mobile_hash, mobile_last_four, status,
            is_publicly_verifiable, last_source_sync_at, deactivated_at
          )
          select 'lts', item.source_employee_id, item.source_full_name,
                 item.source_full_name, item.lts_public_display_name,
                 item.public_display_name,
                 item.public_display_name_source, $2::timestamptz,
                 item.designation, item.department,
                 item.normalized_mobile_hash, item.mobile_last_four,
                 'Active', true, $2::timestamptz, null
          from jsonb_to_recordset($1::jsonb) as item(
            source_employee_id text,
            source_full_name text,
            lts_public_display_name text,
            public_display_name text,
            public_display_name_source text,
            designation text,
            department text,
            normalized_mobile_hash text,
            mobile_last_four text
          )
          on conflict (source_system, source_employee_id) do update set
            full_name = excluded.source_full_name,
            source_full_name = excluded.source_full_name,
            lts_public_display_name = excluded.lts_public_display_name,
            public_display_name = excluded.public_display_name,
            public_display_name_source = excluded.public_display_name_source,
            public_display_name_updated_at = case
              when official_representatives.public_display_name is distinct from excluded.public_display_name
                or official_representatives.public_display_name_source is distinct from excluded.public_display_name_source
              then excluded.public_display_name_updated_at
              else official_representatives.public_display_name_updated_at
            end,
            designation = excluded.designation,
            department = excluded.department,
            normalized_mobile_hash = excluded.normalized_mobile_hash,
            mobile_last_four = excluded.mobile_last_four,
            status = 'Active',
            is_publicly_verifiable = true,
            last_source_sync_at = excluded.last_source_sync_at,
            deactivated_at = null
        `,
        [
          JSON.stringify(
            resolvedRecords.map((record) => ({
              source_employee_id: record.sourceEmployeeId,
              source_full_name: record.sourceFullName,
              lts_public_display_name: record.ltsPublicDisplayName,
              public_display_name: record.publicDisplayName,
              public_display_name_source: record.publicDisplayNameSource,
              designation: record.designation,
              department: record.department,
              normalized_mobile_hash: record.normalizedMobileHash,
              mobile_last_four: record.mobileLastFour
            }))
          ),
          syncedAt.toISOString()
        ]
      );

      const representativeRows = await query<{
        id: string;
        source_employee_id: string;
      }>(
        `
          select id, source_employee_id
          from official_representatives
          where source_system = 'lts'
            and source_employee_id = any($1::text[])
        `,
        [resolvedRecords.map((record) => record.sourceEmployeeId)]
      );
      const representativeIds = new Map(
        representativeRows.map((row) => [row.source_employee_id, row.id])
      );

      const incomingNumbers = resolvedRecords.flatMap((record) => {
        const representativeId = representativeIds.get(record.sourceEmployeeId);
        if (!representativeId) return [];
        return record.numbers.map((number) => ({
          representativeId,
          sourceEmployeeId: record.sourceEmployeeId,
          ...number
        }));
      });
      const incomingHashes = incomingNumbers.map(
        (number) => number.normalizedMobileHash
      );
      const existingNumberRows =
        incomingHashes.length || representativeRows.length
        ? await query<DbRepresentativeNumber>(
            `
              select id, representative_id, normalized_mobile_hash,
                     source_system, source_phone_type, status, is_primary,
                     management_status_override,
                     management_primary_override,
                     deactivated_at
              from official_representative_numbers
              where normalized_mobile_hash = any($1::text[])
                 or representative_id = any($2::uuid[])
            `,
            [
              incomingHashes,
              representativeRows.map((row) => row.id)
            ]
          )
        : [];
      const existingNumberByHash = new Map(
        existingNumberRows.map((number) => [
          number.normalized_mobile_hash,
          number
        ])
      );

      let rejectedNumbers = 0;
      const representativesWithPrimaryOverride = new Set(
        existingNumberRows
          .filter(
            (number) =>
              number.management_primary_override === true &&
              number.status === "Active" &&
              number.deactivated_at === null
          )
          .map((number) => number.representative_id)
      );
      const allowedNumbers = incomingNumbers
        .filter((number) => {
          const existing = existingNumberByHash.get(
            number.normalizedMobileHash
          );
          const allowed =
            !existing || existing.representative_id === number.representativeId;
          if (!allowed) rejectedNumbers += 1;
          return allowed;
        })
        .map((number) => {
          const existing = existingNumberByHash.get(
            number.normalizedMobileHash
          );
          return {
            ...number,
            isPrimary: representativesWithPrimaryOverride.has(
              number.representativeId
            )
              ? existing?.management_primary_override === true
              : number.isPrimary
          };
        });

      let numbersCreated = 0;
      let numbersUpdated = 0;
      for (const number of allowedNumbers) {
        const existing = existingNumberByHash.get(
          number.normalizedMobileHash
        );
        if (!existing) {
          numbersCreated += 1;
          continue;
        }
        const desiredStatus =
          existing.management_status_override || "Active";
        if (
          existing.source_system !== "lts" ||
          existing.source_phone_type !== number.sourcePhoneType ||
          existing.status !== desiredStatus ||
          existing.is_primary !== number.isPrimary ||
          (desiredStatus === "Active"
            ? existing.deactivated_at !== null
            : existing.deactivated_at === null)
        ) {
          numbersUpdated += 1;
        }
      }

      for (const record of resolvedRecords) {
        const representativeId = representativeIds.get(record.sourceEmployeeId);
        if (!representativeId) continue;
        const primary = allowedNumbers.find(
          (number) =>
            number.representativeId === representativeId && number.isPrimary
        );
        if (primary) {
          await query(
            `
              update official_representative_numbers
              set is_primary = false,
                  updated_at = now()
              where representative_id = $1
                and is_primary = true
                and normalized_mobile_hash <> $2
            `,
            [representativeId, primary.normalizedMobileHash]
          );
        }
      }

      for (const number of allowedNumbers) {
        await query(
          `
            insert into official_representative_numbers (
              representative_id, normalized_mobile_hash, mobile_last_four,
              source_system, source_phone_type, status, is_primary,
              last_source_sync_at, deactivated_at
            )
            values ($1, $2, $3, 'lts', $4, 'Active', $5, $6, null)
            on conflict (normalized_mobile_hash) do update set
              mobile_last_four = excluded.mobile_last_four,
              source_system = 'lts',
              source_phone_type = excluded.source_phone_type,
              status = coalesce(
                official_representative_numbers.management_status_override,
                'Active'
              ),
              is_primary = coalesce(
                official_representative_numbers.management_primary_override,
                excluded.is_primary
              ),
              last_source_sync_at = excluded.last_source_sync_at,
              deactivated_at = case
                when coalesce(
                  official_representative_numbers.management_status_override,
                  'Active'
                ) = 'Active'
                then null
                else coalesce(
                  official_representative_numbers.deactivated_at,
                  now()
                )
              end
            where official_representative_numbers.representative_id =
                  excluded.representative_id
          `,
          [
            number.representativeId,
            number.normalizedMobileHash,
            number.mobileLastFour,
            number.sourcePhoneType,
            number.isPrimary,
            syncedAt.toISOString()
          ]
        );
      }

      let numbersDeactivated = 0;
      for (const record of resolvedRecords) {
        const representativeId = representativeIds.get(record.sourceEmployeeId);
        if (!representativeId) continue;
        const activeHashes = allowedNumbers
          .filter((number) => number.representativeId === representativeId)
          .map((number) => number.normalizedMobileHash);
        const removedRows = await query<{ id: string }>(
          `
            update official_representative_numbers
            set status = 'Inactive',
                is_primary = false,
                deactivated_at = now(),
                last_source_sync_at = $2::timestamptz
            where representative_id = $1
              and source_system = 'lts'
              and status = 'Active'
              and not (normalized_mobile_hash = any($3::text[]))
            returning id
          `,
          [representativeId, syncedAt.toISOString(), activeHashes]
        );
        numbersDeactivated += removedRows.length;
      }

      const sourceIds = records.map((record) => record.sourceEmployeeId);
      const deactivatedRows = await query<{ id: string }>(
        `
          update official_representatives
          set status = 'Inactive',
              is_publicly_verifiable = false,
              deactivated_at = now(),
              last_source_sync_at = $2::timestamptz
          where source_system = 'lts'
            and (status <> 'Inactive' or is_publicly_verifiable = true)
            and not (source_employee_id = any($1::text[]))
          returning id
        `,
        [sourceIds, syncedAt.toISOString()]
      );

      if (deactivatedRows.length) {
        const deactivatedNumberRows = await query<{ id: string }>(
          `
            update official_representative_numbers
            set status = 'Inactive',
                is_primary = false,
                deactivated_at = now(),
                last_source_sync_at = $2::timestamptz
            where representative_id = any($1::uuid[])
              and status = 'Active'
            returning id
          `,
          [
            deactivatedRows.map((row) => row.id),
            syncedAt.toISOString()
          ]
        );
        numbersDeactivated += deactivatedNumberRows.length;
      }

      return {
        created: plan.created,
        updated: plan.updated,
        deactivated: deactivatedRows.length,
        numbersCreated,
        numbersUpdated,
        numbersDeactivated,
        rejectedNumbers
      };
    });
  }
}

export async function syncLtsRepresentatives() {
  const { hmacSecret, approvedDisplayNames } = assertLtsSyncConfiguration();

  const summary = await synchronizeLtsRepresentativeDirectory({
    provider: new LtsRepresentativeSyncProvider(),
    repository: new PostgresLtsRepresentativeRepository(),
    hmacSecret,
    approvedDisplayNames
  });

  return { ...summary, displayNameMappingCount: approvedDisplayNames.size };
}

export async function previewLtsRepresentatives() {
  const { hmacSecret, approvedDisplayNames } = assertLtsSyncConfiguration();
  let accepted = 0;
  const summary = await synchronizeLtsRepresentativeDirectory({
    provider: new LtsRepresentativeSyncProvider(),
    repository: {
      async synchronize(records) {
        accepted = records.length;
        return {
          created: 0,
          updated: 0,
          deactivated: 0,
          numbersCreated: 0,
          numbersUpdated: 0,
          numbersDeactivated: 0,
          rejectedNumbers: 0
        };
      }
    },
    hmacSecret,
    approvedDisplayNames
  });

  return {
    received: summary.received,
    accepted,
    rejected: summary.rejected,
    displayNameMappingCount: approvedDisplayNames.size
  };
}
