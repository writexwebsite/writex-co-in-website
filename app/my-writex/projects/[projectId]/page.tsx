import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetail } from "@/components/my-writex/ProjectDetail";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexProject } from "@/lib/my-writex/data";

export const metadata: Metadata = { title: "Project | My WriteX", robots: { index: false, follow: false } };

export default async function MyWritexProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await requireCustomerClientSession();
  const { projectId } = await params;
  const project = getMyWritexProject(session, decodeURIComponent(projectId));
  if (!project) notFound();
  return <ProjectDetail project={project} mode="customer" />;
}
