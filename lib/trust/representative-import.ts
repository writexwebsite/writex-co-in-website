import "server-only";

import { ApiError, notConfigured } from "@/lib/api/response";
import { isDatabaseConfigured, withDbTransaction } from "@/lib/db";
import {
  parseRepresentativeWorkbook,
  type ParsedRepresentative,
  type RepresentativeImportErrorRow
} from "@/lib/trust/representative-import-parser";

type ExistingRepresentative = {
  source_employee_id: string;
  normalized_mobile_hash: string;
  full_name: string;
  designation: string;
  department: string;
  mobile_last_four: string;
  status: string;
  is_publicly_verifiable: boolean;
  source_system: string;
};

export type RepresentativeImportSummary = {
  importedCount: number;
  updatedCount: number;
  ignoredCount: number;
  duplicateCount: number;
  errorRows: RepresentativeImportErrorRow[];
};

function hasChanged(
  existing: ExistingRepresentative,
  incoming: ParsedRepresentative
) {
  return (
    existing.full_name !== incoming.fullName ||
    existing.designation !== incoming.designation ||
    existing.department !== incoming.department ||
    existing.normalized_mobile_hash !== incoming.normalizedMobileHash ||
    existing.mobile_last_four !== incoming.mobileLastFour ||
    existing.status !== "Active" ||
    !existing.is_publicly_verifiable ||
    existing.source_system !== incoming.sourceSystem
  );
}

export async function importRepresentativeWorkbook({
  buffer,
  allowEmptyDirectory = false
}: {
  buffer: Buffer;
  allowEmptyDirectory?: boolean;
}): Promise<RepresentativeImportSummary> {
  if (!isDatabaseConfigured()) {
    throw notConfigured("Representative import storage is not configured.");
  }

  const hmacSecret = process.env.REPRESENTATIVE_DIRECTORY_HMAC_SECRET;
  if (!hmacSecret) {
    throw notConfigured("Representative import security is not configured.");
  }

  const parsed = await parseRepresentativeWorkbook(buffer, hmacSecret);
  if (!parsed.representatives.length && !allowEmptyDirectory) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "No valid active representatives were found. Confirm an empty directory explicitly if every representative should be deactivated."
    );
  }

  const counts = await withDbTransaction(async (query) => {
    const existingRows = await query<ExistingRepresentative>(
      `
        select source_employee_id, normalized_mobile_hash, full_name, designation, department,
               mobile_last_four, status, is_publicly_verifiable, source_system
        from official_representatives
      `
    );
    const existingBySourceId = new Map(
      existingRows
        .filter((record) => record.source_system === "excel")
        .map((record) => [record.source_employee_id, record])
    );

    let importedCount = 0;
    let updatedCount = 0;
    for (const representative of parsed.representatives) {
      const existing = existingBySourceId.get(representative.employeeId);
      if (!existing) importedCount += 1;
      else if (hasChanged(existing, representative)) updatedCount += 1;
    }

    if (parsed.representatives.length) {
      await query(
        `
          insert into official_representatives (
            source_system, source_employee_id, full_name, source_full_name,
            public_display_name, public_display_name_source,
            public_display_name_updated_at, designation, department,
            normalized_mobile_hash, mobile_last_four, status,
            is_publicly_verifiable, last_source_sync_at, deactivated_at
          )
          select 'excel', item.source_employee_id, item.full_name, item.full_name,
                 item.full_name, 'full_name_fallback', now(), item.designation,
                 item.department, item.normalized_mobile_hash,
                 item.mobile_last_four, 'Active', true, now(), null
          from jsonb_to_recordset($1::jsonb) as item(
            source_employee_id text,
            full_name text,
            designation text,
            department text,
            normalized_mobile_hash text,
            mobile_last_four text
          )
          on conflict (source_system, source_employee_id) do update set
            full_name = excluded.full_name,
            source_full_name = excluded.source_full_name,
            public_display_name = excluded.public_display_name,
            public_display_name_source = excluded.public_display_name_source,
            designation = excluded.designation,
            department = excluded.department,
            normalized_mobile_hash = excluded.normalized_mobile_hash,
            mobile_last_four = excluded.mobile_last_four,
            status = 'Active',
            is_publicly_verifiable = true,
            last_source_sync_at = now(),
            deactivated_at = null
        `,
        [
          JSON.stringify(
            parsed.representatives.map((representative) => ({
              source_employee_id: representative.employeeId,
              full_name: representative.fullName,
              designation: representative.designation,
              department: representative.department,
              normalized_mobile_hash: representative.normalizedMobileHash,
              mobile_last_four: representative.mobileLastFour
            }))
          )
        ]
      );

      const importedNumbers = await query<{ id: string }>(
        `
          insert into official_representative_numbers (
            representative_id, normalized_mobile_hash, mobile_last_four,
            source_system, source_phone_type, status, is_primary,
            last_source_sync_at, deactivated_at
          )
          select representative.id, item.normalized_mobile_hash,
                 item.mobile_last_four, 'excel', 'primary_official',
                 'Active', true, now(), null
          from jsonb_to_recordset($1::jsonb) as item(
            source_employee_id text,
            normalized_mobile_hash text,
            mobile_last_four text
          )
          inner join official_representatives representative
            on representative.source_system = 'excel'
           and representative.source_employee_id = item.source_employee_id
          on conflict (normalized_mobile_hash) do update set
            mobile_last_four = excluded.mobile_last_four,
            source_system = 'excel',
            source_phone_type = 'primary_official',
            status = 'Active',
            is_primary = true,
            last_source_sync_at = now(),
            deactivated_at = null
          where official_representative_numbers.representative_id =
                excluded.representative_id
          returning id
        `,
        [
          JSON.stringify(
            parsed.representatives.map((representative) => ({
              source_employee_id: representative.employeeId,
              normalized_mobile_hash: representative.normalizedMobileHash,
              mobile_last_four: representative.mobileLastFour
            }))
          )
        ]
      );
      if (importedNumbers.length !== parsed.representatives.length) {
        throw new ApiError(
          409,
          "BAD_REQUEST",
          "An official number is already assigned to another representative."
        );
      }
    }

    const activeHashes = parsed.representatives.map(
      (representative) => representative.normalizedMobileHash
    );
    const deactivatedRows = await query<{ id: string }>(
      `
        update official_representatives
        set status = 'Inactive',
            is_publicly_verifiable = false,
            deactivated_at = now()
        where source_system = 'excel'
          and (status <> 'Inactive' or is_publicly_verifiable = true)
          and not (normalized_mobile_hash = any($1::text[]))
        returning id
      `,
      [activeHashes]
    );

    updatedCount += deactivatedRows.length;

    await query(
      `
        update official_representative_numbers number
        set status = 'Inactive',
            is_primary = false,
            deactivated_at = now(),
            last_source_sync_at = now()
        from official_representatives representative
        where number.representative_id = representative.id
          and representative.source_system = 'excel'
          and number.source_system = 'excel'
          and number.status = 'Active'
          and not (number.normalized_mobile_hash = any($1::text[]))
      `,
      [activeHashes]
    );

    return { importedCount, updatedCount };
  });

  return {
    ...counts,
    ignoredCount: parsed.ignoredCount,
    duplicateCount: parsed.duplicateCount,
    errorRows: parsed.errorRows
  };
}
