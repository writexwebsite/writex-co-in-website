import type { ReactNode } from "react";
import { MyWritexShell } from "@/components/my-writex/MyWritexShell";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";

export const dynamic = "force-dynamic";

export default async function MyWritexLayout({ children }: { children: ReactNode }) {
  const session = await requireCustomerClientSession();
  const customer = getMyWritexCustomer(session);
  return <MyWritexShell customer={customer}>{children}</MyWritexShell>;
}
