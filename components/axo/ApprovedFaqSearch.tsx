"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { AXO_KNOWLEDGE, AXO_UNKNOWN_ANSWER, searchApprovedKnowledge } from "@/lib/axo/knowledge";
import { trackAxoEvent } from "@/lib/axo/analytics";

export function ApprovedFaqSearch() {
  const [query, setQuery] = useState("");
  const results = query ? searchApprovedKnowledge(query) : AXO_KNOWLEDGE.slice(0, 3);
  return (
    <div>
      <label className="text-sm font-semibold text-indigo-950" htmlFor="axo-faq-search">Search approved guidance</label>
      <div className="relative mt-2"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input id="axo-faq-search" value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" placeholder="Quotes, files, confidentiality..." /></div>
      <div className="mt-3 space-y-2">
        {results.length ? results.map((record) => <details key={record.title} className="rounded-lg border border-slate-200 bg-white p-3"><summary className="cursor-pointer text-sm font-semibold text-indigo-950">{record.title}</summary><p className="mt-2 text-sm leading-6 text-slate-600">{record.answer}</p></details>) : <p className="rounded-lg bg-violet-50 p-3 text-sm leading-6 text-slate-700" onLoad={() => trackAxoEvent("fallback_answer_shown")}>{AXO_UNKNOWN_ANSWER}</p>}
      </div>
    </div>
  );
}
