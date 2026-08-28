import { notFound } from "next/navigation";
import { DemoReviewAccessForm } from "@/components/my-writex/DemoReviewAccessForm";
import { RequestInspector } from "@/components/my-writex/RequestInspector";
import { hasMyWritexDemoReviewAccessFromCookies } from "@/lib/my-writex/demo-review-auth";
import {
  isMyWritexDemoFixtureEnabled,
  isMyWritexDevFixtureEnabled,
} from "@/lib/my-writex/dev-fixture";
import { listAllRequests, requestFunnel } from "@/lib/my-writex/request-repository";

export const dynamic = "force-dynamic";
export const metadata = { title: "My WriteX Request Inspector", robots: { index: false, follow: false } };
export default async function Page() {
  const demo = isMyWritexDemoFixtureEnabled();
  if (!demo && !isMyWritexDevFixtureEnabled()) notFound();
  if (demo && !(await hasMyWritexDemoReviewAccessFromCookies())) {
    return <DemoReviewAccessForm />;
  }
  return <RequestInspector initialRequests={await listAllRequests()} initialFunnel={await requestFunnel()} isDemo={demo} />;
}
