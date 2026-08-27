import { redirect } from "next/navigation";

export default function ClientPortalIndexPage() {
  redirect("/client/overview");
}
