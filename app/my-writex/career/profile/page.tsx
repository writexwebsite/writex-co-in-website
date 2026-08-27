import { CareerProfile } from "@/components/my-writex/CareerExperience";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";
export default async function Page() { const session = await requireCustomerClientSession(); return <CareerProfile career={getMyWritexCustomer(session).career} />; }
