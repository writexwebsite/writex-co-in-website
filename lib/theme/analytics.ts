import type { ResolvedTheme, ThemeMode } from "./themeConfig";

export type ThemeEvent = "theme_menu_opened" | "theme_mode_selected" | "theme_auto_resolved";

export function trackThemeEvent(
  event: ThemeEvent,
  mode: ThemeMode,
  resolvedTheme: ResolvedTheme,
  pagePath: string
) {
  if (typeof window === "undefined") return;
  const detail = {
    event,
    selected_mode: mode,
    resolved_theme: resolvedTheme,
    page_path: pagePath
  };
  window.dispatchEvent(new CustomEvent("writex:theme-event", { detail }));
  const analyticsWindow = window as Window & { dataLayer?: Array<Record<string, string>> };
  analyticsWindow.dataLayer?.push(detail);
}
