import { AccountInvoices } from "@/components/my-writex/AccountInvoices";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";

export default async function Page() {
  const session = await requireCustomerClientSession();
  return <AccountInvoices customer={getMyWritexCustomer(session)} />;
}
