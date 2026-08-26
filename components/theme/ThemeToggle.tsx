"use client";

import { Check, Clock3, Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import type { ThemeMode } from "@/lib/theme/themeConfig";
import { cn } from "@/lib/utils";

const options: Array<{ mode: ThemeMode; label: string; description: string; icon: typeof Sun }> = [
  { mode: "auto", label: "Auto", description: "Use local day/night time", icon: Clock3 },
  { mode: "light", label: "Light", description: "Always use light mode", icon: Sun },
  { mode: "dark", label: "Dark", description: "Always use dark mode", icon: Moon }
];

export function ThemeToggle({ compact = false, onSelect }: { compact?: boolean; onSelect?: () => void }) {
  const { mode, setMode } = useTheme();
  return (
    <div className={cn("grid gap-1", compact && "grid-cols-3 rounded-lg border border-wxBorder bg-wxSurfaceSoft p-1")} role="radiogroup" aria-label="Website theme">
      {options.map(({ mode: option, label, description, icon: Icon }) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={mode === option}
          data-state={mode === option ? "selected" : "default"}
          className={cn(
            "wx-interactive-state flex min-h-11 items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left outline-none transition",
            compact && "justify-center px-2"
          )}
          onClick={() => { setMode(option); onSelect?.(); }}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className={compact ? "text-xs font-semibold" : "min-w-0 flex-1"}>
            <span className="block font-semibold">{label}</span>
            {compact ? null : <span className="wx-state-muted block text-xs font-normal">{description}</span>}
          </span>
          {!compact && mode === option ? <Check className="h-4 w-4" aria-hidden /> : null}
        </button>
      ))}
    </div>
  );
}
