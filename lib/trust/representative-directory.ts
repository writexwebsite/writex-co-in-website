import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { hashRepresentativeMobile } from "@/lib/trust/representative-hash";
import {
  RepresentativeDirectoryUnavailableError,
  toPublicRepresentative,
  UnavailableRepresentativeDirectoryProvider,
  type DirectoryRecord,
  type RepresentativeDirectoryProvider
} from "@/lib/trust/representative-public";

export {
  RepresentativeDirectoryUnavailableError,
  UnavailableRepresentativeDirectoryProvider
} from "@/lib/trust/representative-public";

function hashMobile(normalizedMobile: string) {
  const secret = process.env.REPRESENTATIVE_DIRECTORY_HMAC_SECRET;
  if (!secret) throw new RepresentativeDirectoryUnavailableError();

  return hashRepresentativeMobile(normalizedMobile, secret);
}

export class DatabaseRepresentativeDirectoryProvider
  implements RepresentativeDirectoryProvider
{
  async verifyByMobile(normalizedMobile: string) {
    if (!isDatabaseConfigured()) {
      throw new RepresentativeDirectoryUnavailableError();
    }

    try {
      const result = await dbQuery<DirectoryRecord>(
        `
          select representative.full_name,
                 representative.source_full_name,
                 representative.public_display_name,
                 representative.designation,
                 representative.department,
                 representative.status,
                 representative.is_publicly_verifiable
          from official_representative_numbers number
          inner join official_representatives representative
            on representative.id = number.representative_id
          where number.normalized_mobile_hash = $1
            and number.status = 'Active'
            and number.deactivated_at is null
            and representative.status = 'Active'
            and representative.is_publicly_verifiable = true
            and representative.deactivated_at is null
          order by
            case representative.source_system
              when 'lts' then 0
              when 'excel' then 1
              else 2
            end,
            number.is_primary desc,
            representative.updated_at desc
          limit 1
        `,
        [hashMobile(normalizedMobile)]
      );

      return result.rows[0] ? toPublicRepresentative(result.rows[0]) : null;
    } catch {
      throw new RepresentativeDirectoryUnavailableError();
    }
  }
}

export function getRepresentativeDirectoryProvider() {
  const legacyMode = process.env.REPRESENTATIVE_DIRECTORY_MODE;
  const source =
    process.env.REPRESENTATIVE_DIRECTORY_SOURCE ||
    (legacyMode === "database" ? "excel" : legacyMode) ||
    "unavailable";

  if (source === "lts" || source === "excel" || source === "database") {
    return new DatabaseRepresentativeDirectoryProvider();
  }

  return new UnavailableRepresentativeDirectoryProvider();
}
