export type S3HealthState =
  | "configured_healthy"
  | "configured_unreachable"
  | "not_configured"
  | "status_unavailable";

export type SanitizedS3Health = {
  state: S3HealthState;
  configured: boolean;
  reachable: boolean;
  bucket: "configured" | "not_configured";
  privateAccess: boolean | null;
  publicAccessBlocked: boolean | null;
  lastCheckedAt: string;
};

export function getS3StatusLabel(state: S3HealthState) {
  switch (state) {
    case "configured_healthy":
      return "Connected and Healthy";
    case "configured_unreachable":
      return "Configured but Unreachable";
    case "not_configured":
      return "Not Configured";
    default:
      return "Status Check Failed";
  }
}

export function isExpectedLeastPrivilegeListDenial(error: unknown) {
  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate?.name === "AccessDenied" ||
    (candidate?.name === "Unknown" &&
      candidate?.$metadata?.httpStatusCode === 403)
  );
}
