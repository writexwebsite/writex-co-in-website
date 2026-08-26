import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FestivalFounderReview, type FestivalFounderReviewPayload } from "@/components/admin/FestivalFounderReview";
import { requireAdminSession } from "@/lib/admin/session";
import { FESTIVAL_UAT_REVIEW_BATCH_STABLE_KEY, getFestivalReviewBatch } from "@/lib/holiday/festival-review-batch";

export const metadata: Metadata={title:"Founder Visual Review | WriteX Admin",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function FounderVisualReviewPage({ searchParams }: { searchParams: Promise<{ batch?: string }> }){const session=await requireAdminSession();if(session.role!=="super_admin")notFound();const query=await searchParams;const uat=query.batch==="uat";const initial=await getFestivalReviewBatch({collection:uat?"all":"review_first",pageSize:30,batchKey:uat?FESTIVAL_UAT_REVIEW_BATCH_STABLE_KEY:undefined});return <AdminShell session={session} title="Founder Visual Review" description="Review exact asset versions in real website context. Every preview stays private; approval never activates a festival."><FestivalFounderReview initial={initial as FestivalFounderReviewPayload}/></AdminShell>}
