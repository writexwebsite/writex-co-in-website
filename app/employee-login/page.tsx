import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { EmployeeLoginForm } from "@/components/employee/EmployeeLoginForm";
import { PageAnalytics } from "@/components/PageAnalytics";
import { resolveLtsEmployeeLoginState } from "@/lib/auth/ltsEmployeeLogin";
import { absoluteUrl } from "@/lib/site";
import { quoteTrackingEvents } from "@/lib/tracking";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Employee Login | WriteX",
  description: "Secure employee access to authorised WriteX workspaces.",
  alternates: { canonical: absoluteUrl("/employee-login") },
  robots: { index: false, follow: false }
};
export default async function EmployeeLoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = resolveLtsEmployeeLoginState(await searchParams);
  if (state.recoveryUrl) redirect(state.recoveryUrl);
  return <><PageAnalytics event={quoteTrackingEvents.employeeLoginClicked} pagePath="/employee-login" /><AuthShell variant="employee"><EmployeeLoginForm ltsReady={state.ready} initialError={state.message}/></AuthShell></>;
}
