import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { EmployeeLoginForm } from "@/components/employee/EmployeeLoginForm";
import { PageAnalytics } from "@/components/PageAnalytics";
import { absoluteUrl } from "@/lib/site";
import { quoteTrackingEvents } from "@/lib/tracking";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Employee Login | WriteX",
  description: "Secure employee access to authorised WriteX workspaces.",
  alternates: { canonical: absoluteUrl("/employee-login") },
  robots: { index: false, follow: false }
};
export default function EmployeeLoginPage(){return <><PageAnalytics event={quoteTrackingEvents.employeeLoginClicked} pagePath="/employee-login" /><AuthShell variant="employee"><EmployeeLoginForm/></AuthShell></>;}
