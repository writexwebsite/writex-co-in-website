import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Festival Hero Library | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default function FestivalHeroLibraryPage() {
  redirect("/admin/website-experience/festival-studio?section=configure");
}
