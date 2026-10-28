export const DEFAULT_REPRESENTATIVE_SYNC_MAX_AGE_HOURS = 26;
export const MAX_REPRESENTATIVE_SYNC_MAX_AGE_HOURS = 168;

type RepresentativeSyncFreshnessState = {
  lastAttemptedAt: Date | string | null;
  lastSuccessfulAt: Date | string | null;
  safeFailureReason: string | null;
};

function timestamp(value: Date | string | null) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  const time = parsed.getTime();
  return Number.isFinite(time) ? time : null;
}

export function readRepresentativeSyncMaxAgeHours(
  environment: Partial<Record<string, string | undefined>> = process.env
) {
  const parsed = Number(
    environment.REPRESENTATIVE_DIRECTORY_MAX_STALENESS_HOURS
  );
  return Number.isFinite(parsed) &&
    parsed > 0 &&
    parsed <= MAX_REPRESENTATIVE_SYNC_MAX_AGE_HOURS
    ? parsed
    : DEFAULT_REPRESENTATIVE_SYNC_MAX_AGE_HOURS;
}

export function isRepresentativeSyncFresh(
  state: RepresentativeSyncFreshnessState | undefined,
  {
    now = new Date(),
    maxAgeHours = DEFAULT_REPRESENTATIVE_SYNC_MAX_AGE_HOURS
  }: { now?: Date; maxAgeHours?: number } = {}
) {
  if (!state || !Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
    return false;
  }

  const nowTime = now.getTime();
  const successTime = timestamp(state.lastSuccessfulAt);
  const attemptTime = timestamp(state.lastAttemptedAt);
  if (!Number.isFinite(nowTime) || successTime === null) return false;

  const maximumAgeMs = maxAgeHours * 60 * 60 * 1000;
  if (successTime > nowTime || nowTime - successTime > maximumAgeMs) {
    return false;
  }

  if (
    state.safeFailureReason &&
    attemptTime !== null &&
    attemptTime > successTime
  ) {
    return false;
  }

  return true;
}
