export type ThemeMode = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "wx_theme_mode";
export const THEME_COOKIE_NAME = "wx_theme_mode";

function boundedHour(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23 ? parsed : fallback;
}

export const themeConfig = {
  dayStartHour: boundedHour(process.env.NEXT_PUBLIC_THEME_DAY_START_HOUR, 7),
  nightStartHour: boundedHour(process.env.NEXT_PUBLIC_THEME_NIGHT_START_HOUR, 19),
  lightThemeColor: "#F7F8FF",
  darkThemeColor: "#090D25"
} as const;

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "auto" || value === "light" || value === "dark";
}
