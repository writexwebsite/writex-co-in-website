import type { Metadata } from "next";
import { CareerHub } from "@/components/my-writex/CareerExperience";
import { requireCustomerClientSession } from "@/lib/client/session";
import { getMyWritexCustomer } from "@/lib/my-writex/data";

export const metadata: Metadata = { title: "Career | My WriteX", robots: { index: false, follow: false } };
export default async function Page() { const session = await requireCustomerClientSession(); const customer = getMyWritexCustomer(session); return <CareerHub career={customer.career} preferredName={customer.preferredName} />; }
