import type { Metadata } from "next";
import { requireEmployeeSession } from "@/lib/employee/session";
import { BrandLogo } from "@/components/BrandLogo";
import { DemoEmployeeWorkspace } from "@/components/demo/DemoEmployeeWorkspace";
import { getEmployeeDemoData } from "@/lib/demo/employeeDemoData";
import { getDemoEmployeeSessionFromCookies } from "@/lib/demo/session";

export const metadata: Metadata = { title: "Employee Workspace | WriteX", robots: { index: false, follow: false } };

export default async function EmployeeWorkspace(){const demo=await getDemoEmployeeSessionFromCookies();if(demo)return <DemoEmployeeWorkspace data={getEmployeeDemoData(demo.workspace)}/>;const session=await requireEmployeeSession();return <main className="min-h-screen bg-wxBg p-6 text-wxIndigo900"><div className="mx-auto max-w-5xl"><BrandLogo markClassName="w-44" sizes="176px"/><section className="mt-10 rounded-xl border border-wxBorder bg-wxSurface p-8 shadow-soft"><p className="text-xs font-bold uppercase tracking-[.16em] text-wxViolet700">Secure employee workspace</p><h1 className="mt-3 text-3xl font-semibold">Preparing your WriteX workspace...</h1><p className="mt-3 text-wxIndigo500">Authenticated as {session.email||session.employeeId}. Navigation and permissions are loaded from the configured employee directory.</p></section></div></main>;}

