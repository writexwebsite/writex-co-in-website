import type { Metadata } from "next";
import { ClientPortalChrome } from "@/components/client/ClientPortalChrome";
import {
  ClientEmptyState,
  ProjectPanel
} from "@/components/client/ClientPortalPanels";
import { getClientProject } from "@/lib/client/portal-data";
import { requireClientSession } from "@/lib/client/session";

export const metadata: Metadata = {
  title: "Project Progress | WriteX",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function ClientProjectPage() {
  const session = await requireClientSession();
  const project = await getClientProject(session);

  return (
    <ClientPortalChrome
      session={session}
      eyebrow="Project Progress"
      title="Your project"
    >
      {project.state === "available" ? (
        <ProjectPanel project={project} />
      ) : (
        <ClientEmptyState
          title="Project tracking is being connected"
          message={project.message}
        />
      )}
    </ClientPortalChrome>
  );
}
