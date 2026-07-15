import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";
import { getAdminSessionFromCookies } from "@/lib/admin/session";
import { ThemeMenu } from "@/components/theme/ThemeMenu";

export const metadata: Metadata = {
  title: "Admin Login | WriteX",
  robots: { index: false, follow: false }
};

export default async function AdminLoginPage() {
  const session = await getAdminSessionFromCookies();

  if (session) redirect("/admin/dashboard");

  return (
    <SpectrumBackground
      as="div"
      variant="login"
      overlayStrength="section"
      intensity={0.48}
      className="flex min-h-screen items-center justify-center px-5 py-10"
    >
      <div className="absolute right-5 top-5"><ThemeMenu /></div>
      <AdminLoginForm />
    </SpectrumBackground>
  );
}
