import type {
  HolidayExperienceSettings,
  HolidayTheme,
  HolidayThemeScope
} from "./types";

const protectedRoutes = [
  "/admin",
  "/client",
  "/employee"
];

const keyHolidayPublicRoutes = [
  "/",
  "/about-us",
  "/trust-centre",
  "/pricing",
  "/contact",
  "/help",
  "/samples",
  "/reviews",
  "/careers",
  "/assignment-support",
  "/dissertation-thesis-support",
  "/editing-proofreading",
  "/sop-admissions-writing",
  "/plagiarism-ai-review",
  "/formatting-referencing"
];

function isKeyHolidayPublicRoute(route: string) {
  return keyHolidayPublicRoutes.some(
    (candidate) =>
      route === candidate ||
      (candidate !== "/" && route.startsWith(`${candidate}/`))
  );
}

export function normalizeHolidayRoute(route: string) {
  const value = route.trim().split("?")[0]?.split("#")[0] || "/";
  if (!value.startsWith("/")) return `/${value}`;
  return value.length > 1 ? value.replace(/\/+$/, "") : value;
}

export function isHolidaySafePublicRoute(route: string) {
  const normalized = normalizeHolidayRoute(route);
  return !protectedRoutes.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

export function isLoginRoute(route: string) {
  const normalized = normalizeHolidayRoute(route);
  return ["/client-login", "/employee-login", "/admin/login"].includes(
    normalized
  );
}

export function themeAppliesToRoute(
  theme: Pick<
    HolidayTheme,
    | "scope"
    | "selectedRoutes"
    | "applyToLoginScreens"
    | "applyToClientLogin"
    | "applyToEmployeeLogin"
    | "applyToAdminLogin"
    | "applyToSelectedRoutes"
  > & {
    experienceConfig?: Pick<HolidayTheme["experienceConfig"], "interpretation">;
  },
  route: string
) {
  const normalized = normalizeHolidayRoute(route);
  if (normalized === "/client-login") {
    return theme.applyToLoginScreens && theme.applyToClientLogin;
  }
  if (normalized === "/employee-login") {
    return theme.applyToLoginScreens && theme.applyToEmployeeLogin;
  }
  if (normalized === "/admin/login") {
    return theme.applyToLoginScreens && theme.applyToAdminLogin;
  }
  if (!isHolidaySafePublicRoute(normalized)) return false;

  const scope: HolidayThemeScope = theme.scope;
  if (scope === "header_only") return true;
  if (scope === "entire_public") {
    const coverage =
      theme.experienceConfig?.interpretation.pageCoverage || "full_website";
    if (coverage === "homepage_only") return normalized === "/";
    if (coverage === "homepage_key_pages") {
      return isKeyHolidayPublicRoute(normalized);
    }
    return true;
  }
  if (scope === "homepage") return normalized === "/";
  if (scope === "login_screens") return false;
  if (scope === "selected_pages" || theme.applyToSelectedRoutes) {
    return theme.selectedRoutes.some((selected) => {
      const selectedRoute = normalizeHolidayRoute(selected);
      return (
        normalized === selectedRoute ||
        normalized.startsWith(`${selectedRoute}/`)
      );
    });
  }
  return false;
}

function partsInTimeZone(date: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(values.find((value) => value.type === type)?.value || 0);
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    second: part("second")
  };
}

function zonedTimeToUtc(
  parts: ReturnType<typeof partsInTimeZone>,
  timeZone: string
) {
  let timestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const rendered = partsInTimeZone(new Date(timestamp), timeZone);
    const renderedAsUtc = Date.UTC(
      rendered.year,
      rendered.month - 1,
      rendered.day,
      rendered.hour,
      rendered.minute,
      rendered.second
    );
    const desiredAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    timestamp += desiredAsUtc - renderedAsUtc;
  }
  return new Date(timestamp);
}

export function effectiveHolidayWindow(theme: HolidayTheme, now: Date) {
  if (!theme.startAt || !theme.endAt) return null;
  const start = new Date(theme.startAt);
  const end = new Date(theme.endAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return null;
  }
  if (!theme.repeatYearly) return { start, end };

  const current = partsInTimeZone(now, theme.timezone);
  const originalStart = partsInTimeZone(start, theme.timezone);
  const originalEnd = partsInTimeZone(end, theme.timezone);
  const candidateStart = zonedTimeToUtc(
    { ...originalStart, year: current.year },
    theme.timezone
  );
  let candidateEnd = zonedTimeToUtc(
    { ...originalEnd, year: current.year },
    theme.timezone
  );
  if (candidateEnd <= candidateStart) {
    candidateEnd = zonedTimeToUtc(
      { ...originalEnd, year: current.year + 1 },
      theme.timezone
    );
  }
  if (now < candidateStart && originalEnd.month < originalStart.month) {
    const priorStart = zonedTimeToUtc(
      { ...originalStart, year: current.year - 1 },
      theme.timezone
    );
    if (now <= candidateEnd) return { start: priorStart, end: candidateEnd };
  }
  return { start: candidateStart, end: candidateEnd };
}

export function isThemeInWindow(theme: HolidayTheme, now: Date) {
  const window = effectiveHolidayWindow(theme, now);
  return Boolean(window && window.start <= now && now < window.end);
}

export function resolveHolidayTheme({
  settings,
  themes,
  now = new Date(),
  previewThemeId
}: {
  settings: HolidayExperienceSettings;
  themes: HolidayTheme[];
  now?: Date;
  previewThemeId?: string | null;
}) {
  if (previewThemeId) {
    return (
      themes.find(
        (theme) => theme.id === previewThemeId && theme.status !== "archived"
      ) || null
    );
  }
  if (!settings.holidayModeEnabled || settings.emergencyDisabled) return null;

  if (settings.manualOverrideThemeId) {
    const manual = themes.find(
      (theme) =>
        theme.id === settings.manualOverrideThemeId &&
        theme.isEnabled &&
        theme.status === "active" &&
        theme.experienceConfig.approvalStatus === "approved"
    );
    if (manual) return manual;
  }

  if (!settings.autoScheduleEnabled) {
    return (
      themes.find(
        (theme) =>
          theme.id === settings.activeThemeId &&
          theme.isEnabled &&
          theme.status === "active" &&
          theme.experienceConfig.approvalStatus === "approved"
      ) || null
    );
  }

  return (
    themes
      .filter(
        (theme) =>
          theme.isEnabled &&
          theme.status === "scheduled" &&
          theme.mode === "automatic" &&
          theme.experienceConfig.approvalStatus === "approved" &&
          isThemeInWindow(theme, now)
      )
      .sort((left, right) => {
        if (right.priority !== left.priority) return right.priority - left.priority;
        return (
          new Date(right.startAt || 0).getTime() -
          new Date(left.startAt || 0).getTime()
        );
      })[0] || null
  );
}

export function findNextScheduledTheme(
  themes: HolidayTheme[],
  now = new Date()
) {
  return (
    themes
      .filter(
        (theme) =>
          theme.isEnabled &&
          theme.status === "scheduled" &&
          theme.startAt &&
          new Date(theme.startAt) > now
      )
      .sort(
        (left, right) =>
          new Date(left.startAt || 0).getTime() -
          new Date(right.startAt || 0).getTime()
      )[0] || null
  );
}
