"use client";

import { Clipboard, Check } from "lucide-react";
import { useState } from "react";
import { buildRequirementSummary } from "@/lib/axo/rules";
import type { AxoBrief } from "@/lib/axo/types";

export function RequirementSummary({ brief }: { brief: AxoBrief }) {
  const [copied, setCopied] = useState(false);
  const summary = buildRequirementSummary(brief);
  return <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-indigo-950">Requirement summary</h3><button type="button" onClick={async () => { await navigator.clipboard.writeText(summary); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-violet-200 bg-white px-2.5 text-xs font-semibold text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">{copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}</button></div><pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-5 text-slate-700">{summary || "Add your requirement details to build the summary."}</pre></div>;
}
