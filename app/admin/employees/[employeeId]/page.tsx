import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminButton } from "@/components/admin/AdminPrimitives";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmployeeDetailControl } from "@/components/admin/EmployeeControlPlane";
import { canManageEmployees } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/session";
import { getEmployee, listEmployees, listEmployeeTeams } from "@/lib/employees/repository";

export const metadata: Metadata = {
  title: "Employee | WriteX Admin",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const session = await requireAdminSession();
  if (!canManageEmployees(session)) notFound();
  const { employeeId } = await params;
  const [employee, employees, teams] = await Promise.all([
    getEmployee(employeeId),
    listEmployees({ lifecycle: "active" }),
    listEmployeeTeams()
  ]);
  if (!employee) notFound();

  return (
    <AdminShell
      session={session}
      eyebrow="People & Access / Employees"
      title={employee.displayName}
      description={`${employee.employeeCode} · ${employee.department} · ${employee.designation}`}
      actions={<AdminButton href="/admin/employees">Back to Employees</AdminButton>}
    >
      <EmployeeDetailControl employee={employee} employees={employees} teams={teams} />
    </AdminShell>
  );
}
