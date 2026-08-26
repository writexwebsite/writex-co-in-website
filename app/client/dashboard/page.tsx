import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClientDashboard } from "@/components/client/ClientDashboard";
import { PortalShell } from "@/components/client/PortalShell";
import { requireClientSession } from "@/lib/client/session";
import { getDemoClientSessionFromCookies } from "@/lib/demo/session";

export const metadata: Metadata = {
  title: "Client Dashboard | WriteX",
  robots: { index: false, follow: false }
};

export default async function ClientDashboardPage() {
  const demo = await getDemoClientSessionFromCookies();
  if (!demo) {
    const session = await requireClientSession();
    if (session.testSession) redirect("/client/overview");
  }

  return (
    <PortalShell isDemo={Boolean(demo)}>
      <ClientDashboard />
    </PortalShell>
  );
}
