import type { ReactNode } from "react";
export function AxoMessageBubble({ children }: { children: ReactNode }) { return <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm leading-6 text-slate-700">{children}</div>; }
