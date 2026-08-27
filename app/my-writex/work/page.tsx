import type { Metadata } from "next";
import { WorkHub } from "@/components/my-writex/MyWritexHubs";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";

export const metadata: Metadata = { title: "Work | My WriteX", robots: { index: false, follow: false } };

export default async function Page() {
  const session = await requireCustomerClientSession();
  return <WorkHub customer={getMyWritexCustomer(session)} />;
}
