"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import type { AxoState } from "@/lib/axo/types";
import { AxoMascot } from "./AxoMascot";

export function AxoLauncher({ open, prompt, ceremonyActive = false, onOpen, onDismissPrompt }: { open: boolean; prompt?: string; ceremonyActive?: boolean; onOpen: () => void; onDismissPrompt: () => void }) {
  const [engaged, setEngaged] = useState(false);
  const state: AxoState = open ? "attentive" : prompt || ceremonyActive ? "welcoming" : engaged ? "curious" : "idle";
  return (
    <div className="flex items-end gap-2">
      {prompt && !open ? (
        <div className="relative max-w-[min(19rem,calc(100vw-7rem))] rounded-xl border border-violet-200 bg-white p-3 pr-9 text-sm leading-5 text-slate-700 shadow-[0_18px_50px_rgba(49,46,129,0.18)]" role="status">
          {prompt}
          <button type="button" onClick={onDismissPrompt} aria-label="Dismiss AXO suggestion" className="absolute right-2 top-2 rounded p-1 text-slate-500 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"><X className="h-4 w-4" /></button>
        </div>
      ) : null}
      <button type="button" onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }} onPointerEnter={() => setEngaged(true)} onPointerLeave={() => setEngaged(false)} onFocus={() => setEngaged(true)} onBlur={() => setEngaged(false)} aria-label={open ? "Return to AXO support" : "Open AXO student support"} aria-expanded={open} data-axo-functional-launcher="true" className={`group relative min-h-[5.25rem] min-w-[5.25rem] rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-400/50 sm:min-h-24 sm:min-w-24 ${open || ceremonyActive ? "" : "wx-axo-roam"}`}>
        <AxoMascot state={state} />
        <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-500 text-white shadow-md transition-transform duration-300 group-hover:scale-110"><MessageCircle className="h-4 w-4" /></span>
        <span className="sr-only">AXO is an AI-powered support assistant</span>
      </button>
    </div>
  );
}
