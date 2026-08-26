"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, MessageSquareText, Scale } from "lucide-react";
import { AdminActivityTimeline, AdminEmptyState, AdminStatus } from "@/components/admin/AdminPrimitives";
import { hiringRoleLabel } from "@/lib/hiring/domain";

type AssessmentDetail = {
  reference: string;
  applicationReference: string;
  role: string;
  state: string;
  deliveredForm: Array<{ questionId: string; version: number; order: number; section: string; category: string; prompt: string }>;
  accommodation: Record<string, unknown>;
  startedAt: string | null;
  submittedAt: string | null;
  expiresAt: string;
  createdAt: string;
  answers: Array<{ questionId: string; stableQuestionId: string; version: number; category: string; section: string; answer: string; revisionCount: number; savedAt: string; submittedAt: string | null }>;
  integrityEvents: Array<{ id: string; type: string; severity: string; metadata: Record<string, unknown>; occurredAt: string; reviewedAt: string | null; reviewOutcome: string | null }>;
  score: { automated: number | null; human: number | null; combined: number | null; breakdown: Record<string, unknown>; notes: string | null; recommendation: string | null; scoredAt: string | null } | null;
  audit: Array<{ id: string; action: string; entityType: string; metadata: Record<string, unknown>; createdAt: string }>;
};

const tabs = ["Responses", "Integrity", "Scoring", "Viva", "Session Log", "Audit"] as const;
type Tab = (typeof tabs)[number];

export function AssessmentReviewWorkspace({ detail }: { detail: AssessmentDetail }) {
  const [activeTab, setActiveTab] = useState<Tab>("Responses");
  return <div className="grid gap-6">
    <section className="grid gap-4 rounded-lg border border-wxBorder bg-white p-5 shadow-soft md:grid-cols-4">
      <Summary label="Session" value={detail.reference} />
      <Summary label="Application" value={detail.applicationReference} />
      <Summary label="Role" value={hiringRoleLabel(detail.role)} />
      <div><p className="text-xs font-bold uppercase text-wxIndigo500">State</p><div className="mt-2"><AdminStatus status={detail.state} /></div></div>
    </section>
    <div className="overflow-x-auto border-b border-wxBorder" role="tablist" aria-label="Assessment review sections">
      <div className="flex min-w-max gap-1">{tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} data-state={activeTab === tab ? "selected" : "default"} onClick={() => setActiveTab(tab)} className="wx-interactive-tab min-h-11 border-b-2 px-4 text-sm font-bold">{tab}</button>)}</div>
    </div>
    <section role="tabpanel" className="rounded-lg border border-wxBorder bg-white p-5 shadow-soft">
      {activeTab === "Responses" ? <Responses detail={detail} /> : null}
      {activeTab === "Integrity" ? <Integrity detail={detail} /> : null}
      {activeTab === "Scoring" ? <Scoring detail={detail} /> : null}
      {activeTab === "Viva" ? <Viva detail={detail} /> : null}
      {activeTab === "Session Log" ? <SessionLog detail={detail} /> : null}
      {activeTab === "Audit" ? <AdminActivityTimeline events={detail.audit.map((event) => ({ id: event.id, title: event.action.replace(/_/g, " "), detail: `Entity: ${event.entityType}`, timestamp: event.createdAt }))} /> : null}
    </section>
  </div>;
}

function Responses({ detail }: { detail: AssessmentDetail }) {
  if (!detail.deliveredForm.length) return <AdminEmptyState title="No delivered questions" description="This session does not contain a delivered assessment form." />;
  const answers = new Map(detail.answers.map((answer) => [answer.questionId, answer]));
  return <div className="grid gap-5"><header><h2 className="text-xl font-bold">Submitted responses</h2><p className="mt-1 text-sm text-wxIndigo500">Exact delivered prompts, versions and candidate responses are retained together.</p></header>{detail.deliveredForm.sort((left, right) => left.order - right.order).map((question) => { const answer = answers.get(question.questionId); return <article key={question.questionId} className="rounded-md border border-wxBorder p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase text-wxViolet700">Question {question.order} / Version {question.version}</p><span className="text-xs text-wxIndigo500">{question.section} / {question.category.replace(/_/g, " ")}</span></div><h3 className="mt-3 font-bold leading-7 text-wxIndigo900">{question.prompt}</h3><div className="mt-4 rounded-md bg-wxSurfaceSoft p-4 text-sm leading-7 whitespace-pre-wrap">{answer?.answer || "No submitted answer."}</div>{answer ? <p className="mt-2 text-xs text-wxIndigo500">Revisions: {answer.revisionCount} / Last saved {new Date(answer.savedAt).toLocaleString("en-IN")}</p> : null}</article>; })}</div>;
}

function Integrity({ detail }: { detail: AssessmentDetail }) {
  if (!detail.integrityEvents.length) return <AdminEmptyState title="No integrity signals" description="No advisory copy, focus, connection or session events were recorded." />;
  return <div className="grid gap-4"><div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><AlertTriangle className="mb-2 h-5 w-5" />These signals are advisory. They are not proof of misconduct and cannot make a hiring decision.</div>{detail.integrityEvents.map((event) => <article key={event.id} className="flex flex-col gap-3 rounded-md border border-wxBorder p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold capitalize">{event.type.replace(/_/g, " ")}</p><p className="mt-1 text-xs text-wxIndigo500">{new Date(event.occurredAt).toLocaleString("en-IN")}</p></div><AdminStatus status={event.reviewedAt ? event.reviewOutcome || "reviewed" : event.severity} /></article>)}{detail.integrityEvents.some((event) => !event.reviewedAt) ? <IntegrityReviewForm sessionReference={detail.reference} /> : null}</div>;
}

function IntegrityReviewForm({ sessionReference }: { sessionReference: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("busy");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/hiring/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resource: "integrity_review",
          sessionReference,
          outcome: form.get("outcome"),
          notes: form.get("notes"),
          reason: form.get("reason"),
          explicitConfirmation: form.get("explicitConfirmation") === "on"
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Integrity review could not be saved.");
      setState("success");
      setMessage(`${payload.data.reviewedEvents} event(s) reviewed. No automatic hiring decision was made.`);
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Integrity review could not be saved.");
    }
  }
  const classes = "mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-white px-3 py-2 text-sm";
  return <form onSubmit={submit} className="mt-2 grid gap-4 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"><div><h3 className="font-bold text-wxIndigo900">Human integrity review</h3><p className="mt-1 text-sm text-wxIndigo500">Resolve the current unreviewed signals without deleting or altering the evidence.</p></div><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Outcome<select name="outcome" className={classes}><option value="acknowledged">Acknowledged</option><option value="false_positive">False positive</option><option value="requires_viva">Requires viva</option><option value="requires_investigation">Requires investigation</option><option value="cleared_after_review">Cleared after review</option></select></label><label className="text-sm font-bold">Review reason<input required name="reason" minLength={3} maxLength={500} className={classes}/></label></div><label className="text-sm font-bold">Reviewer notes<textarea required name="notes" minLength={3} maxLength={3000} rows={4} className={classes}/></label><label className="flex min-h-12 items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-950"><input required type="checkbox" name="explicitConfirmation"/>I confirm these events were reviewed by a person and are not treated as automatic proof or rejection.</label><button disabled={state==="busy"} className="inline-flex min-h-11 items-center justify-center rounded-md bg-wxViolet700 px-5 font-bold text-white disabled:opacity-60">Save integrity review</button>{message?<p role={state==="error"?"alert":"status"} className={`rounded-md border p-3 text-sm ${state==="error"?"border-red-200 bg-red-50 text-red-800":"border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{message}</p>:null}</form>;
}

function Scoring({ detail }: { detail: AssessmentDetail }) {
  if (!detail.score) return <AdminEmptyState title="Human scoring pending" description="An authorised assessor must review the submitted work before a recommendation is recorded." />;
  return <div className="grid gap-5"><div className="grid gap-4 sm:grid-cols-3"><Score label="Automated advisory" value={detail.score.automated} /><Score label="Human score" value={detail.score.human} /><Score label="Combined score" value={detail.score.combined} /></div><div className="rounded-md bg-wxSurfaceSoft p-4"><p className="font-bold">Recommendation</p><p className="mt-2 capitalize">{detail.score.recommendation?.replace(/_/g, " ") || "Not recorded"}</p>{detail.score.notes ? <p className="mt-3 text-sm leading-6 text-wxIndigo500">{detail.score.notes}</p> : null}</div></div>;
}

function Viva({ detail }: { detail: AssessmentDetail }) {
  const vivaQuestions = detail.deliveredForm.filter((question) => question.section === "viva" || question.category === "viva");
  return <div><h2 className="text-xl font-bold">Viva review</h2><p className="mt-1 text-sm text-wxIndigo500">Viva evidence remains separate from automated signals and requires a human assessor.</p>{vivaQuestions.length ? <div className="mt-5 grid gap-3">{vivaQuestions.map((question) => <div key={question.questionId} className="rounded-md border border-wxBorder p-4"><MessageSquareText className="h-5 w-5 text-wxViolet700" /><p className="mt-3 font-bold">{question.prompt}</p></div>)}</div> : <div className="mt-5"><AdminEmptyState title="No viva question delivered" description="A separate role-specific viva can be scheduled through Interview Operations." /></div>}</div>;
}

function SessionLog({ detail }: { detail: AssessmentDetail }) {
  const events = [
    { id: "created", title: "Session created", timestamp: detail.createdAt },
    ...(detail.startedAt ? [{ id: "started", title: "Assessment started", timestamp: detail.startedAt }] : []),
    ...(detail.submittedAt ? [{ id: "submitted", title: "Assessment submitted and locked", timestamp: detail.submittedAt }] : []),
    { id: "expires", title: "Session expiry", timestamp: detail.expiresAt }
  ];
  return <div className="grid gap-5"><AdminActivityTimeline events={events} /><div className="rounded-md border border-wxBorder p-4"><p className="font-bold">Accommodation record</p><pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-wxIndigo500">{JSON.stringify(detail.accommodation, null, 2)}</pre></div></div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase text-wxIndigo500">{label}</p><p className="mt-2 break-words font-bold capitalize text-wxIndigo900">{value}</p></div>;
}

function Score({ label, value }: { label: string; value: number | null }) {
  const Icon = value === null ? ClipboardList : value >= 60 ? CheckCircle2 : Scale;
  return <div className="rounded-md border border-wxBorder p-4"><Icon className="h-5 w-5 text-wxViolet700" /><p className="mt-3 text-xs font-bold uppercase text-wxIndigo500">{label}</p><p className="mt-1 text-3xl font-bold">{value === null ? "N/A" : value}</p></div>;
}
