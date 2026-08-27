import { SupportRequests } from "@/components/my-writex/SupportRequests";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";

export default async function Page({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const session = await requireCustomerClientSession();
  const customer = getMyWritexCustomer(session);
  const { type } = await searchParams;
  return <SupportRequests requests={customer.historicalRequests} managerName={customer.manager.name} initialType={type} />;
}
