import { ManagerExperience } from "@/components/my-writex/ManagerExperience";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; coverage?: string }>;
}) {
  const session = await requireCustomerClientSession();
  const { intent, coverage } = await searchParams;
  return (
    <ManagerExperience
      customer={getMyWritexCustomer(session)}
      intent={intent === "message" || intent === "call" ? intent : undefined}
      showCoverage={coverage === "1"}
    />
  );
}
