import type { Metadata } from "next";
import { ClientPortalChrome } from "@/components/client/ClientPortalChrome";
import { ClientOverviewPanels } from "@/components/client/ClientPortalPanels";
import { getClientPortalOverview } from "@/lib/client/portal-data";
import { requireClientSession } from "@/lib/client/session";

export const metadata: Metadata = {
  title: "Client Overview | WriteX",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function ClientOverviewPage() {
  const session = await requireClientSession();
  const overview = await getClientPortalOverview(session);

  return (
    <ClientPortalChrome
      session={session}
      eyebrow="Client Portal"
      title="Your WriteX workspace"
    >
      <ClientOverviewPanels overview={overview} />
    </ClientPortalChrome>
  );
}
