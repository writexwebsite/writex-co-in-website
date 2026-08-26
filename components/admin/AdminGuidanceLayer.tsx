"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  ListChecks,
  RotateCcw,
  ShieldAlert,
  X
} from "lucide-react";
import {
  adminHelpArticles,
  adminProcessGuides,
  getRoleGuidanceArticles
} from "@/lib/admin/guidance-content";

type State = {
  assigned_role: string;
  current_step: number;
  checklist_state: Record<string, boolean>;
  onboarding_completed: boolean;
  skipped_at: string | null;
  dismissed_checklist_at: string | null;
};

const masterSteps = [
  "Overview Dashboard",
  "Action Centre",
  "Trust Centre Operations",
  "Representative Directory",
  "Suspicious Activity Reports",
  "Client Portal Operations",
  "Temporary Portal Testing",
  "Smart Hiring",
  "Applications",
  "Assessments",
  "Question Bank",
  "Interviews",
  "Talent Pool",
  "Referrals",
  "Connected Candidates",
  "Verification Centre",
  "HRMS Sync",
  "Trust Centre Publishing",
  "S3 Storage",
  "SES Email",
  "Integrations",
  "Audit Logs",
  "System Health",
  "Settings",
  "Permissions and Roles"
];

const roleSteps: Record<string, string[]> = {
  hr_admin: [
    "Applications",
    "Candidate Stages",
    "Document Requests",
    "Verification Cases",
    "Candidate Clarification",
    "Interviews",
    "Talent Pool",
    "Referrals",
    "Retention and Deletion",
    "Super Admin Escalation"
  ],
  hiring_manager: [
    "Eligibility",
    "Shortlist",
    "Interviews",
    "Scorecards",
    "Final Recommendation",
    "Connected Candidate Review",
    "Offer Gates"
  ],
  assessor: [
    "Assessment Queue",
    "Question Version",
    "Scoring Rubric",
    "Integrity Events",
    "Advisory Telemetry",
    "Viva",
    "Human Decision"
  ],
  interviewer: [
    "Interview Schedule",
    "Structured Scorecard",
    "Restricted Notes",
    "Recommendation"
  ],
  read_only_auditor: [
    "Filters",
    "Audit Trails",
    "Evidence",
    "Export Restrictions",
    "No Mutation Rights"
  ]
};

const checklist = [
  ["profile", "Confirm assigned Admin role"],
  ["permissions", "Review Admin permissions"],
  ["action_centre", "Learn Action Centre"],
  ["smart_hiring", "Open Smart Hiring"],
  ["test_application", "Review one test application"],
  ["assessment", "Review one assessment"],
  ["verification", "View Verification Centre"],
  ["suspicious_report", "Review Suspicious Activity queue"],
  ["test_portal", "Launch temporary client test portal"],
  ["system_health", "View System Health"],
  ["security_tutorial", "Complete security tutorial"]
] as const;

export function AdminGuidanceLayer({
  role
}: {
  role: string;
  adminUserId: string;
}) {
  const pathname = usePathname();
  const [state, setState] = useState<State | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const articles = useMemo(() => getRoleGuidanceArticles(role), [role]);
  const steps = role === "super_admin" ? masterSteps : roleSteps[role] || ["Overview Dashboard"];
  const current = Math.min(state?.current_step || 0, steps.length - 1);
  const pageArticle =
    articles.find((article) => article.href && pathname.startsWith(article.href)) ||
    articles[0];

  useEffect(() => {
    fetch("/api/admin/onboarding", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.ok) return;
        setState(payload.data);
        if (!payload.data.onboarding_completed && !payload.data.skipped_at) {
          setTourOpen(true);
        }
      })
      .catch(() => undefined);
  }, []);

  async function update(input: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/onboarding", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input)
      });
      const payload = await response.json();
      if (payload?.ok) setState(payload.data);
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    if (current >= steps.length - 1) {
      await update({ action: "complete" });
      setTourOpen(false);
      return;
    }
    await update({
      action: "progress",
      currentStep: current + 1,
      completedStepId: steps[current]
    });
  }

  async function restart() {
    await update({ action: "restart" });
    setTourOpen(true);
  }

  const completedCount = checklist.filter(
    ([key]) => state?.checklist_state?.[key]
  ).length;
  const checklistPercent = Math.round((completedCount / checklist.length) * 100);

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-4 font-bold text-wxIndigo800 shadow-lift"
        aria-label="How to use this page"
      >
        <HelpCircle className="h-4 w-4 text-wxViolet700" />
        <span className="hidden sm:inline">How to use this page</span>
      </button>

      {tourOpen && state ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-wxIndigo950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-tour-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") setTourOpen(false);
          }}
        >
          <section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-wxBorder bg-wxSurface p-6 shadow-lift">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-wxViolet700">
                  Step {current + 1} of {steps.length}
                </p>
                <h2 id="admin-tour-title" className="mt-2 text-2xl font-bold text-wxIndigo900">
                  {current === 0
                    ? "Welcome to the WriteX Super Admin Control Centre"
                    : steps[current]}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setTourOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-wxSurfaceSoft"
                aria-label="Close tutorial"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {current === 0 ? (
              <div className="mt-6 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                <p className="text-sm font-semibold text-wxIndigo600">Assigned role</p>
                <p className="mt-1 text-lg font-bold capitalize text-wxIndigo900">
                  {state.assigned_role.replace(/_/g, " ")}
                </p>
                <p className="mt-2 text-sm leading-6 text-wxIndigo500">
                  Confirm this assigned server role to start the matching tour. The
                  tutorial cannot change your permissions.
                </p>
              </div>
            ) : (
              <TourExplanation title={steps[current]} article={articles.find((item) => item.title.includes(steps[current])) || pageArticle} />
            )}
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-wxSurfaceSoft">
              <div
                className="h-full bg-brand-spectrum"
                style={{ width: `${((current + 1) / steps.length) * 100}%` }}
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={busy || current === 0}
                onClick={() =>
                  update({ action: "progress", currentStep: current - 1 })
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-4 font-bold text-wxIndigo700 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    await update({ action: "skip" });
                    setTourOpen(false);
                  }}
                  className="min-h-11 px-3 text-sm font-bold text-wxIndigo500 hover:underline"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    await update({ action: "complete" });
                    setTourOpen(false);
                  }}
                  className="min-h-11 px-3 text-sm font-bold text-wxIndigo500 hover:underline"
                >
                  Do not show again
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={next}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-wxViolet700 px-5 font-bold text-white"
                >
                  {current >= steps.length - 1 ? "Finish" : current === 0 ? "Confirm role" : "Next"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {drawerOpen ? (
        <>
          <button
            type="button"
            aria-label="Close help drawer"
            className="fixed inset-0 z-[70] bg-wxIndigo950/35"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Page help"
            className="fixed inset-y-0 right-0 z-[75] w-full max-w-md overflow-y-auto border-l border-wxBorder bg-wxSurface p-5 shadow-lift"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-wxViolet700">Page guidance</p>
                <h2 className="mt-1 text-xl font-bold text-wxIndigo900">
                  {pageArticle?.title || "How to use this page"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-wxSurfaceSoft"
                aria-label="Close help"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {pageArticle ? <TourExplanation title={pageArticle.title} article={pageArticle} /> : null}
            {pageArticle?.resources?.length ? (
              <section className="mt-6 rounded-lg border border-wxBorder p-4">
                <p className="text-xs font-bold uppercase text-wxIndigo400">Simple downloadable guide</p>
                <div className="mt-3 grid gap-2">
                  {pageArticle.resources.map((resource) => (
                    <a key={resource.href} href={resource.href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-md border border-wxBorder px-4 text-sm font-bold text-wxIndigo700 hover:border-wxViolet700">
                      {resource.label}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
            <section className="mt-6 rounded-lg border border-wxBorder p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-wxIndigo400">Onboarding checklist</p>
                  <p className="mt-1 font-bold text-wxIndigo900">{checklistPercent}% complete</p>
                </div>
                <ListChecks className="h-5 w-5 text-wxViolet700" />
              </div>
              <div className="mt-4 grid gap-2">
                {checklist.map(([key, label]) => (
                  <label key={key} className="flex min-h-10 items-center gap-3 text-sm text-wxIndigo700">
                    <input
                      type="checkbox"
                      checked={Boolean(state?.checklist_state?.[key])}
                      onChange={(event) =>
                        update({
                          action: "checklist",
                          checklistKey: key,
                          checklistValue: event.target.checked
                        })
                      }
                      className="h-4 w-4 accent-wxViolet700"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </section>
            <section className="mt-6">
              <p className="text-xs font-bold uppercase text-wxIndigo400">Related process</p>
              {adminProcessGuides.slice(0, 2).map((guide) => (
                <div key={guide.id} className="mt-3 rounded-md bg-wxSurfaceSoft p-3">
                  <p className="font-bold text-wxIndigo900">{guide.title}</p>
                  <p className="mt-1 text-xs leading-5 text-wxIndigo500">{guide.steps.join(" -> ")}</p>
                </div>
              ))}
            </section>
            <div className="mt-6 grid gap-2">
              <button type="button" onClick={() => setTourOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-wxViolet700 px-4 font-bold text-white">
                <BookOpen className="h-4 w-4" /> Watch guided tour
              </button>
              <button type="button" onClick={restart} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-wxBorder px-4 font-bold text-wxIndigo700">
                <RotateCcw className="h-4 w-4" /> Restart tutorial
              </button>
              <Link href="/admin/help" className="inline-flex min-h-11 items-center justify-center rounded-md border border-wxBorder px-4 font-bold text-wxIndigo700">
                Open Help & Tutorials
              </Link>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}

function TourExplanation({
  title,
  article
}: {
  title: string;
  article?: (typeof adminHelpArticles)[number];
}) {
  return (
    <div className="mt-5 grid gap-4 text-sm leading-6">
      <p className="text-wxIndigo600">
        {article?.purpose ||
          `${title} is part of your assigned operational workflow. Use only the actions permitted by your role and preserve the audit trail.`}
      </p>
      <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
        <p className="font-bold text-wxIndigo900">Primary actions</p>
        <ul className="mt-2 grid gap-1 text-wxIndigo600">
          {(article?.actions || ["Review the current state", "Take the documented next action", "Record a reason when required"]).map((item) => (
            <li key={item} className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />{item}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <p className="flex items-center gap-2 font-bold"><ShieldAlert className="h-4 w-4" />Common mistakes</p>
        <ul className="mt-2 list-disc pl-5">
          {(article?.mistakes || ["Do not bypass permissions or external-provider truth states."]).map((item) => <li key={item}>{item}</li>)}
        </ul>
        {article?.sensitive ? <p className="mt-2 font-semibold">{article.sensitive}</p> : null}
      </div>
    </div>
  );
}
