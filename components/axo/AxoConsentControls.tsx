"use client";
import Link from "next/link";

export function AxoConsentControls({ onForget, onHide }: { onForget: () => void; onHide: () => void }) {
  return <div className="grid grid-cols-2 gap-2 border-t border-slate-200 p-3 text-xs"><button type="button" onClick={onForget} className="min-h-10 rounded-lg border border-slate-200 font-semibold text-slate-600">Clear saved details</button><button type="button" onClick={onHide} className="min-h-10 rounded-lg border border-slate-200 font-semibold text-slate-600">Hide for this session</button><Link href="/privacy" className="col-span-2 text-center font-semibold text-violet-700">Privacy information</Link></div>;
}
