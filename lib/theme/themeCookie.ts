import { THEME_COOKIE_NAME, isThemeMode, type ThemeMode } from "./themeConfig";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function readThemeCookie(cookieString: string): ThemeMode | null {
  const item = cookieString
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${THEME_COOKIE_NAME}=`));
  const value = item?.slice(THEME_COOKIE_NAME.length + 1);
  return isThemeMode(value) ? value : null;
}

export function writeThemeCookie(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${THEME_COOKIE_NAME}=${mode}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax${secure}`;
}
