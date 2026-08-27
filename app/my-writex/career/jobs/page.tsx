import type { Metadata } from "next";
import { JobRadar } from "@/components/my-writex/CareerExperience";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";

export const metadata: Metadata = { title: "Job Radar | My WriteX", robots: { index: false, follow: false } };
export default async function Page() { const session = await requireCustomerClientSession(); return <JobRadar jobs={getMyWritexCustomer(session).career.jobs} />; }
