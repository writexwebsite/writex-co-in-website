import {
  InvalidLtsRepresentativeDirectoryError,
  parseLtsRepresentativeDirectory,
  type LtsRepresentativeSyncRecord
} from "@/lib/trust/lts-representative-records";
import { LtsRepresentativeSyncUnavailableError } from "@/lib/trust/lts-representative-sync-policy";

export { LtsRepresentativeSyncUnavailableError } from "@/lib/trust/lts-representative-sync-policy";

export type LtsRepresentativeSyncSummary = {
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

export interface LtsRepresentativeProvider {
  fetchDirectory(): Promise<unknown>;
}

export interface LtsRepresentativeRepository {
  synchronize(
    records: LtsRepresentativeSyncRecord[],
    syncedAt: Date
  ): Promise<
    Pick<
      LtsRepresentativeSyncSummary,
      | "created"
      | "updated"
      | "deactivated"
      | "numbersCreated"
      | "numbersUpdated"
      | "numbersDeactivated"
      | "rejectedNumbers"
    >
  >;
}

export async function synchronizeLtsRepresentativeDirectory({
  provider,
  repository,
  hmacSecret,
  approvedDisplayNames = new Map(),
  now = () => new Date()
}: {
  provider: LtsRepresentativeProvider;
  repository: LtsRepresentativeRepository;
  hmacSecret: string;
  approvedDisplayNames?: ReadonlyMap<string, string>;
  now?: () => Date;
}): Promise<LtsRepresentativeSyncSummary> {
  const payload = await provider.fetchDirectory();
  let parsed;
  try {
    parsed = parseLtsRepresentativeDirectory(
      payload,
      hmacSecret,
      approvedDisplayNames
    );
  } catch (error) {
    if (error instanceof InvalidLtsRepresentativeDirectoryError) {
      throw new LtsRepresentativeSyncUnavailableError(
        "malformed_response",
        false
      );
    }
    throw error;
  }

  if (!parsed.records.length) {
    throw new LtsRepresentativeSyncUnavailableError("empty_response", false);
  }

  const counts = await repository.synchronize(parsed.records, now());
  return {
    received: parsed.received,
    rejected: parsed.rejected,
    numbersReceived: parsed.numbersReceived,
    ...counts,
    rejectedNumbers: parsed.rejectedNumbers + counts.rejectedNumbers
  };
}
