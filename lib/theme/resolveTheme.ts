import { themeConfig, type ResolvedTheme, type ThemeMode } from "./themeConfig";

export function resolveThemeForHour(
  hour: number,
  dayStart = themeConfig.dayStartHour,
  nightStart = themeConfig.nightStartHour
): ResolvedTheme {
  if (!Number.isFinite(hour)) return "light";
  return hour >= dayStart && hour < nightStart ? "light" : "dark";
}

export function resolveTheme(
  mode: ThemeMode,
  hour: number,
  prefersDark = false
): ResolvedTheme {
  if (mode !== "auto") return mode;
  if (Number.isFinite(hour)) return resolveThemeForHour(hour);
  return prefersDark ? "dark" : "light";
}

export function millisecondsUntilNextBoundary(
  now = new Date(),
  dayStart = themeConfig.dayStartHour,
  nightStart = themeConfig.nightStartHour
) {
  const next = new Date(now);
  const currentHour = now.getHours();
  const boundaryHour =
    currentHour < dayStart
      ? dayStart
      : currentHour < nightStart
        ? nightStart
        : dayStart;

  if (currentHour >= nightStart) next.setDate(next.getDate() + 1);
  next.setHours(boundaryHour, 0, 0, 40);
  return Math.max(1_000, next.getTime() - now.getTime());
}
