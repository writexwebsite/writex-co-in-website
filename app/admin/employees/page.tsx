import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmployeeDirectoryControl } from "@/components/admin/EmployeeControlPlane";
import { canManageEmployees } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getAcademyInitialAdminBootstrap, listEmployees, listEmployeeTeams } from "@/lib/employees/repository";
import { academyAreas, employeeLifecycleFilters, type AcademyArea, type EmployeeLifecycleFilter } from "@/lib/employees/domain";

const responsibilityFilters = ["SUPER_ADMIN", "SALES_MANAGER_TL", "SALES_TRAINER", "SALES_EMPLOYEE", "MANAGER", "TEAM_MANAGER", "TEAM_LEADER", "SENIOR_SME", "JUNIOR_SME", "DELIVERY_TRAINER"] as const;
const syncFilters = ["attention", "SYNCED", "PENDING", "FAILED"] as const;

export const metadata: Metadata = {
  title: "Employees | WriteX Admin",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; sync?: string; lifecycle?: string; area?: string; responsibility?: string; access?: string }>;
}) {
  const session = await requireAdminSession();
  if (!canManageEmployees(session)) notFound();
  const params = await searchParams;
  const requestedLifecycle = params.lifecycle || (params.sync === "attention" ? "all" : "active");
  const lifecycle = employeeLifecycleFilters.includes(requestedLifecycle as EmployeeLifecycleFilter)
    ? requestedLifecycle as EmployeeLifecycleFilter
    : "active";
  const academyArea = academyAreas.includes(params.area as AcademyArea) ? params.area as AcademyArea : "";
  const responsibility = responsibilityFilters.includes(params.responsibility as typeof responsibilityFilters[number]) ? params.responsibility || "" : "";
  const academyAccess = params.access === "enabled" || params.access === "disabled" ? params.access : "";
  const sync = syncFilters.includes(params.sync as typeof syncFilters[number]) ? params.sync || "" : "";
  const [employees, teams, bootstrap, setupEmployees] = await Promise.all([
    listEmployees({ search: params.search, sync, lifecycle, academyArea, responsibility, academyAccess }),
    listEmployeeTeams(),
    getAcademyInitialAdminBootstrap(),
    listEmployees({ lifecycle: "active" })
  ]);
  const failedCount = employees.filter((employee) => employee.syncStatus === "FAILED").length;

  return (
    <AdminShell
      session={session}
      eyebrow="People & Access"
      title="Employees"
      description="Manage the company employee directory, reporting lines and application access from one audited control plane."
      nextAction={failedCount ? {
        label: "Resolve Academy sync failures",
        reason: `${failedCount} employee record${failedCount === 1 ? " needs" : "s need"} attention.`,
        href: "/admin/employees?sync=attention"
      } : undefined}
    >
      <EmployeeDirectoryControl
        employees={employees}
        teams={teams}
        initialSearch={params.search || ""}
        syncFilter={sync}
        academyAreaFilter={academyArea}
        responsibilityFilter={responsibility}
        academyAccessFilter={academyAccess}
        lifecycle={lifecycle}
        bootstrap={bootstrap}
        setupEmployees={setupEmployees}
      />
    </AdminShell>
  );
}
