import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminButton, AdminPanel } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { HiringApplicationOptionManager } from "@/components/admin/HiringApplicationOptionManager";
import { HiringRulesManager } from "@/components/admin/HiringRulesManager";
import { canManageSmartHiring, canUseHiringPermission } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getHiringOptions } from "@/lib/hiring/application-option-store";
import { getSmartHiringRules } from "@/lib/hiring/hiring-rules";

export const metadata:Metadata={title:"Hiring Settings | WriteX Admin",robots:{index:false,follow:false}};
export default async function HiringSettingsPage(){const session=await requireAdminSession();if(!canManageSmartHiring(session))notFound();const[options,rules]=await Promise.all([getHiringOptions({includeInactive:true}),getSmartHiringRules()]);const canQuestions=canUseHiringPermission(session,"hiring.question_bank.manage");return <AdminShell session={session} eyebrow="Smart Hiring" title="Settings" description="Assessment questions, application choices and advanced decision rules are managed here without rewriting historical candidate records.">
  <div className="grid gap-6 lg:grid-cols-2"><AdminPanel title="Assessment Questions" description="Create drafts, preview, duplicate, reorder, publish exact versions, disable and archive questions.">{canQuestions?<AdminButton href="/admin/hiring/question-bank" tone="primary">Open Assessment Questions</AdminButton>:<p className="text-sm text-wxIndigo500">Your hiring role can view candidate records but cannot change the question bank.</p>}</AdminPanel><AdminPanel title="Guided journey" description="Application, eligibility, assessment, System Review, Admin Review, interview and final outcome stay as separate audited steps."><AdminButton href="/admin/hiring/applications">Open Candidates</AdminButton></AdminPanel></div>
  {session.role==="super_admin"?<><div className="mt-6"><HiringRulesManager initialRules={rules}/></div><div className="mt-6"><HiringApplicationOptionManager initialOptions={options}/></div></>:null}
  </AdminShell>}
