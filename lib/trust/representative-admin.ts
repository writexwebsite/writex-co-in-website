import "server-only";

import { ApiError, notConfigured } from "@/lib/api/response";
import { dbQuery, isDatabaseConfigured, withDbTransaction } from "@/lib/db";
import { hashRepresentativeMobile } from "@/lib/trust/representative-hash";
import { mobileLastFour, normalizeIndianMobile } from "@/lib/trust/mobile";
import {
  InvalidRepresentativeDisplayNameConfigError,
  parseRepresentativeDisplayNameMappings,
  resolveRepresentativeDisplayName,
  validateRepresentativeDisplayName,
  type RepresentativeDisplayNameSource
} from "@/lib/trust/representative-display-names";

export type AdminRepresentative = {
  id: string;
  sourceEmployeeId: string;
  sourceFullName: string;
  ltsPublicDisplayName: string | null;
  manualPublicDisplayName: string | null;
  publicDisplayName: string;
  displayNameSource: RepresentativeDisplayNameSource;
  designation: string;
  department: string;
  status: string;
  updatedAt: string;
  numbers: AdminRepresentativeNumber[];
};

export type AdminRepresentativeNumber = {
  id: string;
  maskedNumber: string;
  source: string;
  sourcePhoneType: string;
  status: string;
  isPrimary: boolean;
  updatedAt: string;
};

type AdminRepresentativeRow = {
  id: string;
  source_employee_id: string;
  full_name: string;
  source_full_name: string | null;
  lts_public_display_name: string | null;
  manual_public_display_name: string | null;
  public_display_name: string | null;
  public_display_name_source: RepresentativeDisplayNameSource | null;
  designation: string;
  department: string;
  status: string;
  updated_at: Date | string;
  official_numbers?: unknown;
};

type AdminRepresentativeNumberRow = {
  id: string;
  mobileLastFour: string;
  source: string;
  sourcePhoneType: string;
  status: string;
  isPrimary: boolean;
  updatedAt: string;
};

function toAdminRepresentativeNumber(
  row: AdminRepresentativeNumberRow
): AdminRepresentativeNumber {
  return {
    id: row.id,
    maskedNumber: `+91 •••••• ${row.mobileLastFour}`,
    source: row.source,
    sourcePhoneType: row.sourcePhoneType,
    status: row.status,
    isPrimary: row.isPrimary,
    updatedAt: new Date(row.updatedAt).toISOString()
  };
}

function parseAdminRepresentativeNumbers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Partial<AdminRepresentativeNumberRow>;
    if (
      typeof row.id !== "string" ||
      typeof row.mobileLastFour !== "string" ||
      !/^\d{4}$/.test(row.mobileLastFour) ||
      typeof row.source !== "string" ||
      typeof row.sourcePhoneType !== "string" ||
      typeof row.status !== "string" ||
      typeof row.isPrimary !== "boolean" ||
      typeof row.updatedAt !== "string"
    ) {
      return [];
    }
    return [toAdminRepresentativeNumber(row as AdminRepresentativeNumberRow)];
  });
}

function toAdminRepresentative(
  row: AdminRepresentativeRow
): AdminRepresentative {
  return {
    id: row.id,
    sourceEmployeeId: row.source_employee_id,
    sourceFullName: row.source_full_name || row.full_name,
    ltsPublicDisplayName: row.lts_public_display_name,
    manualPublicDisplayName: row.manual_public_display_name,
    publicDisplayName:
      row.public_display_name || row.source_full_name || row.full_name,
    displayNameSource:
      row.public_display_name_source || "full_name_fallback",
    designation: row.designation,
    department: row.department,
    status: row.status,
    updatedAt: new Date(row.updated_at).toISOString(),
    numbers: parseAdminRepresentativeNumbers(row.official_numbers)
  };
}

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

export function representativeDisplayNameSourceLabel(
  source: RepresentativeDisplayNameSource
) {
  if (source === "manual_override" || source === "management_mapping") {
    return "Manual Override";
  }
  if (
    source === "lts_public_display_name" ||
    source === "lts_sales_display_name"
  ) {
    return "LTS";
  }
  return "Fallback";
}

export async function listRepresentativesForAdmin() {
  if (!isDatabaseConfigured()) {
    throw notConfigured("Representative directory storage is not configured.");
  }

  const result = await dbQuery<AdminRepresentativeRow>(
    `
      select representative.id,
             representative.source_employee_id,
             representative.full_name,
             representative.source_full_name,
             representative.lts_public_display_name,
             representative.manual_public_display_name,
             representative.public_display_name,
             representative.public_display_name_source,
             representative.designation,
             representative.department,
             representative.status,
             representative.updated_at,
             coalesce(
               jsonb_agg(
                 jsonb_build_object(
                   'id', number.id,
                   'mobileLastFour', number.mobile_last_four,
                   'source', number.source_system,
                   'sourcePhoneType', number.source_phone_type,
                   'status', number.status,
                   'isPrimary', number.is_primary,
                   'updatedAt', number.updated_at
                 )
                 order by number.is_primary desc,
                          number.status asc,
                          number.created_at asc
               ) filter (where number.id is not null),
               '[]'::jsonb
             ) as official_numbers
      from official_representatives representative
      left join official_representative_numbers number
        on number.representative_id = representative.id
      group by representative.id
      order by case representative.status when 'Active' then 0 else 1 end,
               representative.public_display_name asc nulls last,
               representative.source_full_name asc nulls last
    `
  );

  return result.rows.map(toAdminRepresentative);
}

export async function updateRepresentativeDisplayNameOverride({
  representativeId,
  manualDisplayName
}: {
  representativeId: string;
  manualDisplayName: string | null;
}) {
  if (!isDatabaseConfigured()) {
    throw notConfigured("Representative directory storage is not configured.");
  }

  const validatedManualName =
    manualDisplayName === null
      ? null
      : validateRepresentativeDisplayName(manualDisplayName);
  if (manualDisplayName !== null && !validatedManualName) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "Enter a public display name between 1 and 100 characters without markup."
    );
  }

  return withDbTransaction(async (query) => {
    const rows = await query<AdminRepresentativeRow>(
      `
        select id, source_employee_id, full_name, source_full_name,
               lts_public_display_name, manual_public_display_name,
               public_display_name, public_display_name_source,
               designation, department, status, updated_at
        from official_representatives
        where id = $1
        for update
      `,
      [representativeId]
    );
    const current = rows[0];
    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Representative was not found.");
    }

    const resolved = resolveRepresentativeDisplayName({
      sourceEmployeeId: current.source_employee_id,
      fullName: current.source_full_name || current.full_name,
      manualDisplayName: validatedManualName,
      publicDisplayName: current.lts_public_display_name,
      approvedMappings: readApprovedDisplayNames()
    });

    const updated = await query<AdminRepresentativeRow>(
      `
        update official_representatives
        set manual_public_display_name = $2,
            manual_public_display_name_updated_at = case
              when $2::text is null then null
              else now()
            end,
            public_display_name = $3,
            public_display_name_source = $4,
            public_display_name_updated_at = now()
        where id = $1
        returning id, source_employee_id, full_name, source_full_name,
                  lts_public_display_name, manual_public_display_name,
                  public_display_name, public_display_name_source,
                  designation, department, status, updated_at
      `,
      [
        representativeId,
        validatedManualName,
        resolved.name,
        resolved.source
      ]
    );

    return {
      representative: toAdminRepresentative(updated[0]),
      previousPublicDisplayName:
        current.public_display_name ||
        current.source_full_name ||
        current.full_name,
      operation: validatedManualName ? "set" : "cleared"
    };
  });
}

function validateNumberChangeReason(reason: string) {
  const normalized = reason.trim();
  if (normalized.length < 10 || normalized.length > 500) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "Enter an approval reason between 10 and 500 characters."
    );
  }
  return normalized;
}

function representativeHashSecret() {
  const secret = process.env.REPRESENTATIVE_DIRECTORY_HMAC_SECRET;
  if (!secret) {
    throw notConfigured("Representative directory hashing is not configured.");
  }
  return secret;
}

function postgresErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code || "")
    : "";
}

export async function addApprovedRepresentativeNumber({
  representativeId,
  mobile,
  makePrimary,
  reason,
  adminUserId
}: {
  representativeId: string;
  mobile: string;
  makePrimary: boolean;
  reason: string;
  adminUserId: string;
}) {
  if (!isDatabaseConfigured()) {
    throw notConfigured("Representative directory storage is not configured.");
  }

  const normalizedMobile = normalizeIndianMobile(mobile);
  if (!normalizedMobile) {
    throw new ApiError(
      400,
      "BAD_REQUEST",
      "Enter one valid official Indian mobile number."
    );
  }
  const normalizedReason = validateNumberChangeReason(reason);
  const normalizedMobileHash = hashRepresentativeMobile(
    normalizedMobile,
    representativeHashSecret()
  );

  try {
    return await withDbTransaction(async (query) => {
      const representatives = await query<{ id: string; status: string }>(
        `
          select id, status
          from official_representatives
          where id = $1
          for update
        `,
        [representativeId]
      );
      const representative = representatives[0];
      if (!representative) {
        throw new ApiError(404, "NOT_FOUND", "Representative was not found.");
      }
      if (representative.status !== "Active") {
        throw new ApiError(
          409,
          "BAD_REQUEST",
          "Official numbers can only be added to an active representative."
        );
      }

      if (makePrimary) {
        await query(
          `
            update official_representative_numbers
            set is_primary = false,
                management_primary_override = false,
                updated_by_admin_id = $2
            where representative_id = $1
              and is_primary = true
          `,
          [representativeId, adminUserId]
        );
      }

      const rows = await query<{
        id: string;
        mobile_last_four: string;
        source_system: string;
        source_phone_type: string;
        status: string;
        is_primary: boolean;
        updated_at: Date | string;
      }>(
        `
          insert into official_representative_numbers (
            representative_id, normalized_mobile_hash, mobile_last_four,
            source_system, source_phone_type, status, is_primary,
            management_primary_override,
            created_by_admin_id, updated_by_admin_id
          )
          values (
            $1, $2, $3, 'website_manual', 'temporary_official',
            'Active', $4, $4, $5, $5
          )
          returning id, mobile_last_four, source_system, source_phone_type,
                    status, is_primary, updated_at
        `,
        [
          representativeId,
          normalizedMobileHash,
          mobileLastFour(normalizedMobile),
          makePrimary,
          adminUserId
        ]
      );
      const created = rows[0];

      await query(
        `
          insert into official_representative_number_audit (
            representative_id, representative_number_id, actor_admin_id,
            action, reason, metadata
          )
          values (
            $1, $2, $3, 'added', $4,
            jsonb_build_object(
              'source', 'website_manual',
              'sourcePhoneType', 'temporary_official',
              'mobileLastFour', $5,
              'isPrimary', $6
            )
          )
        `,
        [
          representativeId,
          created.id,
          adminUserId,
          normalizedReason,
          created.mobile_last_four,
          created.is_primary
        ]
      );

      return toAdminRepresentativeNumber({
        id: created.id,
        mobileLastFour: created.mobile_last_four,
        source: created.source_system,
        sourcePhoneType: created.source_phone_type,
        status: created.status,
        isPrimary: created.is_primary,
        updatedAt: new Date(created.updated_at).toISOString()
      });
    });
  } catch (error) {
    if (postgresErrorCode(error) === "23505") {
      throw new ApiError(
        409,
        "BAD_REQUEST",
        "That official number is already assigned to a representative."
      );
    }
    throw error;
  }
}

export type RepresentativeNumberAction =
  | "activate"
  | "deactivate"
  | "make_primary"
  | "revoke";

export async function updateApprovedRepresentativeNumber({
  representativeId,
  representativeNumberId,
  action,
  reason,
  adminUserId
}: {
  representativeId: string;
  representativeNumberId: string;
  action: RepresentativeNumberAction;
  reason: string;
  adminUserId: string;
}) {
  if (!isDatabaseConfigured()) {
    throw notConfigured("Representative directory storage is not configured.");
  }
  const normalizedReason = validateNumberChangeReason(reason);

  return withDbTransaction(async (query) => {
    const rows = await query<{
      id: string;
      mobile_last_four: string;
      source_system: string;
      source_phone_type: string;
      status: string;
      is_primary: boolean;
      updated_at: Date | string;
    }>(
      `
        select id, mobile_last_four, source_system, source_phone_type,
               status, is_primary, updated_at
        from official_representative_numbers
        where id = $1
          and representative_id = $2
        for update
      `,
      [representativeNumberId, representativeId]
    );
    const current = rows[0];
    if (!current) {
      throw new ApiError(
        404,
        "NOT_FOUND",
        "Representative number was not found."
      );
    }

    if (action === "make_primary" && current.status !== "Active") {
      throw new ApiError(
        409,
        "BAD_REQUEST",
        "Only an active official number can be marked primary."
      );
    }

    if (action === "make_primary") {
      await query(
        `
          update official_representative_numbers
          set is_primary = false,
              management_primary_override = false,
              updated_by_admin_id = $2
          where representative_id = $1
            and is_primary = true
        `,
        [representativeId, adminUserId]
      );
    }

    const nextStatus =
      action === "activate"
        ? "Active"
        : action === "deactivate"
          ? "Inactive"
          : action === "revoke"
            ? "Revoked"
            : current.status;
    const updated = await query<{
      id: string;
      mobile_last_four: string;
      source_system: string;
      source_phone_type: string;
      status: string;
      is_primary: boolean;
      updated_at: Date | string;
    }>(
      `
        update official_representative_numbers
        set status = $3,
            management_status_override = case
              when $4 = 'activate' then 'Active'
              when $4 = 'deactivate' then 'Inactive'
              when $4 = 'revoke' then 'Revoked'
              else management_status_override
            end,
            is_primary = case
              when $4 = 'make_primary' then true
              when $4 = 'activate' then coalesce(
                management_primary_override,
                is_primary
              )
              when $4 in ('deactivate', 'revoke') then false
              else is_primary
            end,
            management_primary_override = case
              when $4 = 'make_primary' then true
              else management_primary_override
            end,
            deactivated_at = case
              when $4 = 'activate' then null
              when $4 in ('deactivate', 'revoke') then now()
              else deactivated_at
            end,
            updated_by_admin_id = $5
        where id = $1
          and representative_id = $2
        returning id, mobile_last_four, source_system, source_phone_type,
                  status, is_primary, updated_at
      `,
      [
        representativeNumberId,
        representativeId,
        nextStatus,
        action,
        adminUserId
      ]
    );
    const changed = updated[0];
    const auditAction =
      action === "make_primary" ? "made_primary" : `${action}d`;

    await query(
      `
        insert into official_representative_number_audit (
          representative_id, representative_number_id, actor_admin_id,
          action, reason, metadata
        )
        values (
          $1, $2, $3, $4, $5,
          jsonb_build_object(
            'source', $6::text,
            'sourcePhoneType', $7::text,
            'mobileLastFour', $8::text,
            'previousStatus', $9::text,
            'newStatus', $10::text,
            'isPrimary', $11::boolean
          )
        )
      `,
      [
        representativeId,
        representativeNumberId,
        adminUserId,
        auditAction,
        normalizedReason,
        changed.source_system,
        changed.source_phone_type,
        changed.mobile_last_four,
        current.status,
        changed.status,
        changed.is_primary
      ]
    );

    return toAdminRepresentativeNumber({
      id: changed.id,
      mobileLastFour: changed.mobile_last_four,
      source: changed.source_system,
      sourcePhoneType: changed.source_phone_type,
      status: changed.status,
      isPrimary: changed.is_primary,
      updatedAt: new Date(changed.updated_at).toISOString()
    });
  });
}
