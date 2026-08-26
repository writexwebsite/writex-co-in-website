const IST_OFFSET_MILLISECONDS = 5.5 * 60 * 60 * 1000;
const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

export const REPRESENTATIVE_SYNC_TIMEZONE = "Asia/Kolkata";
export const REPRESENTATIVE_SYNC_TIME_LABEL = "10:30 AM IST";

export function getNextRepresentativeSyncAt(
  now: Date,
  scheduleEnabled: boolean
) {
  if (!scheduleEnabled) return null;

  const istNow = new Date(now.getTime() + IST_OFFSET_MILLISECONDS);
  let nextRun = Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate(),
    5,
    0,
    0,
    0
  );

  if (nextRun <= now.getTime()) nextRun += DAY_MILLISECONDS;
  return new Date(nextRun).toISOString();
}
