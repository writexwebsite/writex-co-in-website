import type { Metadata } from "next";
import type { ReactNode } from "react";
import { randomUUID } from "crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  FileText,
  NotebookPen,
  UserRound
} from "lucide-react";
import { EligibilityReviewForm } from "@/components/admin/EligibilityReviewForm";
import { CandidateDocumentActions } from "@/components/admin/CandidateDocumentActions";
import { HiringOperationsConsole } from "@/components/admin/HiringOperationsConsole";
import { CandidateReviewControls } from "@/components/admin/CandidateReviewControls";
import { SalesVideoReviewForm } from "@/components/admin/SalesVideoReviewForm";
import {
  AdminActivityTimeline,
  AdminButton,
  AdminEmptyState,
  AdminPanel,
  AdminStatus,
  humaniseAdminStatus
} from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  canManageSmartHiring,
  canViewHiringCandidateIdentity,
  canUseHiringPermission
} from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getHiringApplicationDetail } from "@/lib/hiring/admin";
import {
  hiringRoleLabel,
  type HiringRole
} from "@/lib/hiring/domain";
import { getHiringWorkflow } from "@/lib/hiring/workflow";
import { listActiveHiringPeople } from "@/lib/hiring/access";

export const metadata: Metadata = {
  title: "Candidate Profile | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function CandidateProfilePage({
  params
}: {
  params: Promise<{ reference: string }>;
}) {
  const session = await requireAdminSession();
  if (!canManageSmartHiring(session)) notFound();
  const { reference } = await params;
  const revealContact = canViewHiringCandidateIdentity(session);
  let item: Awaited<ReturnType<typeof getHiringApplicationDetail>>;
  try {
    item = await getHiringApplicationDetail(reference, { revealContact });
  } catch (error) {
    const safeReference = randomUUID();
    const errorCode = (error as { code?: string }).code;
    console.error("Hiring application detail load failed", {
      route: "/admin/hiring/applications/[reference]",
      applicationReference: reference.replace(/[^A-Za-z0-9-]/g, "").slice(0, 80),
      adminUserId: session.adminUserId,
      correlationId: safeReference,
      category:
        errorCode === "42P01"
          ? "schema_prerequisite_missing"
          : errorCode === "22P02"
            ? "invalid_identifier"
            : "application_detail_load_failed",
      timestamp: new Date().toISOString()
    });
    return (
      <AdminShell
        session={session}
        eyebrow="Smart Hiring / Candidate"
        title="Unable to load application"
        description="The application remains stored. Retry the request or use the safe reference below for an audit review."
      >
        <AdminPanel title="Application detail unavailable">
          <p className="text-sm leading-6 text-wxIndigo600">
            Safe reference ID:{" "}
            <span className="font-mono font-semibold text-wxIndigo900">
              {safeReference}
            </span>
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <AdminButton href={`/admin/hiring/applications/${encodeURIComponent(reference)}`}>
              Retry
            </AdminButton>
            <AdminButton href="/admin/system-health">Open System Health</AdminButton>
            {canUseHiringPermission(session, "hiring.audit.view") ? (
              <AdminButton href="/admin/audit-logs">Open Audit</AdminButton>
            ) : null}
          </div>
        </AdminPanel>
      </AdminShell>
    );
  }
  if (!item) notFound();
  const hiringPeople=await listActiveHiringPeople();
  const canManage = canUseHiringPermission(
    session,
    "hiring.applications.manage"
  );
  const salesVideo=item.files.find((file)=>file.file_type==="video_introduction"&&!file.revoked_at&&!file.deleted_at);
  const workflow=getHiringWorkflow({role:item.role,stage:item.stage,assignedReviewer:Boolean(item.assignedReviewer),hasEligibility:Boolean(item.eligibility),hasAssessment:Boolean(item.assessment),assessmentState:item.assessment?.state||null,hasSystemReview:Boolean(item.systemReview),hasAdminReview:Boolean(item.adminReview),hasInterview:item.interviews.length>0,interviewCompleted:item.interviews.some((interview)=>interview.status==="completed"),hasFinalDecision:Boolean(item.finalDecision),hasSalesVideo:Boolean(salesVideo),hasSalesVideoReview:Boolean(item.videoReview)});
  const next = workflow.next;
  const operationView = candidateOperationView(item.stage);
  const finalDecisionReady = Boolean(item.adminReview) && (
    !["accept", "request_viva"].includes(item.adminReview?.decision || "")
    || item.stage === "interview_completed"
  );
  const verificationBlocker =
    item.verification.find((check) =>
      ["unable_to_verify", "review_required", "blocked"].includes(check.status)
    ) || null;

  return (
    <AdminShell
      session={session}
      eyebrow="Smart Hiring / Candidate"
      title={item.candidate.name}
      description={`${item.reference} / ${humaniseAdminStatus(item.role)} / Updated ${new Date(item.updatedAt).toLocaleString("en-IN")}`}
      actions={
        <>
          <AdminButton href="/admin/hiring/applications" icon={<ArrowLeft className="h-4 w-4" />}>
            Applications
          </AdminButton>
          {canManage ? (
            <AdminButton href={next.href} tone="primary">
              {next.label}
            </AdminButton>
          ) : null}
        </>
      }
      nextAction={{
        label: next.label,
        reason: next.reason,
        href: canManage ? next.href : "#candidate-application"
      }}
    >
      <div className="mb-6 overflow-x-auto rounded-md border border-wxBorder bg-wxSurface p-2 shadow-soft">
        <nav className="flex min-w-max gap-1" aria-label="Candidate profile sections">
          {[
            ["Candidate", "#candidate-application", UserRound],
            ["Evidence", "#candidate-files", FileText],
            ["Assessment", "#candidate-assessment", NotebookPen],
            ["Reviews", "#candidate-system-review", Activity],
            ["Interview", "#candidate-interview", UserRound],
            ["Outcome", "#candidate-decision", CheckCircle2]
          ].map(([label, href, Icon]) => {
            const IconComponent = Icon as typeof UserRound;
            return (
              <Link
                key={String(label)}
                href={String(href)}
                className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-wxIndigo600 hover:bg-wxSurfaceSoft hover:text-wxViolet700"
              >
                <IconComponent className="h-4 w-4" />
                {String(label)}
              </Link>
            );
          })}
        </nav>
      </div>

      <ol className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-6" aria-label="Candidate hiring progress">
        {workflow.steps.map((step,index)=><li key={step.label} className={`rounded-md border p-3 text-sm font-bold ${step.complete?"border-emerald-200 bg-emerald-50 text-emerald-900":"border-wxBorder bg-wxSurfaceSoft text-wxIndigo500"}`}><span className="mr-2">{index+1}.</span>{step.label}</li>)}
      </ol>

      {workflow.blockers.length?<div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4"><div className="flex items-start gap-3"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-800"/><div><p className="font-semibold text-amber-950">{workflow.blockers[0].title}</p><p className="mt-1 text-sm leading-6 text-amber-900">{workflow.blockers[0].detail}</p><Link href={workflow.blockers[0].href} className="mt-2 inline-flex min-h-10 items-center font-semibold text-wxViolet700 underline">{workflow.blockers[0].action}</Link></div></div></div>:null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div id="candidate-application" style={{ order: 10 }}>
            <AdminPanel
              title="Application"
              description={
                revealContact
                  ? "Authorised hiring contact information and the current approved hiring state."
                  : "Contact information is masked for this hiring role."
              }
            >
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Application reference" value={item.reference} />
                <Detail label="Candidate reference" value={item.candidateReference} />
                <Detail label="Role" value={humaniseAdminStatus(item.role)} />
                <Detail label="Owner" value={item.assignedReviewer || "Unassigned"} />
                <Detail label="Email" value={item.candidate.email} />
                <Detail label="Mobile" value={item.candidate.mobile} />
                <Detail
                  label="City"
                  value={item.candidate.city || "Not provided"}
                />
                <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-wxIndigo400">
                    Current stage
                  </dt>
                  <dd className="mt-2">
                    <AdminStatus status={item.stage} />
                  </dd>
                </div>
              </dl>
            </AdminPanel>
          </div>

          <div id="candidate-details" style={{ order: 11 }}>
            <ApplicationDataPanel payload={item.applicationPayload} />
          </div>

          <div id="candidate-files" style={{ order: 20 }}>
            <AdminPanel
              title="CV & Files"
              description="Safe file names and scan state only. S3 keys and public URLs are not shown."
            >
              {item.files.filter((file)=>file.file_type!=="video_introduction").length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {item.files.filter((file)=>file.file_type!=="video_introduction").map((file) => (
                    <article
                      key={file.id}
                      className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-wxIndigo900">
                            {humaniseAdminStatus(file.file_type)}
                          </p>
                          <p className="mt-1 truncate text-xs text-wxIndigo500">
                            {file.safe_file_name} /{" "}
                            {Math.ceil(file.file_size / 1024)} KB
                          </p>
                        </div>
                        <AdminStatus status={file.malware_scan_status} />
                      </div>
                      <CandidateDocumentActions
                        fileId={file.id}
                        fileName={file.safe_file_name}
                        mimeType={file.mime_type}
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <AdminEmptyState
                  title="No candidate files"
                  description="Files appear only after an approved upload workflow."
                />
              )}
            </AdminPanel>
          </div>

          {item.role==="sales_executive"?<div id="candidate-video" style={{order:25}}><AdminPanel title="Sales video introduction" description="Private 60-120 second candidate evidence. Watch through the audited preview, then record a structured human review. No automated body-language or appearance inference is used.">{salesVideo?<div><div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-wxIndigo900">{salesVideo.safe_file_name}</p><p className="mt-1 text-xs text-wxIndigo500">{salesVideo.capture_source?.toLowerCase()||"submitted"} / {salesVideo.duration_seconds||"unknown"} seconds / private S3</p></div><AdminStatus status={salesVideo.malware_scan_status}/></div><CandidateDocumentActions fileId={salesVideo.id} fileName={salesVideo.safe_file_name} mimeType={salesVideo.mime_type}/></div>{item.videoReview?<div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><p className="font-semibold">Human review recorded by {item.videoReview.reviewer}</p><p className="mt-1">Recommendation: {humaniseAdminStatus(item.videoReview.recommendation)}. {item.videoReview.notes}</p></div>:null}{canManage?<SalesVideoReviewForm applicationReference={item.reference} candidateFileId={salesVideo.id} initialReview={item.videoReview}/>:null}</div>:<AdminEmptyState title="Video introduction missing" description="Request the consented Sales video before continuing eligibility review."/>}</AdminPanel></div>:null}

          <div id="candidate-eligibility" style={{ order: 30 }}>
            <AdminPanel title="Eligibility" description="System eligibility evidence and the recorded human review remain visible separately.">
              {item.eligibility?<dl className="grid gap-3 sm:grid-cols-3"><Detail label="Automated score" value={`${item.eligibility.automatedScore}/100`}/><Detail label="System outcome" value={humaniseAdminStatus(item.eligibility.systemOutcome)}/><Detail label="Reviewer outcome" value={humaniseAdminStatus(item.eligibility.reviewerOutcome)}/></dl>:<AdminEmptyState title="Eligibility not reviewed" description="Complete the eligibility checklist before releasing an assessment."/>}
            </AdminPanel>
          </div>

          <div id="candidate-assessment" style={{ order: 40 }}>
            <AdminPanel title="Assessment" description="Candidate-specific questions are released one at a time and locked with their exact versions on submission.">
              {item.assessment?<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-sm font-bold text-wxIndigo900">{item.assessment.reference}</p><p className="mt-1 text-sm text-wxIndigo500">{humaniseAdminStatus(item.assessment.state)}</p></div><AdminButton href={`/admin/hiring/assessments/${encodeURIComponent(item.assessment.reference)}`}>Open submitted assessment</AdminButton></div>:<AdminEmptyState title="Assessment not started" description="Invite the candidate after eligibility review."/>}
            </AdminPanel>
          </div>

          <div id="candidate-system-review" style={{ order: 50 }}>
            <AdminPanel title="System Review" description="A versioned, rules-based review. It does not replace Admin Review or the final human decision.">
              {item.systemReview?<div className="grid gap-4"><div className="grid gap-3 sm:grid-cols-4"><Detail label="Recommendation" value={humaniseAdminStatus(item.systemReview.recommendation)}/><Detail label="Assessment score" value={item.systemReview.assessmentScore===null?"Human scoring required":`${item.systemReview.assessmentScore}/100`}/><Detail label="Integrity risk" value={humaniseAdminStatus(item.systemReview.integrityRisk)}/><Detail label="Confidence" value={humaniseAdminStatus(item.systemReview.confidence)}/></div><ul className="grid gap-2 text-sm leading-6 text-wxIndigo600">{item.systemReview.reasoning.map(reason=><li key={reason} className="rounded-md bg-wxSurfaceSoft p-3">{reason}</li>)}</ul>{item.systemReview.attention.length?<div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{item.systemReview.attention.join(" ")}</div>:null}</div>:<AdminEmptyState title="System Review pending" description="It is generated after a submitted assessment or can be recalculated below."/>}
            </AdminPanel>
          </div>

          <div id="candidate-integrity" style={{ order: 60 }}>
            <AdminPanel title="Integrity" description="Signals are advisory evidence. They never label a candidate or create an automatic rejection by themselves."><dl className="grid gap-3 sm:grid-cols-3"><Detail label="Recorded signals" value={String(item.integrity.total)}/><Detail label="Needs review" value={String(item.integrity.reviewRequired)}/><Detail label="Reviewed" value={String(item.integrity.reviewed)}/></dl></AdminPanel>
          </div>

          <div id="candidate-admin-review" style={{ order: 80 }}>
            <AdminPanel title="Admin Review" description="The authorised reviewer records an independent human conclusion and any reasoned override.">
              {item.adminReview?<div className="grid gap-3 sm:grid-cols-3"><Detail label="Decision" value={humaniseAdminStatus(item.adminReview.decision)}/><Detail label="System relationship" value={humaniseAdminStatus(item.adminReview.recommendationAction)}/><Detail label="Reviewer" value={item.adminReview.reviewer}/>{item.adminReview.overrideReason?<div className="sm:col-span-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Override: {item.adminReview.overrideReason}</div>:null}</div>:<AdminEmptyState title="Admin Review pending" description="Review the System result, candidate evidence and integrity context before recording a human decision."/>}
            </AdminPanel>
          </div>

          <div id="candidate-decision" style={{ order: 90 }}>
            <AdminPanel title="Decision" description="This is the authoritative hiring outcome and remains separate from the two review layers.">{item.finalDecision?<dl className="grid gap-3 sm:grid-cols-3"><Detail label="Outcome" value={humaniseAdminStatus(item.finalDecision.outcome)}/><Detail label="Decided by" value={item.finalDecision.decidedBy}/><Detail label="Date" value={new Date(item.finalDecision.decidedAt).toLocaleString("en-IN")}/><div className="sm:col-span-3 rounded-md bg-wxSurfaceSoft p-3 text-sm text-wxIndigo700">{item.finalDecision.reason}</div></dl>:<AdminEmptyState title="No final decision" description={!item.adminReview?"Complete Admin Review first.":item.stage==="interview_completed"?"The completed interview is ready for an authorised Final Decision.":"Complete the required Viva or interview before recording the Final Decision."}/>}</AdminPanel>
          </div>

          <div id="candidate-history" style={{ order: 110 }}>
            <AdminPanel
              title="History"
              description="Submission, stage and notification activity for this application."
            >
              <AdminActivityTimeline
                events={[
                  ...item.history.map((event, index) => ({
                    id: `${event.changed_at}-${index}`,
                    title:
                      event.new_stage === "application_received"
                        ? "New application received"
                        : humaniseAdminStatus(event.new_stage),
                    detail: event.reason,
                    timestamp: event.changed_at
                  })),
                  ...item.notifications.map((notification, index) => ({
                    id: `${notification.created_at}-notification-${index}`,
                    title: humaniseAdminStatus(notification.notification_type),
                    detail: `Delivery ${humaniseAdminStatus(notification.status)}${notification.provider ? ` via ${notification.provider}` : ""}`,
                    timestamp: notification.sent_at || notification.created_at
                  }))
                ].sort(
                  (left, right) =>
                    new Date(right.timestamp).getTime() -
                    new Date(left.timestamp).getTime()
                )}
              />
            </AdminPanel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2" style={{ order: 12 }}>
            <AdminPanel
              title="Consent records"
              description="Policy-versioned candidate consent recorded with the application."
            >
              {item.consents.length ? (
                <div className="grid gap-3">
                  {item.consents.map((consent) => (
                    <div
                      key={`${consent.consent_type}-${consent.policy_version}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
                    >
                      <div>
                        <p className="font-semibold text-wxIndigo900">
                          {humaniseAdminStatus(consent.consent_type)}
                        </p>
                        <p className="mt-1 text-xs text-wxIndigo500">
                          {consent.policy_version}
                        </p>
                      </div>
                      <AdminStatus
                        status={
                          consent.withdrawn_at
                            ? "withdrawn"
                            : consent.granted
                              ? "granted"
                              : "not_granted"
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <AdminEmptyState
                  title="No consent records"
                  description="No application consent record is linked."
                />
              )}
            </AdminPanel>

            <AdminPanel
              title="Relationship disclosure"
              description="Declared connections require human review and never cause automatic rejection."
            >
              {item.relationship ? (
                <dl className="grid gap-3">
                  <SummaryRow
                    label="Connection declared"
                    value={item.relationship.disclosed ? "Yes" : "No"}
                  />
                  {item.relationship.disclosed ? (
                    <>
                      <SummaryRow
                        label="Name"
                        value={item.relationship.name || "Restricted"}
                      />
                      <SummaryRow
                        label="Relationship"
                        value={item.relationship.type || "Not provided"}
                      />
                      <SummaryRow
                        label="Role"
                        value={
                          item.relationship.role
                            ? hiringRoleLabel(item.relationship.role)
                            : "Not provided"
                        }
                      />
                    </>
                  ) : null}
                </dl>
              ) : (
                <AdminEmptyState
                  title="No disclosure record"
                  description="No relationship disclosure is linked."
                />
              )}
            </AdminPanel>
          </div>

          <div id="candidate-communication" style={{ order: 100 }}><AdminPanel
            title="Communication"
            description="Candidate acknowledgement and internal hiring delivery are recorded separately. Failed delivery can be retried below."
          >
            {item.notifications.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {item.notifications.map((notification, index) => (
                  <article
                    key={`${notification.notification_type}-${notification.created_at}-${index}`}
                    className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-wxIndigo900">
                          {humaniseAdminStatus(notification.notification_type)}
                        </p>
                        <p className="mt-1 text-xs text-wxIndigo500">
                          {notification.sent_at
                            ? new Date(notification.sent_at).toLocaleString("en-IN")
                            : new Date(notification.created_at).toLocaleString("en-IN")}
                          {notification.provider
                            ? ` / ${notification.provider}`
                            : ""}
                        </p>
                      </div>
                      <AdminStatus status={notification.status} />
                    </div>
                    {notification.safe_failure_reason ? (
                      <p className="mt-3 text-xs text-red-700">
                        {humaniseAdminStatus(notification.safe_failure_reason)}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <AdminEmptyState
                title="No notification activity"
                description="Use the audited retry action after confirming production email health."
              />
            )}
          </AdminPanel></div>

          <div id="candidate-interview" style={{ order: 70 }}>
            <div className="grid gap-6 lg:grid-cols-2">
              <AdminPanel title="Interview / Viva">
                {item.interviews.length ? (
                  <div className="grid gap-3">
                    {item.interviews.map((interview) => (
                      <div
                        key={interview.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
                      >
                        <div>
                          <p className="font-semibold text-wxIndigo900">
                            {humaniseAdminStatus(interview.interview_type)}
                          </p>
                          <p className="mt-1 text-xs text-wxIndigo500">
                            {interview.scheduled_at
                              ? new Date(
                                  interview.scheduled_at
                                ).toLocaleString("en-IN")
                              : "Not scheduled"}
                          </p>
                        </div>
                        <AdminStatus status={interview.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <AdminEmptyState
                    title="No interview"
                    description="No interview record is linked to this application."
                  />
                )}
              </AdminPanel>
              <AdminPanel title="Verification">
                {item.verification.length ? (
                  <div className="grid gap-3">
                    {item.verification.map((check) => (
                      <div
                        key={check.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
                      >
                        <p className="font-semibold text-wxIndigo900">
                          {humaniseAdminStatus(check.verification_type)}
                        </p>
                        <AdminStatus status={check.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <AdminEmptyState
                    title="No verification case"
                    description="No consent-led verification case is linked."
                  />
                )}
              </AdminPanel>
            </div>
          </div>

          <div id="candidate-audit" style={{ order: 111 }}>
            <AdminPanel title="Hiring audit trail">
              <AdminActivityTimeline
                events={item.audit.map((event, index) => ({
                  id: `${event.created_at}-${index}`,
                  title: humaniseAdminStatus(event.action),
                  detail: humaniseAdminStatus(event.entity_type),
                  timestamp: event.created_at
                }))}
              />
            </AdminPanel>
          </div>

          {canManage ? (
            <div className="space-y-6" style={{ order: 120 }}>
              <EligibilityReviewForm
                applicationReference={item.reference}
                role={item.role as HiringRole}
              />
              <CandidateReviewControls
                applicationReference={item.reference}
                systemRecommendation={item.systemReview?.recommendation||null}
                hasSubmittedAssessment={item.assessment?.state==="submitted"}
                hasSystemReview={Boolean(item.systemReview)}
                hasAdminReview={Boolean(item.adminReview)}
                hasFinalDecision={Boolean(item.finalDecision)}
                finalDecisionReady={finalDecisionReady}
              />
              <div id="candidate-action">
                <HiringOperationsConsole
                  view={operationView}
                  applicationReference={item.reference}
                  hiringPeople={hiringPeople}
                  interviews={item.interviews}
                />
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <AdminPanel title="Record summary">
            <dl className="grid gap-4 text-sm">
              <SummaryRow
                label="Current stage"
                value={<AdminStatus status={item.stage} />}
              />
              <SummaryRow label="Next action" value={next.label} />
              <SummaryRow
                label="Assigned reviewer"
                value={item.assignedReviewer || "Unassigned"}
              />
              <SummaryRow
                label="Assessment"
                value={
                  item.assessment
                    ? humaniseAdminStatus(item.assessment.state)
                    : "Not started"
                }
              />
              <SummaryRow
                label="Notification"
                value={
                  item.notifications[0]
                    ? humaniseAdminStatus(item.notifications[0].status)
                    : "Not recorded"
                }
              />
              <SummaryRow
                label="Retention"
                value={humaniseAdminStatus(item.retention.state)}
              />
              <SummaryRow
                label="Legal hold"
                value={item.retention.legalHold ? "Active" : "No"}
              />
            </dl>
          </AdminPanel>

          <AdminPanel title="Blockers and approvals">
            {workflow.blockers.length ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <CircleAlert className="h-5 w-5" />
                <p className="mt-2 text-sm font-semibold">
                  {workflow.blockers[0].title}
                </p>
                <p className="mt-1 text-xs leading-5">
                  {workflow.blockers[0].detail}
                </p>
              </div>
            ) : verificationBlocker ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950"><CircleAlert className="h-5 w-5"/><p className="mt-2 text-sm font-semibold">{humaniseAdminStatus(verificationBlocker.verification_type)}</p><p className="mt-1 text-xs leading-5">{humaniseAdminStatus(verificationBlocker.status)}</p></div>
            ) : (
              <p className="text-sm leading-6 text-wxIndigo500">
                No verification blocker is currently recorded.
              </p>
            )}
          </AdminPanel>
        </aside>
      </div>
    </AdminShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-wxIndigo400">
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-semibold text-wxIndigo900">
        {value}
      </dd>
    </div>
  );
}

function SummaryRow({
  label,
  value
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-wxIndigo500">{label}</dt>
      <dd className="text-right font-semibold text-wxIndigo900">{value}</dd>
    </div>
  );
}

function ApplicationDataPanel({
  payload
}: {
  payload: Record<string, unknown>;
}) {
  const entries = Object.entries(payload).flatMap(([key, value]) =>
    key === "roleDetails" && value && typeof value === "object"
      ? Object.entries(value as Record<string, unknown>)
      : ([[key, value]] as Array<[string, unknown]>)
  );
  const legacy = entries.some(
    ([key, value]) =>
      key === "engagementPreference" ||
      (key === "availability" &&
        /\b(freelance|part[- ]?time|hourly|contract)\b/i.test(String(value)))
  );
  return (
    <AdminPanel
      title="Submitted details"
      description="Original values are preserved. Retired options are labelled as legacy rather than rewritten."
    >
      {legacy ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-950">
          This application contains values from a retired form option.
        </p>
      ) : null}
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
          >
            <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-wxIndigo400">
              {humaniseAdminStatus(key)}
            </dt>
            <dd className="mt-2 break-words text-sm font-medium text-wxIndigo700">
              {String(value ?? "Not provided")}
            </dd>
          </div>
        ))}
      </dl>
    </AdminPanel>
  );
}

function candidateOperationView(stage: string): "applications" | "assessments" | "interviews" | "talent" {
  if (["eligibility_review", "assessment_invited", "assessment_started", "assessment_submitted", "under_review"].includes(stage)) return "assessments";
  if (["shortlisted", "interview_scheduled", "interview_completed"].includes(stage)) return "interviews";
  if (stage === "talent_pool") return "talent";
  return "applications";
}
