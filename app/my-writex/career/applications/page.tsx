import { ApplicationTracker } from "@/components/my-writex/CareerExperience";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";
export default async function Page() { const session = await requireCustomerClientSession(); return <ApplicationTracker applications={getMyWritexCustomer(session).career.applications} />; }
