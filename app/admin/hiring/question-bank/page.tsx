import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminButton, AdminEmptyState, AdminPanel, AdminStatusBadge } from "@/components/admin/AdminPrimitives";
import { QuestionBankActions } from "@/components/admin/QuestionBankActions";
import { AdminShell } from "@/components/admin/AdminShell";
import { QuestionBankManager } from "@/components/admin/QuestionBankManager";
import { canManageSmartHiring, canUseHiringPermission } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getHiringAdminSnapshot } from "@/lib/hiring/admin";
import { hiringRoleLabel } from "@/lib/hiring/domain";

export const metadata:Metadata={title:"Assessment Questions | WriteX Admin",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";

export default async function QuestionBankPage(){
  const session=await requireAdminSession();if(!canManageSmartHiring(session))notFound();
  const data=await getHiringAdminSnapshot();
  const canManage=canUseHiringPermission(session,"hiring.question_bank.manage");
  return <AdminShell session={session} eyebrow="Smart Hiring" title="Assessment Questions" description="Create, preview, version and publish the exact questions delivered to candidates. Used versions remain immutable and auditable." actions={canManage?<AdminButton href="#create-assessment-question" tone="primary">Add question</AdminButton>:undefined}>
    <AdminPanel title="Published bank and working drafts" description="Only active versions can be selected by the server-side assessment release. Drafts and disabled versions stay private.">
      {data.questions.length?<div className="grid gap-4">{data.questions.map(q=><article key={`${q.id}-${q.version}`} className="rounded-md border border-wxBorder bg-wxSurface p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="font-mono text-sm font-bold text-wxIndigo900">{q.id} / v{q.version}</p><h3 className="mt-1 font-bold text-wxIndigo900">{q.title}</h3><p className="mt-1 text-sm text-wxIndigo500">{hiringRoleLabel(q.role)} / {q.category.replace(/_/g," ")} / {q.difficulty} / {q.maximumScore} points</p></div><div className="flex flex-wrap gap-2"><AdminStatusBadge tone={q.protected?"warning":"neutral"}>{q.protected?"Protected base":"Custom"}</AdminStatusBadge><AdminStatusBadge tone={q.active?"success":q.lifecycleStatus==="draft"?"info":"neutral"}>{q.lifecycleStatus.replace(/_/g," ")}</AdminStatusBadge></div></div><div className="mt-3 grid gap-2 text-xs text-wxIndigo500 sm:grid-cols-3"><span>{q.answerType.replace(/_/g," ")}</span><span>{q.expectedTimeMinutes} minutes</span><span>Order {q.displayOrder}</span></div>{canManage?<div className="mt-4"><QuestionBankActions question={{stableQuestionId:q.id,version:q.version,role:q.role,title:q.title,category:q.category,section:q.section,difficulty:q.difficulty,prompt:q.prompt,instructions:q.instructions,sourceMaterial:q.sourceMaterial,answerType:q.answerType,expectedTimeMinutes:q.expectedTimeMinutes,maximumScore:q.maximumScore,required:q.required,randomizationEligible:q.randomizationEligible,backNavigationRule:q.backNavigationRule,variants:q.variants,scoringRubric:q.scoringRubric,autoScoringRule:q.autoScoringRule,expectedCompetencies:q.expectedCompetencies,humanReviewRequired:q.humanReviewRequired,antiCheatSensitivity:q.antiCheatSensitivity,vivaFollowUpRequired:q.vivaFollowUpRequired,displayOrder:q.displayOrder,active:q.active,protectedQuestion:q.protected,usage:q.usage,lifecycleStatus:q.lifecycleStatus,contentHash:q.contentHash}}/></div>:null}</article>)}</div>:<AdminEmptyState title="Question bank is not seeded" description="Apply the protected production seed before releasing an assessment."/>}
    </AdminPanel>
    {canManage?<div className="mt-6" id="create-assessment-question"><QuestionBankManager/></div>:null}
  </AdminShell>;
}
