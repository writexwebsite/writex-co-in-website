import type { Metadata } from "next";
import { AccountHub } from "@/components/my-writex/MyWritexHubs";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";

export const metadata: Metadata = { title: "My WriteX Account", robots: { index: false, follow: false } };

export default async function Page() {
  const session = await requireCustomerClientSession();
  return <AccountHub customer={getMyWritexCustomer(session)} />;
}
