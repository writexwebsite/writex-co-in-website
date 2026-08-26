export type HolidayPlaybackRange = {
  start: number;
  end: number;
  partial: boolean;
};

export function resolveHolidayPlaybackRange(
  rangeHeader: string | null,
  totalBytes: number
): HolidayPlaybackRange | null {
  if (!Number.isInteger(totalBytes) || totalBytes <= 0) return null;
  if (!rangeHeader) {
    return { start: 0, end: totalBytes - 1, partial: false };
  }

  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null;
    return {
      start: Math.max(0, totalBytes - suffixLength),
      end: totalBytes - 1,
      partial: true
    };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : totalBytes - 1;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(requestedEnd) ||
    start < 0 ||
    requestedEnd < start ||
    start >= totalBytes
  ) {
    return null;
  }

  return {
    start,
    end: Math.min(requestedEnd, totalBytes - 1),
    partial: true
  };
}
