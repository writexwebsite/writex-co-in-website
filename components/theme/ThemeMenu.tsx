"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3, Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";
import { trackThemeEvent } from "@/lib/theme/analytics";

export function ThemeMenu({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { mode, resolvedTheme } = useTheme();
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Clock3;

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent | MouseEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") setOpen(false);
      if (event instanceof MouseEvent && !rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("mousedown", close);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("mousedown", close); };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-wxBorder bg-wxSurface text-wxIndigo700 shadow-sm transition hover:border-wxViolet700 hover:text-wxViolet700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
        aria-label={`Theme: ${mode}. Change theme`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => { setOpen((value) => !value); trackThemeEvent("theme_menu_opened", mode, resolvedTheme, window.location.pathname); }}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-[calc(100%+0.65rem)] z-[70] w-72 rounded-lg border border-wxBorder bg-wxSurface p-2 shadow-lift">
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-wxIndigo500">Appearance</p>
          <ThemeToggle onSelect={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
