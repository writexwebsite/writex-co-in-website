import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Website Experience | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default function WebsiteExperiencePage() {
  redirect("/admin/website-experience/festival-studio");
}
