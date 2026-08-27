import { UpcomingWorkPlanner } from "@/components/my-writex/UpcomingWorkPlanner";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";
import { listRequests, requestOwnerFromSession } from "@/lib/my-writex/request-repository";

export default async function Page() {
  const session = await requireCustomerClientSession();
  const customer = getMyWritexCustomer(session);
  const requests = await listRequests(requestOwnerFromSession(session));
  const createdByUpcoming = Object.fromEntries(requests.filter((request) => request.sourceUpcomingId && request.status !== "Draft" && request.status !== "Cancelled").map((request) => [request.sourceUpcomingId!, request.publicReference]));
  return <UpcomingWorkPlanner initialItems={customer.upcomingWork} writeXId={customer.writeXId} createdByUpcoming={createdByUpcoming} />;
}
