import { z } from "zod";

const SOURCE_EMPLOYEE_ID_PATTERN = /^[A-Za-z0-9._-]{1,120}$/u;
const UNSAFE_DISPLAY_NAME_PATTERN = /[<>\u0000-\u001f\u007f]/u;
const MAX_DISPLAY_NAME_LENGTH = 100;

const displayNameSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => Array.from(value).length <= MAX_DISPLAY_NAME_LENGTH,
    `Display names must contain at most ${MAX_DISPLAY_NAME_LENGTH} characters.`
  )
  .refine(
    (value) => !UNSAFE_DISPLAY_NAME_PATTERN.test(value),
    "Display names must not contain markup or control characters."
  );

export type RepresentativeDisplayNameSource =
  | "manual_override"
  | "lts_public_display_name"
  | "management_mapping"
  | "lts_sales_display_name"
  | "full_name_fallback";

export class InvalidRepresentativeDisplayNameConfigError extends Error {
  constructor(message = "Representative display-name configuration is invalid.") {
    super(message);
    this.name = "InvalidRepresentativeDisplayNameConfigError";
  }
}

export function validateRepresentativeDisplayName(value: unknown) {
  const parsed = displayNameSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseRepresentativeDisplayNameMappings(rawValue?: string) {
  const mappings = new Map<string, string>();
  const raw = rawValue?.trim();
  if (!raw) return mappings;

  for (const entry of raw.split(/[;,\n]/u)) {
    const trimmedEntry = entry.trim();
    if (!trimmedEntry) continue;

    const separatorIndex = trimmedEntry.indexOf(":");
    if (separatorIndex < 1) {
      throw new InvalidRepresentativeDisplayNameConfigError();
    }

    const sourceEmployeeId = trimmedEntry.slice(0, separatorIndex).trim();
    const displayName = validateRepresentativeDisplayName(
      trimmedEntry.slice(separatorIndex + 1)
    );
    if (!SOURCE_EMPLOYEE_ID_PATTERN.test(sourceEmployeeId) || !displayName) {
      throw new InvalidRepresentativeDisplayNameConfigError();
    }
    if (mappings.has(sourceEmployeeId)) {
      throw new InvalidRepresentativeDisplayNameConfigError(
        `Duplicate display-name mapping for ${sourceEmployeeId}.`
      );
    }

    mappings.set(sourceEmployeeId, displayName);
  }

  return mappings;
}

export function resolveRepresentativeDisplayName({
  sourceEmployeeId,
  fullName,
  manualDisplayName,
  publicDisplayName,
  salesDisplayName,
  approvedMappings
}: {
  sourceEmployeeId: string;
  fullName: string;
  manualDisplayName?: string | null;
  publicDisplayName?: string | null;
  salesDisplayName?: string | null;
  approvedMappings: ReadonlyMap<string, string>;
}): { name: string; source: RepresentativeDisplayNameSource } {
  const manualName = validateRepresentativeDisplayName(manualDisplayName);
  if (manualName) {
    return { name: manualName, source: "manual_override" };
  }

  const mappedName = approvedMappings.get(sourceEmployeeId);
  if (mappedName) {
    return { name: mappedName, source: "management_mapping" };
  }

  const ltsPublicName = validateRepresentativeDisplayName(publicDisplayName);
  if (ltsPublicName) {
    return { name: ltsPublicName, source: "lts_public_display_name" };
  }

  const ltsSalesName = validateRepresentativeDisplayName(salesDisplayName);
  if (ltsSalesName) {
    return { name: ltsSalesName, source: "lts_sales_display_name" };
  }

  const fallbackName = validateRepresentativeDisplayName(fullName);
  if (!fallbackName) {
    throw new InvalidRepresentativeDisplayNameConfigError(
      "The source full name is not safe for public display."
    );
  }
  return { name: fallbackName, source: "full_name_fallback" };
}
