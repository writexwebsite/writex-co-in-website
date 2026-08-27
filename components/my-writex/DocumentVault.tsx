"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileCheck2, FileStack, Search } from "lucide-react";
import type { MyWritexDocument } from "@/lib/my-writex/types";
import { EmptyState, formatDate } from "@/components/my-writex/MyWritexPrimitives";
import { ProductPageHeader } from "@/components/my-writex/ProductUI";

export function DocumentVault({ documents, projects }: { documents: MyWritexDocument[]; projects: Array<{ id: string; title: string }> }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [projectId, setProjectId] = useState("all");

  const kinds = useMemo(() => Array.from(new Set(documents.map((document) => document.kind))), [documents]);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return documents
      .filter((document) =>
        (kind === "all" || document.kind === kind) &&
        (projectId === "all" || document.projectId === projectId) &&
        (!normalized || `${document.name} ${document.kind} ${document.projectTitle}`.toLowerCase().includes(normalized)),
      )
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  }, [documents, kind, projectId, query]);

  const grouped = useMemo(() => {
    return results.reduce<Record<string, MyWritexDocument[]>>((groups, document) => {
      (groups[document.projectTitle] ||= []).push(document);
      return groups;
    }, {});
  }, [results]);

  return (
    <div className="mw-page-stack">
      <ProductPageHeader
        eyebrow="Across your work"
        title="My Documents"
        copy="Briefs, references, supporting material, delivered files, invoices, and receipts — organised around the project they belong to."
      />

      <section aria-label="Document filters" className="mw-card mw-card-mobile-pad grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_224px_288px]">
        <label className="relative block">
          <span className="sr-only">Search documents</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#77717f]" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search document or project"
            className="mw-control w-full pl-11"
          />
        </label>
        <label>
          <span className="sr-only">Filter documents by type</span>
          <select value={kind} onChange={(event) => setKind(event.target.value)} className="mw-control w-full">
            <option value="all">All document types</option>
            {kinds.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter documents by project</span>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mw-control w-full">
            <option value="all">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
        </label>
      </section>

      <div className="flex items-center justify-between text-sm text-[var(--mw-muted)]">
        <p aria-live="polite">{results.length} {results.length === 1 ? "document" : "documents"}</p>
        {query || kind !== "all" || projectId !== "all" ? (
          <button type="button" onClick={() => { setQuery(""); setKind("all"); setProjectId("all"); }} className="min-h-10 font-semibold text-[#6d28d9] underline-offset-4 hover:underline">Clear filters</button>
        ) : null}
      </div>

      {results.length ? (
        <div className="grid gap-4">
          {Object.entries(grouped).map(([projectTitle, projectDocuments]) => {
            const first = projectDocuments[0];
            return (
              <section key={projectTitle} className="mw-list-surface">
                <div className="flex flex-col gap-3 border-b border-[var(--mw-line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="mw-meta">Project</p>
                    <h2 className="mw-object-title mt-1">{projectTitle}</h2>
                  </div>
                  <Link href={`/my-writex/projects/${first.projectId}#files`} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#6d28d9] outline-none focus-visible:ring-2 focus-visible:ring-[#6d28d9]">
                    Open Project Room <FileCheck2 className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
                <div className="divide-y divide-[var(--mw-line)]">
                  {projectDocuments.map((document) => (
                    <div key={document.id} className="flex min-h-[56px] min-w-0 items-center gap-3 px-4 py-2">
                      <FileStack className="h-6 w-6 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{document.name}</p>
                        <p className="mw-meta mt-1">{document.kind} · {document.sizeLabel} · {formatDate(document.addedAt)}</p>
                      </div>
                      <span className="mw-status-pill hidden bg-[var(--mw-soft)] text-[var(--mw-muted)] sm:inline-flex">Available in project</span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No documents match" message="Try another project or document type, or clear your search." />
      )}
      <p className="mw-meta">For this localhost stage, safe document actions return you to the authorised Project Room. No download endpoint is fabricated.</p>
    </div>
  );
}
