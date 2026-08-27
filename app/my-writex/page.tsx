import type { Metadata } from "next";
import { MyWritexHome } from "@/components/my-writex/MyWritexHome";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";
import { parseMyWritexState } from "@/lib/my-writex/presentation";

export const metadata: Metadata = { title: "My WriteX", robots: { index: false, follow: false } };

export default async function MyWritexHomePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const session = await requireCustomerClientSession();
  const { state } = await searchParams;
  return (
    <MyWritexHome
      customer={getMyWritexCustomer(session)}
      experienceState={parseMyWritexState(state)}
    />
  );
}
