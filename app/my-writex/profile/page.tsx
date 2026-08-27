import type { Metadata } from "next";
import { ProfilePreferences } from "@/components/my-writex/ProfilePreferences";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";

export const metadata: Metadata = {
  title: "Profile | My WriteX",
  robots: { index: false, follow: false },
};

export default async function MyWritexProfilePage() {
  const session = await requireCustomerClientSession();
  const customer = getMyWritexCustomer(session);
  return (
    <ProfilePreferences
      identity={{
        writeXId: customer.writeXId,
        preferredName: customer.preferredName,
        relationshipSince: customer.relationshipSince,
        clientStatus: customer.clientStatus,
      }}
      initialProfile={customer.profile}
    />
  );
}
