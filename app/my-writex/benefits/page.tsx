import { BenefitsPage } from "@/components/my-writex/MyWritexFeaturePages";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";
export default async function Page(){const session=await requireCustomerClientSession();return <BenefitsPage customer={getMyWritexCustomer(session)} />;}
