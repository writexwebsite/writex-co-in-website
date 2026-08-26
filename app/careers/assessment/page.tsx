import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CTAButton } from "@/components/CTAButton";
import { PageHero } from "@/components/PageHero";
import { isHiringFeatureEnabled } from "@/lib/hiring/feature-flags";

export const metadata:Metadata={title:"Role Assessment | WriteX Careers",description:"Open a private WriteX role assessment from an authorised invitation.",robots:{index:false,follow:false}};
export default function AssessmentLandingPage(){if(!isHiringFeatureEnabled("assessments"))notFound();return <div className="min-h-screen"><PageHero eyebrow="WriteX Careers" title="Your Assessment Starts From Its Private Invitation" description="Assessment links are candidate-specific, time-bound and released one question at a time. Use the latest secure link sent by the WriteX hiring team." actions={<><CTAButton href="/careers/application-status">Check Application Status</CTAButton><CTAButton href="/careers" variant="secondary">View Careers</CTAButton></>}/></div>}
