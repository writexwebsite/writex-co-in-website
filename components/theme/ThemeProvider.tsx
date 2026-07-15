"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { millisecondsUntilNextBoundary, resolveTheme } from "@/lib/theme/resolveTheme";
import { readThemeCookie, writeThemeCookie } from "@/lib/theme/themeCookie";
import { THEME_STORAGE_KEY, isThemeMode, themeConfig, type ResolvedTheme, type ThemeMode } from "@/lib/theme/themeConfig";
import { trackThemeEvent } from "@/lib/theme/analytics";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  isAuto: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  const apply = useCallback((nextMode: ThemeMode, announce = false) => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = resolveTheme(nextMode, new Date().getHours(), prefersDark);
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.themeMode = nextMode;
    root.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      resolved === "dark" ? themeConfig.darkThemeColor : themeConfig.lightThemeColor
    );
    setResolvedTheme(resolved);
    if (announce) trackThemeEvent("theme_mode_selected", nextMode, resolved, pathname || "/");
    else if (nextMode === "auto") trackThemeEvent("theme_auto_resolved", nextMode, resolved, pathname || "/");
  }, [pathname]);

  useEffect(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(THEME_STORAGE_KEY); } catch {}
    const initial = isThemeMode(stored) ? stored : readThemeCookie(document.cookie) ?? "auto";
    const frame = requestAnimationFrame(() => {
      setModeState(initial);
      apply(initial);
      document.documentElement.dataset.themeReady = "true";
    });
    return () => cancelAnimationFrame(frame);
  }, [apply]);

  useEffect(() => {
    if (mode !== "auto") return;
    let timer = window.setTimeout(() => apply("auto"), millisecondsUntilNextBoundary());
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(timer);
      apply("auto");
      timer = window.setTimeout(() => apply("auto"), millisecondsUntilNextBoundary());
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [apply, mode]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    try { window.localStorage.setItem(THEME_STORAGE_KEY, nextMode); } catch {}
    writeThemeCookie(nextMode);
    apply(nextMode, true);
  }, [apply]);

  const value = useMemo(() => ({ mode, resolvedTheme, setMode, isAuto: mode === "auto" }), [mode, resolvedTheme, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
