import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminChangePasswordForm } from "@/components/admin/AdminChangePasswordForm";
import { ThemeMenu } from "@/components/theme/ThemeMenu";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";
import { getAdminSessionFromCookies } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Change Admin Password | WriteX",
  robots: { index: false, follow: false }
};

export default async function AdminChangePasswordPage() {
  const session = await getAdminSessionFromCookies();

  if (!session) redirect("/admin/login");
  if (!session.mustChangePassword) redirect("/admin/dashboard");

  return (
    <SpectrumBackground
      as="div"
      variant="login"
      overlayStrength="section"
      intensity={0.48}
      className="flex min-h-screen items-center justify-center px-5 py-10"
    >
      <div className="absolute right-5 top-5">
        <ThemeMenu />
      </div>
      <AdminChangePasswordForm />
    </SpectrumBackground>
  );
}
