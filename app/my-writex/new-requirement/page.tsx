import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RequirementDraft } from "@/components/my-writex/RequirementDraft";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";
import { findActiveDraftForSource, requestOwnerFromSession, toRequestView } from "@/lib/my-writex/request-repository";
import type { MyWritexRequestSource, MyWritexRequirementFields } from "@/lib/my-writex/request-types";

export const metadata: Metadata = { title: "Start New Requirement | My WriteX", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ fromProject?: string; fromUpcoming?: string }> }) {
  const session = await requireCustomerClientSession();
  const customer = getMyWritexCustomer(session);
  const query = await searchParams;
  let source: MyWritexRequestSource = "new_requirement";
  let sourceReference: string | undefined;
  let sourceLabel: string | undefined;
  let sourceProjectId: string | undefined;
  let sourceUpcomingId: string | undefined;
  const initialFields: Partial<MyWritexRequirementFields> = { institution: customer.profile.institution, course: customer.profile.programme };

  if (query.fromProject) {
    const project = customer.projects.find((candidate) => candidate.id === query.fromProject);
    if (!project) notFound();
    source = "similar_project";
    sourceReference = project.id;
    sourceProjectId = project.id;
    sourceLabel = project.title;
    Object.assign(initialFields, { service: project.service, category: project.category, title: `New ${project.service}` });
  } else if (query.fromUpcoming) {
    const upcoming = customer.upcomingWork.find((candidate) => candidate.id === query.fromUpcoming);
    if (!upcoming) notFound();
    source = "upcoming_work";
    sourceReference = upcoming.id;
    sourceUpcomingId = upcoming.id;
    sourceLabel = upcoming.title;
    Object.assign(initialFields, { service: "Assignment Support", category: "Other", title: upcoming.title, deadlineDate: upcoming.targetDate, context: upcoming.note || "", urgency: "Planning ahead" });
  }

  const initialDraft = await findActiveDraftForSource(requestOwnerFromSession(session), source, sourceReference);
  const sourceKey = initialDraft?.idempotencyKey || `stage3a:${source}:${sourceReference || "new"}:${crypto.randomUUID()}`;
  return <RequirementDraft mode="customer" apiEndpoint="/api/my-writex/requests" source={source} sourceKey={sourceKey} sourceLabel={sourceLabel} sourceProjectId={sourceProjectId} sourceUpcomingId={sourceUpcomingId} initialFields={initialFields} initialDraft={initialDraft ? toRequestView(initialDraft) : null} />;
}
