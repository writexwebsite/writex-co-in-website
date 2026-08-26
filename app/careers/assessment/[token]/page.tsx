import type { Metadata } from "next"; import { notFound } from "next/navigation"; import { AssessmentWorkspace } from "@/components/hiring/AssessmentWorkspace"; import { startAssessmentSession } from "@/lib/hiring/assessment-session"; import { isHiringFeatureEnabled } from "@/lib/hiring/feature-flags";
export const metadata:Metadata={title:"WriteX Assessment",robots:{index:false,follow:false}};export const dynamic="force-dynamic";
export default async function AssessmentPage({params}:{params:Promise<{token:string}>}){if(!isHiringFeatureEnabled("assessments"))notFound();const{token}=await params;let session;try{session=await startAssessmentSession(token);}catch{notFound();}return <AssessmentWorkspace token={token} session={session} antiCheat={isHiringFeatureEnabled("antiCheat")}/>;}

