import { DocumentVault } from "@/components/my-writex/DocumentVault";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";

export default async function Page() {
  const session = await requireCustomerClientSession();
  const customer = getMyWritexCustomer(session);
  return <DocumentVault documents={customer.documents} projects={customer.projects.map((project) => ({ id: project.id, title: project.title }))} />;
}
