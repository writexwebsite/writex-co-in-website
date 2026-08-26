"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  FlaskConical,
  Search,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp
} from "lucide-react";
import {
  type AdminHelpArticle,
  adminGlossary,
  adminProcessGuides,
  getRoleGuidanceArticles
} from "@/lib/admin/guidance-content";

export function AdminHelpCentre({
  role,
  initialArticles
}: {
  role: string;
  initialArticles?: AdminHelpArticle[];
}) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [tab, setTab] = useState<"articles" | "processes" | "glossary" | "demo">("articles");
  const [feedback, setFeedback] = useState<Record<string, boolean>>({});
  const articles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (initialArticles || getRoleGuidanceArticles(role)).filter((article) =>
      [article.title, article.module, article.purpose, ...article.actions]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [initialArticles, query, role]);

  async function sendFeedback(articleId: string, helpful: boolean) {
    const response = await fetch("/api/admin/help-feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ articleId, helpful })
    });
    if (response.ok) setFeedback((current) => ({ ...current, [articleId]: helpful }));
  }

  return (
    <div>
      <div className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
        {role === "super_admin" ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-3">
            <p className="text-sm font-semibold text-wxIndigo700">
              Manage article copy, ordering and onboarding completion.
            </p>
            <Link
              href="/admin/help/governance"
              className="inline-flex min-h-10 items-center rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-bold text-wxIndigo700"
            >
              Tutorial Governance
            </Link>
          </div>
        ) : null}
        <label className="relative block">
          <span className="sr-only">Search Help and Tutorials</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-wxIndigo400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search modules, actions, common issues or glossary terms"
            className="min-h-12 w-full rounded-md border border-wxBorder bg-wxSurfaceSoft pl-11 pr-3 text-sm outline-none focus:border-wxViolet700"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Help Centre sections">
          {[
            ["articles", "Step-by-step articles"],
            ["processes", "Process guides"],
            ["glossary", "Glossary"],
            ["demo", "Demo mode"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              data-state={tab === value ? "selected" : "default"}
              onClick={() => setTab(value as typeof tab)}
              className="wx-interactive-state min-h-10 rounded-md border px-4 text-sm font-bold"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "articles" ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {articles.map((article) => (
            <article key={article.id} className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-wxViolet700">{article.module}</p>
                  <h2 className="mt-2 text-xl font-bold text-wxIndigo900">{article.title}</h2>
                </div>
                <BookOpen className="h-5 w-5 shrink-0 text-wxViolet700" />
              </div>
              <p className="mt-3 text-sm leading-6 text-wxIndigo500">{article.purpose}</p>
              <ol className="mt-4 grid gap-2 text-sm text-wxIndigo700">
                {article.actions.map((action, index) => (
                  <li key={action} className="flex gap-2">
                    <span className="font-bold text-wxViolet700">{index + 1}.</span>
                    {action}
                  </li>
                ))}
              </ol>
              <div className="mt-4 rounded-md bg-wxSurfaceSoft p-3 text-xs leading-5 text-wxIndigo500">
                <strong className="text-wxIndigo800">Common issues:</strong>{" "}
                {article.mistakes.join("; ")}
              </div>
              {article.sensitive ? (
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-950">
                  {article.sensitive}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-wxBorder pt-4">
                <p className="text-xs text-wxIndigo400">
                  v{article.version} / {article.lastUpdated} / {article.owner}
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-wxIndigo500">Helpful?</span>
                  <button type="button" onClick={() => sendFeedback(article.id, true)} className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${feedback[article.id] === true ? "bg-emerald-50 text-emerald-700" : "hover:bg-wxSurfaceSoft"}`} aria-label={`${article.title} was helpful`}>
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => sendFeedback(article.id, false)} className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${feedback[article.id] === false ? "bg-red-50 text-red-700" : "hover:bg-wxSurfaceSoft"}`} aria-label={`${article.title} was not helpful`}>
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {article.href ? (
                <Link href={article.href} className="mt-4 inline-flex min-h-10 items-center font-bold text-wxViolet700 hover:underline">
                  Open module
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {tab === "processes" ? (
        <div className="mt-5 grid gap-4">
          {adminProcessGuides.map((guide) => (
            <article key={guide.id} className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
              <h2 className="text-xl font-bold text-wxIndigo900">{guide.title}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {guide.steps.map((step, index) => (
                  <span key={step} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-wxSurfaceSoft px-3 text-xs font-semibold text-wxIndigo700">
                    <span className="text-wxViolet700">{index + 1}</span>{step}
                  </span>
                ))}
              </div>
              <dl className="mt-5 grid gap-3 text-sm md:grid-cols-3">
                <ProcessFact label="Owner" value={guide.owner} />
                <ProcessFact label="External dependency / blocker" value={guide.blocker} />
                <ProcessFact label="Completion condition" value={guide.complete} />
              </dl>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "glossary" ? (
        <dl className="mt-5 grid gap-3 md:grid-cols-2">
          {adminGlossary
            .filter(([term, definition]) =>
              `${term} ${definition}`.toLowerCase().includes(query.trim().toLowerCase())
            )
            .map(([term, definition]) => (
              <div key={term} className="rounded-lg border border-wxBorder bg-wxSurface p-4 shadow-soft">
                <dt className="font-bold text-wxIndigo900">{term}</dt>
                <dd className="mt-2 text-sm leading-6 text-wxIndigo500">{definition}</dd>
              </div>
            ))}
        </dl>
      ) : null}

      {tab === "demo" ? (
        <section className="mt-5 rounded-lg border border-wxBorder bg-wxSurface p-6 shadow-soft">
          <div className="flex items-start gap-3">
            <FlaskConical className="h-6 w-6 text-wxViolet700" />
            <div>
              <p className="text-xs font-bold uppercase text-wxViolet700">Demo Mode</p>
              <h2 className="mt-2 text-2xl font-bold text-wxIndigo900">Sanitized demonstration data only</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-wxIndigo500">
                These walkthrough cards explain safe decisions and never call mutation
                APIs or alter production records.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["Review an application", "Inspect a sanitized role summary, note full-time eligibility and record a human reason."],
              ["Review integrity events", "Separate advisory telemetry from evidence and document a human conclusion."],
              ["Schedule an interview", "Confirm role, interviewer, duration and scorecard without exposing private notes."],
              ["Review verification", "Check consent, identity match, education evidence and unresolved discrepancies."],
              ["Temporary client access", "Generate, launch, validate, log out and revoke a sanitized single-use test session."],
              ["Suspicious report", "Review a private evidence reference, record a decision and preserve its audit lifecycle."]
            ].map(([title, text]) => (
              <article key={title} className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                <p className="flex items-center gap-2 font-bold text-wxIndigo900"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{title}</p>
                <p className="mt-2 text-sm leading-6 text-wxIndigo500">{text}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-wxIndigo500">
            <ShieldCheck className="h-4 w-4 text-wxViolet700" />
            Demo mode contains no real candidate, client or representative records.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function ProcessFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-wxSurfaceSoft p-3">
      <dt className="text-xs font-bold uppercase text-wxIndigo400">{label}</dt>
      <dd className="mt-1 leading-6 text-wxIndigo700">{value}</dd>
    </div>
  );
}
