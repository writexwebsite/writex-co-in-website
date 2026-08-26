import { z } from "zod";
import { hashRepresentativeMobile } from "@/lib/trust/representative-hash";
import { mobileLastFour, normalizeIndianMobile } from "@/lib/trust/mobile";
import {
  resolveRepresentativeDisplayName,
  validateRepresentativeDisplayName,
  type RepresentativeDisplayNameSource
} from "@/lib/trust/representative-display-names";

const MAX_DIRECTORY_SIZE = 5_000;
const MAX_OFFICIAL_NUMBERS_PER_REPRESENTATIVE = 5;

export const APPROVED_LTS_REPRESENTATIVE_DEPARTMENTS = [
  "Sales",
  "Management"
] as const;

export const APPROVED_LTS_REPRESENTATIVE_DESIGNATIONS = [
  "Business Development Associate",
  "Business Development Executive",
  "Senior Business Development Executive",
  "Team Leader",
  "Team Manager",
  "Chief Executive Officer",
  "Director",
  "Founder"
] as const;

const approvedDepartments = new Map(
  APPROVED_LTS_REPRESENTATIVE_DEPARTMENTS.map((value) => [
    value.toLocaleLowerCase("en-IN"),
    value
  ])
);
const approvedDesignations = new Map(
  APPROVED_LTS_REPRESENTATIVE_DESIGNATIONS.map((value) => [
    value.toLocaleLowerCase("en-IN"),
    value
  ])
);

function approvedValue(
  value: string,
  allowlist: ReadonlyMap<string, string>
) {
  return allowlist.get(value.trim().toLocaleLowerCase("en-IN"));
}

const envelopeSchema = z.object({
  representatives: z.array(z.unknown()).max(MAX_DIRECTORY_SIZE),
  generatedAt: z.string().datetime()
});

const representativeSchema = z.object({
  sourceEmployeeId: z.string().trim().min(1).max(120),
  fullName: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .refine((value) => Boolean(validateRepresentativeDisplayName(value))),
  publicDisplayName: z
    .string()
    .nullable()
    .optional()
    .refine((value) => value == null || Boolean(validateRepresentativeDisplayName(value))),
  salesDisplayName: z
    .string()
    .nullable()
    .optional()
    .refine((value) => value == null || Boolean(validateRepresentativeDisplayName(value))),
  designation: z.string().trim().min(1).max(160),
  department: z.string().trim().min(1).max(160),
  officialMobile: z.string().trim().min(1).max(32).optional(),
  officialMobiles: z
    .array(z.string().trim().min(1).max(32))
    .min(1)
    .max(MAX_OFFICIAL_NUMBERS_PER_REPRESENTATIVE)
    .optional(),
  status: z.literal("Active"),
  updatedAt: z.string().datetime()
}).refine(
  (record) => Boolean(record.officialMobiles?.length || record.officialMobile),
  { message: "At least one official mobile number is required." }
);

export type LtsRepresentativeNumber = {
  normalizedMobileHash: string;
  mobileLastFour: string;
  sourcePhoneType: "primary_official" | "secondary_official";
  isPrimary: boolean;
};

export type LtsRepresentativeSyncRecord = {
  sourceEmployeeId: string;
  sourceFullName: string;
  ltsPublicDisplayName: string | null;
  publicDisplayName: string;
  publicDisplayNameSource: RepresentativeDisplayNameSource;
  designation: string;
  department: string;
  normalizedMobileHash: string;
  mobileLastFour: string;
  numbers: LtsRepresentativeNumber[];
  status: "Active";
};

export type ParsedLtsRepresentativeDirectory = {
  received: number;
  rejected: number;
  numbersReceived: number;
  rejectedNumbers: number;
  records: LtsRepresentativeSyncRecord[];
};

export function resolveSyncedRepresentativeDisplayName(
  record: LtsRepresentativeSyncRecord,
  manualDisplayName: string | null | undefined,
  approvedDisplayNames: ReadonlyMap<string, string>
) {
  const resolved = resolveRepresentativeDisplayName({
    sourceEmployeeId: record.sourceEmployeeId,
    fullName: record.sourceFullName,
    manualDisplayName,
    publicDisplayName: record.ltsPublicDisplayName,
    approvedMappings: approvedDisplayNames
  });

  return {
    ...record,
    publicDisplayName: resolved.name,
    publicDisplayNameSource: resolved.source
  };
}

export class InvalidLtsRepresentativeDirectoryError extends Error {
  constructor(message = "The LTS representative directory response is invalid.") {
    super(message);
    this.name = "InvalidLtsRepresentativeDirectoryError";
  }
}

export function parseLtsRepresentativeDirectory(
  value: unknown,
  hmacSecret: string,
  approvedDisplayNames: ReadonlyMap<string, string> = new Map()
): ParsedLtsRepresentativeDirectory {
  if (!hmacSecret) {
    throw new InvalidLtsRepresentativeDirectoryError(
      "Representative directory hashing is not configured."
    );
  }

  const envelope = envelopeSchema.safeParse(value);
  if (!envelope.success) throw new InvalidLtsRepresentativeDirectoryError();

  type Candidate = z.infer<typeof representativeSchema> & {
    normalizedMobiles: string[];
  };

  const candidates: Candidate[] = [];
  let rejected = 0;
  let numbersReceived = 0;
  let rejectedNumbers = 0;

  for (const item of envelope.data.representatives) {
    const parsed = representativeSchema.safeParse(item);
    if (!parsed.success) {
      rejected += 1;
      continue;
    }

    const rawOfficialMobiles = parsed.data.officialMobiles?.length
      ? parsed.data.officialMobiles
      : [parsed.data.officialMobile as string];
    numbersReceived += rawOfficialMobiles.length;

    const normalizedMobiles: string[] = [];
    const seenMobiles = new Set<string>();
    for (const rawMobile of rawOfficialMobiles) {
      const normalizedMobile = normalizeIndianMobile(rawMobile);
      if (!normalizedMobile) {
        rejectedNumbers += 1;
        continue;
      }
      if (seenMobiles.has(normalizedMobile)) continue;
      seenMobiles.add(normalizedMobile);
      normalizedMobiles.push(normalizedMobile);
    }

    const department = approvedValue(parsed.data.department, approvedDepartments);
    const designation = approvedValue(
      parsed.data.designation,
      approvedDesignations
    );
    if (!normalizedMobiles.length || !department || !designation) {
      rejected += 1;
      continue;
    }

    candidates.push({
      ...parsed.data,
      department,
      designation,
      normalizedMobiles
    });
  }

  const sourceIdCounts = new Map<string, number>();
  const mobileOwners = new Map<string, Set<string>>();
  for (const candidate of candidates) {
    sourceIdCounts.set(
      candidate.sourceEmployeeId,
      (sourceIdCounts.get(candidate.sourceEmployeeId) ?? 0) + 1
    );
    for (const normalizedMobile of candidate.normalizedMobiles) {
      const owners = mobileOwners.get(normalizedMobile) ?? new Set<string>();
      owners.add(candidate.sourceEmployeeId);
      mobileOwners.set(normalizedMobile, owners);
    }
  }

  const uniqueCandidates = candidates.flatMap((candidate) => {
    if ((sourceIdCounts.get(candidate.sourceEmployeeId) ?? 0) > 1) {
      rejected += 1;
      rejectedNumbers += candidate.normalizedMobiles.length;
      return [];
    }

    const uniqueMobiles = candidate.normalizedMobiles.filter(
      (normalizedMobile) => {
        const duplicated = (mobileOwners.get(normalizedMobile)?.size ?? 0) > 1;
        if (duplicated) rejectedNumbers += 1;
        return !duplicated;
      }
    );
    if (!uniqueMobiles.length) {
      rejected += 1;
      return [];
    }

    return [{ ...candidate, normalizedMobiles: uniqueMobiles }];
  });

  return {
    received: envelope.data.representatives.length,
    rejected,
    numbersReceived,
    rejectedNumbers,
    records: uniqueCandidates.map((candidate) => {
      const ltsPublicDisplayName =
        validateRepresentativeDisplayName(candidate.publicDisplayName) ||
        validateRepresentativeDisplayName(candidate.salesDisplayName);
      const resolvedName = resolveRepresentativeDisplayName({
        sourceEmployeeId: candidate.sourceEmployeeId,
        fullName: candidate.fullName,
        publicDisplayName: candidate.publicDisplayName,
        salesDisplayName: candidate.salesDisplayName,
        approvedMappings: approvedDisplayNames
      });
      const numbers = candidate.normalizedMobiles.map(
        (normalizedMobile, index): LtsRepresentativeNumber => ({
          normalizedMobileHash: hashRepresentativeMobile(
            normalizedMobile,
            hmacSecret
          ),
          mobileLastFour: mobileLastFour(normalizedMobile),
          sourcePhoneType:
            index === 0 ? "primary_official" : "secondary_official",
          isPrimary: index === 0
        })
      );

      return {
        sourceEmployeeId: candidate.sourceEmployeeId,
        sourceFullName: candidate.fullName,
        ltsPublicDisplayName,
        publicDisplayName: resolvedName.name,
        publicDisplayNameSource: resolvedName.source,
        designation: candidate.designation,
        department: candidate.department,
        normalizedMobileHash: numbers[0].normalizedMobileHash,
        mobileLastFour: numbers[0].mobileLastFour,
        numbers,
        status: "Active"
      };
    })
  };
}

export type ExistingLtsRepresentative = Omit<
  LtsRepresentativeSyncRecord,
  "status" | "numbers"
> & {
  status: string;
  isPubliclyVerifiable: boolean;
};

export function hasLtsRepresentativeChanged(
  existing: ExistingLtsRepresentative,
  incoming: LtsRepresentativeSyncRecord
) {
  return (
    existing.sourceFullName !== incoming.sourceFullName ||
    existing.ltsPublicDisplayName !== incoming.ltsPublicDisplayName ||
    existing.publicDisplayName !== incoming.publicDisplayName ||
    existing.publicDisplayNameSource !== incoming.publicDisplayNameSource ||
    existing.designation !== incoming.designation ||
    existing.department !== incoming.department ||
    existing.normalizedMobileHash !== incoming.normalizedMobileHash ||
    existing.mobileLastFour !== incoming.mobileLastFour ||
    existing.status !== "Active" ||
    !existing.isPubliclyVerifiable
  );
}

export function planLtsRepresentativeChanges(
  existingRecords: ExistingLtsRepresentative[],
  incomingRecords: LtsRepresentativeSyncRecord[]
) {
  const existingById = new Map(
    existingRecords.map((record) => [record.sourceEmployeeId, record])
  );
  const incomingIds = new Set(
    incomingRecords.map((record) => record.sourceEmployeeId)
  );

  let created = 0;
  let updated = 0;
  for (const incoming of incomingRecords) {
    const existing = existingById.get(incoming.sourceEmployeeId);
    if (!existing) created += 1;
    else if (hasLtsRepresentativeChanged(existing, incoming)) updated += 1;
  }

  return {
    created,
    updated,
    deactivateSourceEmployeeIds: existingRecords
      .filter(
        (record) =>
          !incomingIds.has(record.sourceEmployeeId) &&
          (record.status !== "Inactive" || record.isPubliclyVerifiable)
      )
      .map((record) => record.sourceEmployeeId)
  };
}
