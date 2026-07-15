import type { Metadata } from "next";
import { ClientLogoutButton } from "@/components/client/ClientLogoutButton";
import { PortalShell } from "@/components/client/PortalShell";

export const metadata: Metadata = {
  title: "Logout | WriteX Client Portal",
  robots: { index: false, follow: false }
};

export default function ClientLogoutPage() {
  return (
    <PortalShell title="Logout of your WriteX portal">
      <div className="rounded-lg border border-sageBorder bg-white p-6 shadow-soft">
        <p className="mb-5 text-sm leading-6 text-slateText">
          Use the button below to clear your secure client portal session.
        </p>
        <ClientLogoutButton />
      </div>
    </PortalShell>
  );
}
