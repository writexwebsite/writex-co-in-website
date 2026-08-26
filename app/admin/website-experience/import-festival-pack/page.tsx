import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Import Festival Pack | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default function ImportFestivalPackPage() {
  redirect("/admin/website-experience/festival-studio?section=configure&tool=import");
}
