"use client";

import { ArrowRight } from "lucide-react";
import { AXO_SERVICES } from "@/lib/axo/config";
import type { AxoServiceId } from "@/lib/axo/types";

export function ServiceSelector({ value, onChange }: { value?: AxoServiceId; onChange: (value: AxoServiceId) => void }) {
  return (
    <div className="grid gap-2" role="radiogroup" aria-label="Academic support service">
      {AXO_SERVICES.map((service) => (
        <button key={service.id} type="button" role="radio" aria-checked={value === service.id} onClick={() => onChange(service.id)} className={`flex min-h-14 items-center justify-between rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${value === service.id ? "border-violet-500 bg-violet-50 text-indigo-950" : "border-slate-200 bg-white text-slate-800 hover:border-violet-300"}`}>
          <span><span className="block text-sm font-semibold">{service.label}</span><span className="mt-0.5 block text-xs leading-4 text-slate-500">{service.shortDescription}</span></span>
          <ArrowRight className="ml-3 h-4 w-4 shrink-0" aria-hidden />
        </button>
      ))}
    </div>
  );
}
