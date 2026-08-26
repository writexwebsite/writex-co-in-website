export type PublicRepresentative = {
  name: string;
  designation: string;
  department: string;
  status: "Active";
};

export interface RepresentativeDirectoryProvider {
  verifyByMobile(normalizedMobile: string): Promise<PublicRepresentative | null>;
}

export class RepresentativeDirectoryUnavailableError extends Error {
  constructor() {
    super("Representative directory is unavailable.");
    this.name = "RepresentativeDirectoryUnavailableError";
  }
}

export type DirectoryRecord = {
  full_name: string;
  source_full_name?: string | null;
  public_display_name?: string | null;
  designation: string;
  department: string;
  status: string;
  is_publicly_verifiable: boolean;
};

export function toPublicRepresentative(record: DirectoryRecord) {
  if (record.status !== "Active" || !record.is_publicly_verifiable) return null;

  return {
    name:
      record.public_display_name?.trim() ||
      record.source_full_name?.trim() ||
      record.full_name,
    designation: record.designation,
    department: record.department,
    status: "Active" as const
  };
}

export class UnavailableRepresentativeDirectoryProvider
  implements RepresentativeDirectoryProvider
{
  async verifyByMobile(
    normalizedMobile: string
  ): Promise<PublicRepresentative | null> {
    void normalizedMobile;
    throw new RepresentativeDirectoryUnavailableError();
  }
}
