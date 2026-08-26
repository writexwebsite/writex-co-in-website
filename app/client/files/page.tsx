import type { Metadata } from "next";
import { ClientPortalChrome } from "@/components/client/ClientPortalChrome";
import {
  ClientEmptyState,
  FilesPanel
} from "@/components/client/ClientPortalPanels";
import { getClientFiles } from "@/lib/client/portal-data";
import { requireClientSession } from "@/lib/client/session";

export const metadata: Metadata = {
  title: "Files & Deliverables | WriteX",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default async function ClientFilesPage() {
  const session = await requireClientSession();
  const files = await getClientFiles(session);

  return (
    <ClientPortalChrome
      session={session}
      eyebrow="Files & Deliverables"
      title="Approved files"
    >
      {files.state === "available" ? (
        <FilesPanel files={files} />
      ) : (
        <ClientEmptyState
          title="No approved deliverables"
          message={files.message}
        />
      )}
    </ClientPortalChrome>
  );
}
