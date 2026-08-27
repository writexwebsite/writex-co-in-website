import type { Metadata } from "next";
import { ProjectsExplorer } from "@/components/my-writex/ProjectsExplorer";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer, toMyWritexProjectView } from "@/lib/my-writex/data";

export const metadata: Metadata = {
  title: "My Projects | My WriteX",
  robots: { index: false, follow: false },
};

export default async function MyWritexProjectsPage() {
  const session = await requireCustomerClientSession();
  const customer = getMyWritexCustomer(session);
  return (
    <ProjectsExplorer
      projects={customer.projects.map(toMyWritexProjectView)}
      completedCount={customer.summary.completedProjects}
    />
  );
}
