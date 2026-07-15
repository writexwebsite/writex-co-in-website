import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ClientLoginForm } from "@/components/client/ClientLoginForm";
import { PageAnalytics } from "@/components/PageAnalytics";
import { absoluteUrl } from "@/lib/site";
import { quoteTrackingEvents } from "@/lib/tracking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client Login | WriteX",
  description:
    "Access your secure WriteX client portal with your invoice ID and registered WhatsApp number.",
  alternates: { canonical: absoluteUrl("/client-login") },
  robots: { index: false, follow: false }
};

export default function ClientLoginPage() {
  return (
    <><PageAnalytics event={quoteTrackingEvents.clientLoginClicked} pagePath="/client-login" /><AuthShell variant="client"><ClientLoginForm /></AuthShell></>
  );
}
