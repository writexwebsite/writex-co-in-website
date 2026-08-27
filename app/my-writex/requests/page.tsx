import type { Metadata } from "next";
import { RequestsExperience } from "@/components/my-writex/RequestsExperience";
import { requireCustomerClientSession } from "@/lib/client/session";
import { listRequests, requestOwnerFromSession, toRequestView } from "@/lib/my-writex/request-repository";

export const metadata: Metadata = { title: "My Requests | My WriteX", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Page() { const session = await requireCustomerClientSession(); return <RequestsExperience initialRequests={(await listRequests(requestOwnerFromSession(session))).map(toRequestView)} />; }
