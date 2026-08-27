"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Edit3, Plus, Trash2, X } from "lucide-react";
import type { MyWritexUpcomingWork } from "@/lib/my-writex/types";
import { EmptyState, formatDate } from "@/components/my-writex/MyWritexPrimitives";
import { ProductPageHeader } from "@/components/my-writex/ProductUI";

type PlannerDraft = { title: string; targetDate: string; note: string };
const emptyDraft: PlannerDraft = { title: "", targetDate: "", note: "" };

export function UpcomingWorkPlanner({ initialItems, writeXId, createdByUpcoming = {} }: { initialItems: MyWritexUpcomingWork[]; writeXId: string; createdByUpcoming?: Record<string, string> }) {
  const storageKey = `my-writex:stage2:upcoming:${writeXId}`;
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState<PlannerDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    let storedItems: MyWritexUpcomingWork[] | null = null;
    try { const saved = window.localStorage.getItem(storageKey); if (saved) storedItems = JSON.parse(saved) as MyWritexUpcomingWork[]; } catch { /* The fixture remains available if browser storage is blocked. */ }
    if (!storedItems) return;
    const timer = window.setTimeout(() => setItems(storedItems), 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.targetDate.localeCompare(b.targetDate)), [items]);
  function persist(next: MyWritexUpcomingWork[]) { setItems(next); try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Local persistence is optional. */ } }
  function openNew() { setEditingId(null); setDraft(emptyDraft); setConfirmation(""); setFormOpen(true); }
  function openEdit(item: MyWritexUpcomingWork) { setEditingId(item.id); setDraft({ title: item.title, targetDate: item.targetDate, note: item.note || "" }); setConfirmation(""); setFormOpen(true); }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title || !draft.targetDate) return;
    if (editingId) { persist(items.map((item) => item.id === editingId ? { ...item, title, targetDate: draft.targetDate, note: draft.note.trim(), dueLabel: dueLabel(draft.targetDate) } : item)); setConfirmation(`${title} was updated locally.`); }
    else { persist([...items, { id: `local-${crypto.randomUUID()}`, title, targetDate: draft.targetDate, note: draft.note.trim(), dueLabel: dueLabel(draft.targetDate) }]); setConfirmation(`${title} was added locally.`); }
    setFormOpen(false); setDraft(emptyDraft); setEditingId(null);
  }
  function remove(item: MyWritexUpcomingWork) { persist(items.filter((candidate) => candidate.id !== item.id)); setConfirmation(`${item.title} was removed from this local plan.`); if (editingId === item.id) setFormOpen(false); }

  return (
    <div className="mw-page-stack">
      <ProductPageHeader eyebrow="Plan" title="Plan ahead, without the pressure." copy="Keep future requirements visible before they become urgent. This plan stays only in this browser during local UAT." action={<button type="button" onClick={openNew} className="mw-button-primary"><Plus className="h-[18px] w-[18px]" strokeWidth={1.75} />Add Upcoming Work</button>} />

      {confirmation ? <div role="status" className="flex items-center gap-3 rounded-[12px] border border-[#b8e2d0] bg-[#eaf6f0] p-4 text-sm font-medium text-[#116747]"><CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={1.75} />{confirmation}</div> : null}

      {formOpen ? <section className="mw-card mw-card-mobile-pad p-6"><div className="flex items-center justify-between gap-4"><div><p className="mw-eyebrow">Local Planner</p><h2 className="mw-section-title mt-1">{editingId ? "Edit upcoming work" : "Add upcoming work"}</h2></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Close upcoming work form" className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-[var(--mw-line)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]"><X className="h-5 w-5" strokeWidth={1.75} /></button></div><form onSubmit={submit} className="mt-6 grid gap-[18px] md:grid-cols-2"><label><span className="text-sm font-medium">Title</span><input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Marketing presentation" className="mw-control mt-[7px] w-full" /></label><label><span className="text-sm font-medium">Tentative date</span><input required type="text" inputMode="numeric" pattern="\d{4}-\d{2}-\d{2}" placeholder="YYYY-MM-DD" value={draft.targetDate} onChange={(event) => setDraft({ ...draft, targetDate: event.target.value })} className="mw-control mt-[7px] w-full" /></label><label className="md:col-span-2"><span className="text-sm font-medium">Optional note</span><textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} rows={3} placeholder="A little context for your future self" className="mw-control mt-[7px] h-auto w-full py-3" /></label><div className="flex flex-wrap gap-3 md:col-span-2"><button type="submit" className="mw-button-primary">{editingId ? "Save Changes" : "Add to Plan"}</button><button type="button" onClick={() => setFormOpen(false)} className="mw-button-secondary">Cancel</button></div></form></section> : null}

      <section aria-labelledby="upcoming-work-title">
        <h2 id="upcoming-work-title" className="mw-section-title mb-4">Upcoming Work</h2>
        {sortedItems.length ? <div className="mw-list-surface px-4">{sortedItems.map((item) => <article key={item.id} className="mw-timeline-row"><div><p className="mw-meta font-medium text-[var(--mw-primary)]">{formatDate(item.targetDate)}</p><p className="mw-meta mt-1">{dueLabel(item.targetDate)}</p></div><div><h3 className="mw-object-title">{item.title}</h3>{item.note ? <p className="mw-secondary mt-1">{item.note}</p> : null}{createdByUpcoming[item.id] ? <Link href={`/my-writex/requests/${encodeURIComponent(createdByUpcoming[item.id])}`} className="mw-text-link mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#116747]"><CheckCircle2 className="h-4 w-4" />Requirement Created · {createdByUpcoming[item.id]}</Link> : <Link href={`/my-writex/new-requirement?fromUpcoming=${encodeURIComponent(item.id)}`} className="mw-text-link mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--mw-primary)]">Prepare Requirement <ArrowRight className="h-4 w-4" strokeWidth={1.75} /></Link>}</div><div className="flex gap-1"><button type="button" onClick={() => openEdit(item)} aria-label={`Edit ${item.title}`} className="flex h-11 w-11 items-center justify-center rounded-[8px] text-[var(--mw-muted)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]"><Edit3 className="h-4 w-4" strokeWidth={1.75} /></button><button type="button" onClick={() => remove(item)} aria-label={`Delete ${item.title}`} className="flex h-11 w-11 items-center justify-center rounded-[8px] text-[#934122] outline-none focus-visible:ring-2 focus-visible:ring-[#934122]"><Trash2 className="h-4 w-4" strokeWidth={1.75} /></button></div></article>)}</div> : <EmptyState title="No upcoming work yet" message="Add your next deadline so WriteX can help you plan earlier." action={<button type="button" onClick={openNew} className="mw-button-primary"><Plus className="h-[18px] w-[18px]" strokeWidth={1.75} />Add Upcoming Work</button>} />}
      </section>
      <p className="mw-meta">Local-only planner: no reminder, manager notification, LTS lead, or production record is created.</p>
    </div>
  );
}

function dueLabel(targetDate: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(`${targetDate}T00:00:00`);
  const days = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `Due in ${days} days`;
}
