import type { Metadata } from "next";
import { BookmarkCheck, CalendarCheck2 } from "lucide-react";
import { UpcomingWorkPlanner } from "@/components/my-writex/UpcomingWorkPlanner";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";
import { listRequests, requestOwnerFromSession } from "@/lib/my-writex/request-repository";

export const metadata: Metadata = { title: "Plan | My WriteX", robots: { index: false, follow: false } };

export default async function Page() {
  const session = await requireCustomerClientSession();
  const customer = getMyWritexCustomer(session);
  const requests = await listRequests(requestOwnerFromSession(session));
  const createdByUpcoming = Object.fromEntries(requests.filter((request) => request.sourceUpcomingId && request.status !== "Draft" && request.status !== "Cancelled").map((request) => [request.sourceUpcomingId!, request.publicReference]));
  return <div className="mw-page-stack max-w-[820px]">
    <UpcomingWorkPlanner initialItems={customer.upcomingWork} writeXId={customer.writeXId} createdByUpcoming={createdByUpcoming} />
    <section aria-labelledby="academic-title"><h2 id="academic-title" className="mw-section-title mb-4">Academic Deadlines</h2><div className="mw-list-surface"><div className="mw-list-row"><CalendarCheck2 className="h-5 w-5 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} /><div className="min-w-0 flex-1"><p className="mw-object-title">Important course dates</p><p className="mw-meta mt-1">A calm future home for academic deadlines.</p></div><span className="mw-status-pill bg-[var(--mw-soft)] text-[var(--mw-muted)]">Fixture shell</span></div></div></section>
    <section aria-labelledby="saved-plans-title"><h2 id="saved-plans-title" className="mw-section-title mb-4">Saved Plans</h2><div className="mw-list-surface"><div className="mw-list-row"><BookmarkCheck className="h-5 w-5 shrink-0 text-[var(--mw-primary)]" strokeWidth={1.75} /><div className="min-w-0 flex-1"><p className="mw-object-title">Work and career plans</p><p className="mw-meta mt-1">Keep useful ideas close for later.</p></div><span className="mw-status-pill bg-[var(--mw-soft)] text-[var(--mw-muted)]">Fixture shell</span></div></div></section>
  </div>;
}
