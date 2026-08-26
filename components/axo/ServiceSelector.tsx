"use client";

import { ArrowRight } from "lucide-react";
import { AXO_SERVICES } from "@/lib/axo/config";
import type { AxoServiceId } from "@/lib/axo/types";

export function ServiceSelector({ value, onChange }: { value?: AxoServiceId; onChange: (value: AxoServiceId) => void }) {
  return (
    <div className="grid gap-2" role="radiogroup" aria-label="Academic support service">
      {AXO_SERVICES.map((service) => {
        const selected = value === service.id;
        return (
        <button key={service.id} type="button" role="radio" aria-checked={selected} data-state={selected ? "selected" : "default"} onClick={() => onChange(service.id)} className="wx-interactive-state flex min-h-14 items-center justify-between rounded-lg border p-3 text-left transition">
          <span><span className="block text-sm font-semibold">{service.label}</span><span className="wx-state-muted mt-0.5 block text-xs leading-4">{service.shortDescription}</span></span>
          <ArrowRight className="ml-3 h-4 w-4 shrink-0" aria-hidden />
        </button>
        );
      })}
    </div>
  );
}
