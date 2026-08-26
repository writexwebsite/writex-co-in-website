export type LtsSyncFailureReason =
  | "network_error"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "upstream_server_error"
  | "upstream_response_error"
  | "malformed_response"
  | "empty_response"
  | "overlap"
  | "not_configured"
  | "unexpected_error";

export class LtsRepresentativeSyncUnavailableError extends Error {
  readonly reason: LtsSyncFailureReason;
  readonly retryable: boolean;

  constructor(
    reason: LtsSyncFailureReason = "unexpected_error",
    retryable = false
  ) {
    super("The LTS representative directory could not be synchronized.");
    this.name = "LtsRepresentativeSyncUnavailableError";
    this.reason = reason;
    this.retryable = retryable;
  }
}

export function ltsFailureForHttpStatus(status: number) {
  if (status === 401) {
    return new LtsRepresentativeSyncUnavailableError("unauthorized", false);
  }
  if (status === 403) {
    return new LtsRepresentativeSyncUnavailableError("forbidden", false);
  }
  if (status >= 500) {
    return new LtsRepresentativeSyncUnavailableError(
      "upstream_server_error",
      true
    );
  }
  return new LtsRepresentativeSyncUnavailableError(
    "upstream_response_error",
    false
  );
}

export async function executeWithSingleTransientRetry<T>(
  operation: () => Promise<T>
) {
  try {
    return await operation();
  } catch (error) {
    if (
      !(error instanceof LtsRepresentativeSyncUnavailableError) ||
      !error.retryable
    ) {
      throw error;
    }
    return operation();
  }
}

export function safeLtsFailureReason(error: unknown): LtsSyncFailureReason {
  if (error instanceof LtsRepresentativeSyncUnavailableError) {
    return error.reason;
  }
  return "unexpected_error";
}
