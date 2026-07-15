"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AXO_CONTEXT_PROMPTS, AXO_FEATURES } from "@/lib/axo/config";
import { trackAxoEvent } from "@/lib/axo/analytics";
import type { AxoServiceId } from "@/lib/axo/types";
import { AxoConcierge } from "./AxoConcierge";
import { AxoErrorBoundary } from "./AxoErrorBoundary";
import { AxoLauncher } from "./AxoLauncher";

const DISMISSED_KEY = "writex_axo_dismissed";
const PROMPT_KEY = "writex_axo_prompt_seen";

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
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && window.sessionStorage.getItem(DISMISSED_KEY) === "1");
  const [showPrompt, setShowPrompt] = useState(false);
  const prompt = useMemo(() => AXO_CONTEXT_PROMPTS[pathname], [pathname]);
  useEffect(() => { if (hidden || !prompt || window.sessionStorage.getItem(PROMPT_KEY)) return; const timer = window.setTimeout(() => { setShowPrompt(true); window.sessionStorage.setItem(PROMPT_KEY, "1"); }, 6500); return () => window.clearTimeout(timer); }, [hidden, prompt]);
  useEffect(() => { const onVisibility = () => document.documentElement.toggleAttribute("data-axo-paused", document.hidden); document.addEventListener("visibilitychange", onVisibility); return () => document.removeEventListener("visibilitychange", onVisibility); }, []);
  if (!AXO_FEATURES.enabled || hidden) return null;
  const dismiss = () => { setHidden(true); setOpen(false); window.sessionStorage.setItem(DISMISSED_KEY, "1"); trackAxoEvent("axo_dismissed", { source_page: pathname, reason_code: "session_hide" }); };
  return <AxoErrorBoundary><div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-3 z-[65] lg:bottom-6 lg:right-6"><AxoLauncher open={open} prompt={showPrompt ? prompt : undefined} onOpen={() => { setOpen(true); setShowPrompt(false); trackAxoEvent("axo_opened", { source_page: pathname, deterministic_mode: AXO_FEATURES.deterministicOnly }); }} onDismissPrompt={() => setShowPrompt(false)} /></div><AxoConcierge open={open} onClose={() => setOpen(false)} onHide={dismiss} initialService={serviceFromPath(pathname)} /></AxoErrorBoundary>;
}
