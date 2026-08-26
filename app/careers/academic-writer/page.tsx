import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CareersRolePage } from "@/components/hiring/CareersRolePage";
import { isHiringFeatureEnabled } from "@/lib/hiring/feature-flags";

export const metadata:Metadata={title:"Academic Writer Careers | WriteX",description:"Explore the full-time Academic Writer role in Kolkata, India, its guided selection journey, and the secure WriteX application experience.",alternates:{canonical:"https://www.writex.co.in/careers/academic-writer"},robots:{index:true,follow:true}};
export default function AcademicWriterCareersPage(){if(!isHiringFeatureEnabled("applications"))notFound();return <CareersRolePage role="academic_writer"/>;}
