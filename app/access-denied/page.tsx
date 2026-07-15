import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { AccessDeniedActions } from "@/components/AccessDeniedActions";
import { SpectrumBackground } from "@/components/visual/SpectrumBackground";

export const metadata: Metadata = {
  title: "Access Denied | WriteX",
  robots: { index: false, follow: false }
};

export default function AccessDeniedPage() {
  return (
    <SpectrumBackground variant="section" overlayStrength="strong" intensity={0.24}>
      <div className="premium-container flex min-h-[52vh] items-center py-10">
        <div className="max-w-2xl rounded-md border border-wxBorder bg-white p-6 shadow-soft sm:p-8">
          <ShieldAlert className="h-6 w-6 text-wxViolet700" aria-hidden />
          <h1 className="mt-5 text-3xl font-semibold text-wxIndigo900 sm:text-4xl">This workspace is not available to your account</h1>
          <p className="mt-4 text-base leading-8 text-wxIndigo500">
            Your current session does not include permission for this area. Return to your authorised workspace or contact support if you believe access should be available.
          </p>
          <AccessDeniedActions />
        </div>
      </div>
    </SpectrumBackground>
  );
}
