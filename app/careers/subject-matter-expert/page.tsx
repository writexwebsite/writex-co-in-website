import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { isHiringFeatureEnabled } from "@/lib/hiring/feature-flags";

export const metadata:Metadata={title:"Academic Writer Careers | WriteX",description:"This role is now listed as Academic Writer.",alternates:{canonical:"https://www.writex.co.in/careers/academic-writer"},robots:{index:false,follow:true}};
export default function LegacySubjectMatterExpertCareersPage(){if(!isHiringFeatureEnabled("applications"))notFound();permanentRedirect("/careers/academic-writer");}
