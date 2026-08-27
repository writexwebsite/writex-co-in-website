import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RequestDetailExperience } from "@/components/my-writex/RequestDetailExperience";
import { requireCustomerClientSession } from "@/lib/client/session";
import { findRequest, requestOwnerFromSession, toRequestView } from "@/lib/my-writex/request-repository";

export const metadata: Metadata = { title: "Request Detail | My WriteX", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ requestRef: string }> }) { const session = await requireCustomerClientSession(); const request = await findRequest(requestOwnerFromSession(session), (await params).requestRef); if (!request) notFound(); return <RequestDetailExperience initialRequest={toRequestView(request)} />; }
