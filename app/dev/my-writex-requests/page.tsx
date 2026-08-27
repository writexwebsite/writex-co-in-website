import { notFound } from "next/navigation";
import { RequestInspector } from "@/components/my-writex/RequestInspector";
import { isMyWritexDevFixtureEnabled } from "@/lib/my-writex/dev-fixture";
import { listAllRequests, requestFunnel } from "@/lib/my-writex/request-repository";

export const dynamic = "force-dynamic";
export const metadata = { title: "My WriteX Request Inspector", robots: { index: false, follow: false } };
export default async function Page() { if (process.env.NODE_ENV === "production" || !isMyWritexDevFixtureEnabled()) notFound(); return <RequestInspector initialRequests={await listAllRequests()} initialFunnel={await requestFunnel()} />; }
