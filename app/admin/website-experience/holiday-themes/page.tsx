import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Holiday Themes | WriteX Admin",
  robots: { index: false, follow: false }
};
export const dynamic = "force-dynamic";

export default function HolidayThemesPage() {
  redirect("/admin/website-experience/festival-studio?section=schedule");
}
