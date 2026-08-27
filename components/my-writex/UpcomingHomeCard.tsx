"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarCheck2 } from "lucide-react";
import type { MyWritexUpcomingWork } from "@/lib/my-writex/types";
import { formatDate } from "@/components/my-writex/MyWritexPrimitives";

export function UpcomingHomeCard({ initialItems, writeXId }: { initialItems: MyWritexUpcomingWork[]; writeXId: string }) {
  const [items, setItems] = useState(initialItems);
  const storageKey = `my-writex:stage2:upcoming:${writeXId}`;
  useEffect(() => {
    let storedItems: MyWritexUpcomingWork[] | null = null;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) storedItems = JSON.parse(stored) as MyWritexUpcomingWork[];
    } catch {
      // Use fixture content when local storage is unavailable.
    }
    if (!storedItems) return;
    const timer = window.setTimeout(() => setItems(storedItems), 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);
  const nearest = useMemo(
    () => [...items].sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0],
    [items],
  );
  return (
    <div className="mw-card mw-card-mobile-pad p-5">
      <CalendarCheck2 className="h-5 w-5 text-[var(--mw-primary)]" strokeWidth={1.75} aria-hidden />
      <p className="mw-eyebrow mt-4">Nearest upcoming work</p>
      {nearest ? <><h2 className="mw-section-title mt-2">{nearest.title}</h2><p className="mw-meta mt-2 text-[var(--mw-green)]">{formatDate(nearest.targetDate)}</p><p className="mw-secondary mt-4">{nearest.note || "A future requirement ready to prepare when you are."}</p><Link href={`/my-writex/new-requirement?fromUpcoming=${encodeURIComponent(nearest.id)}`} className="mw-button-primary mt-5">Prepare Requirement <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden /></Link></> : <><p className="mw-secondary mt-4">Nothing is planned yet.</p><Link href="/my-writex/upcoming" className="mw-button-primary mt-5">Plan Future Work <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden /></Link></>}
    </div>
  );
}
