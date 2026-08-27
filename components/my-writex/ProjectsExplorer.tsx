"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Search, SlidersHorizontal } from "lucide-react";
import type { MyWritexProjectStatus, MyWritexProjectView } from "@/lib/my-writex/types";
import { EmptyState, formatDate, statusLabels, StatusPill } from "@/components/my-writex/MyWritexPrimitives";
import { ProductPageHeader } from "@/components/my-writex/ProductUI";

type ProjectFilter = "active" | "upcoming" | "delivered" | "completed" | "all";
type ProjectSort = "smart" | "soonest" | "newest" | "title";

const filters: Array<{ key: ProjectFilter; label: string }> = [
  { key: "active", label: "Active" },
  { key: "upcoming", label: "Upcoming" },
  { key: "delivered", label: "Delivered" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
];

export function ProjectsExplorer({ projects, completedCount }: { projects: MyWritexProjectView[]; completedCount: number }) {
  const [filter, setFilter] = useState<ProjectFilter>("active");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | MyWritexProjectStatus>("all");
  const [sort, setSort] = useState<ProjectSort>("smart");

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesPhase = filter === "all" || project.phase === filter;
      const matchesStatus = status === "all" || project.status === status;
      const matchesQuery = !normalizedQuery || [project.title, project.invoiceReference, project.service, project.category].join(" ").toLowerCase().includes(normalizedQuery);
      return matchesPhase && matchesStatus && matchesQuery;
    }).sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "soonest") return a.deliveryDate.localeCompare(b.deliveryDate);
      if (sort === "newest") return b.deliveryDate.localeCompare(a.deliveryDate);
      const phaseOrder = { active: 0, upcoming: 1, delivered: 2, completed: 3 };
      return phaseOrder[a.phase] - phaseOrder[b.phase] || a.deliveryDate.localeCompare(b.deliveryDate);
    });
  }, [filter, projects, query, sort, status]);

  return (
    <div className="mw-page-stack">
      <ProductPageHeader
        eyebrow="Work · Projects"
        title="Projects"
        copy={`Current, planned and recent work, including a concise window into ${completedCount} completed projects.`}
        action={<Link href="/my-writex/new-requirement" className="mw-button-primary"><Plus className="h-[18px] w-[18px]" strokeWidth={1.75} />Start New Requirement</Link>}
      />

      <section aria-label="Project controls">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Project phase">
            {filters.map((item) => (
              <button key={item.key} type="button" role="tab" aria-selected={filter === item.key} onClick={() => setFilter(item.key)} className={`h-10 shrink-0 rounded-[8px] px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)] ${filter === item.key ? "bg-[var(--mw-primary-soft)] text-[var(--mw-primary)]" : "text-[var(--mw-muted)] hover:bg-[var(--mw-soft)]"}`}>{item.label}</button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block sm:w-80">
              <span className="sr-only">Search projects</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mw-tertiary)]" strokeWidth={1.75} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" className="mw-control h-10 w-full pl-10" />
            </label>
            <label className="relative block sm:w-44"><span className="sr-only">Filter by status</span><SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mw-tertiary)]" strokeWidth={1.75} /><select value={status} onChange={(event) => setStatus(event.target.value as "all" | MyWritexProjectStatus)} className="mw-control h-10 w-full pl-10"><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="block sm:w-40"><span className="sr-only">Sort projects</span><select value={sort} onChange={(event) => setSort(event.target.value as ProjectSort)} className="mw-control h-10 w-full"><option value="smart">Most useful</option><option value="soonest">Soonest date</option><option value="newest">Newest date</option><option value="title">Project title</option></select></label>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4"><p className="mw-meta" aria-live="polite">{results.length} {results.length === 1 ? "project" : "projects"}</p>{query || status !== "all" ? <button type="button" onClick={() => { setQuery(""); setStatus("all"); }} className="min-h-11 text-sm font-semibold text-[var(--mw-primary)]">Clear filters</button> : null}</div>
      </section>

      {results.length ? (
        <section className="mw-list-surface" aria-label="Projects">
          {results.map((project) => (
            <article key={project.id} className="mw-project-list-row">
              <div className="min-w-0"><h2 className="mw-object-title truncate">{project.title}</h2><p className="mw-meta mt-1 truncate">{project.invoiceReference} · {project.service}</p></div>
              <div><StatusPill status={project.status} /></div>
              <p className="mw-meta">{formatDate(project.deliveryDate)}</p>
              <Link href={`/my-writex/projects/${project.id}`} className="flex h-10 w-10 items-center justify-center rounded-[8px] text-[var(--mw-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--mw-primary)]" aria-label={`Open ${project.title}`}><ChevronRight className="h-5 w-5" strokeWidth={1.75} /></Link>
            </article>
          ))}
        </section>
      ) : <EmptyState title="No projects match this view" message="Try another phase, clear the status filter, or search using a shorter term." />}
    </div>
  );
}
