import type { Metadata } from "next";
import { CvStudio } from "@/components/my-writex/CareerExperience";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";

export const metadata: Metadata = { title: "CV Studio | My WriteX", robots: { index: false, follow: false } };
export default async function Page() { const session = await requireCustomerClientSession(); return <CvStudio initialCvs={getMyWritexCustomer(session).career.cvs} />; }
