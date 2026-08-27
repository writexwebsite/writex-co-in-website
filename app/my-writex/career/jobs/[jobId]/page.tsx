import { notFound } from "next/navigation";
import { JobDetail } from "@/components/my-writex/CareerExperience";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";

export default async function Page({ params }: { params: Promise<{ jobId: string }> }) { const session = await requireCustomerClientSession(); const { jobId } = await params; const job = getMyWritexCustomer(session).career.jobs.find((item) => item.id === jobId); if (!job) notFound(); return <JobDetail job={job} />; }
