"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AXO_CONTEXT_PROMPTS, AXO_FEATURES } from "@/lib/axo/config";
import { trackAxoEvent } from "@/lib/axo/analytics";
import { useHolidayExperience } from "@/components/holiday/HolidayExperienceProvider";
import type { AxoServiceId } from "@/lib/axo/types";
import { AxoConcierge } from "./AxoConcierge";
import { AxoErrorBoundary } from "./AxoErrorBoundary";
import {
  IndependenceDayCeremony,
  type IndependenceCeremonyState
} from "./IndependenceDayCeremony";
import { AxoLauncher } from "./AxoLauncher";

const DISMISSED_KEY = "writex_axo_dismissed";
const PROMPT_KEY = "writex_axo_prompt_seen";
const INDEPENDENCE_CEREMONY_KEY = "writex_independence_ceremony_v1";

function serviceFromPath(pathname: string): AxoServiceId | undefined {
  if (pathname.startsWith("/assignment-support")) return "coursework";
  if (pathname.startsWith("/dissertation-thesis-support")) return "dissertation";
  if (pathname.startsWith("/sop-admissions-writing")) return "sop";
  if (pathname.startsWith("/editing-proofreading")) return "editing";
  if (pathname.startsWith("/plagiarism-ai-review")) return "originality";
  if (pathname.startsWith("/formatting-referencing")) return "formatting";
}

export function AxoExperience() {
  const pathname = usePathname() || "/";
  const { experience } = useHolidayExperience();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && window.sessionStorage.getItem(DISMISSED_KEY) === "1");
  const [showPrompt, setShowPrompt] = useState(false);
  const [motionPreference, setMotionPreference] = useState<"unknown" | "full" | "reduced">("unknown");
  const [ceremonyState, setCeremonyState] = useState<IndependenceCeremonyState>("normal");
  const ceremonyStartedThisMount = useRef(false);
  const ceremonyTimers = useRef<number[]>([]);
  const prompt = useMemo(() => AXO_CONTEXT_PROMPTS[pathname], [pathname]);
  const independenceCeremonyEnabled = Boolean(
    pathname === "/" &&
      experience?.theme.slug === "independence-day" &&
      experience.theme.applyAxoTheme &&
      experience.theme.applyToHomepage
  );
  const ceremonyActive = independenceCeremonyEnabled && !["normal", "complete"].includes(ceremonyState);

  useEffect(() => { if (hidden || !prompt || ceremonyActive || window.sessionStorage.getItem(PROMPT_KEY)) return; const timer = window.setTimeout(() => { setShowPrompt(true); window.sessionStorage.setItem(PROMPT_KEY, "1"); }, 6500); return () => window.clearTimeout(timer); }, [ceremonyActive, hidden, prompt]);
  useEffect(() => { const onVisibility = () => document.documentElement.toggleAttribute("data-axo-paused", document.hidden); document.addEventListener("visibilitychange", onVisibility); return () => document.removeEventListener("visibilitychange", onVisibility); }, []);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionPreference(query.matches ? "reduced" : "full");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!independenceCeremonyEnabled || motionPreference === "unknown") {
      return;
    }
    const previousRun = window.sessionStorage.getItem(INDEPENDENCE_CEREMONY_KEY);
    if (
      motionPreference === "reduced" ||
      (previousRun && !ceremonyStartedThisMount.current)
    ) {
      window.sessionStorage.setItem(INDEPENDENCE_CEREMONY_KEY, "complete");
      ceremonyTimers.current = [
        window.setTimeout(() => setCeremonyState("complete"), 0)
      ];
      return () => {
        ceremonyTimers.current.forEach((timer) => window.clearTimeout(timer));
        ceremonyTimers.current = [];
      };
    }

    ceremonyStartedThisMount.current = true;
    window.sessionStorage.setItem(INDEPENDENCE_CEREMONY_KEY, "started");
    const timeline: Array<[number, IndependenceCeremonyState]> = [
      [900, "enter"],
      [2700, "arrive"],
      [3000, "hoist"],
      [4500, "honour"],
      [5400, "return"],
      [7500, "complete"]
    ];
    ceremonyTimers.current = timeline.map(([delay, state]) =>
      window.setTimeout(() => {
        setCeremonyState(state);
        if (state === "complete") {
          window.sessionStorage.setItem(INDEPENDENCE_CEREMONY_KEY, "complete");
        }
      }, delay)
    );
    return () => {
      ceremonyTimers.current.forEach((timer) => window.clearTimeout(timer));
      ceremonyTimers.current = [];
    };
  }, [independenceCeremonyEnabled, motionPreference]);

  const finishCeremony = useCallback(() => {
    if (!independenceCeremonyEnabled) return;
    ceremonyTimers.current.forEach((timer) => window.clearTimeout(timer));
    ceremonyTimers.current = [];
    window.sessionStorage.setItem(INDEPENDENCE_CEREMONY_KEY, "complete");
    setCeremonyState("complete");
  }, [independenceCeremonyEnabled]);

  if (!AXO_FEATURES.enabled || hidden) return null;
  const dismiss = () => { setHidden(true); setOpen(false); window.sessionStorage.setItem(DISMISSED_KEY, "1"); trackAxoEvent("axo_dismissed", { source_page: pathname, reason_code: "session_hide" }); };
  return <AxoErrorBoundary>{independenceCeremonyEnabled ? <IndependenceDayCeremony state={ceremonyState} reducedMotion={motionPreference === "reduced"} /> : null}<div className="wx-axo-launcher-shell fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-3 z-[65] lg:bottom-6 lg:right-6" data-festival-ceremony={independenceCeremonyEnabled ? "independence-day" : undefined} data-ceremony-state={independenceCeremonyEnabled ? ceremonyState : undefined}><AxoLauncher open={open} prompt={showPrompt ? prompt : undefined} ceremonyActive={ceremonyActive} onOpen={() => { finishCeremony(); setOpen(true); setShowPrompt(false); trackAxoEvent("axo_opened", { source_page: pathname, deterministic_mode: AXO_FEATURES.deterministicOnly }); }} onDismissPrompt={() => setShowPrompt(false)} /></div><AxoConcierge open={open} onClose={() => setOpen(false)} onHide={dismiss} initialService={serviceFromPath(pathname)} /></AxoErrorBoundary>;
}
