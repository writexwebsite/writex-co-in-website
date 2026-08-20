import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmployeeDetailControl, EmployeeDirectoryControl } from "@/components/admin/EmployeeControlPlane";
import { employeePreviewItems, employeePreviewTeams } from "@/lib/employees/preview-data";
import type { EmployeeLifecycleFilter } from "@/lib/employees/domain";

export const dynamic = "force-dynamic";

const previewSession = {
  kind: "admin" as const,
  adminUserId: "00000000-0000-4000-8000-000000000001",
  email: "founder.preview@example.test",
  role: "super_admin",
  mustChangePassword: false
};

export default async function EmployeePreviewPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string; state?: string; lifecycle?: EmployeeLifecycleFilter }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const employee = params.view === "detail"
    ? employeePreviewItems.find((item) => item.id === "20000000-0000-4000-8000-000000000002")!
    : null;
  const lifecycle = params.lifecycle || "active";
  const filteredEmployees = employeePreviewItems.filter((item) => lifecycle === "all"
    || (lifecycle === "archived" && Boolean(item.archivedAt))
    || (lifecycle === "active" && !item.archivedAt && item.employmentStatus === "ACTIVE")
    || (lifecycle === "inactive" && !item.archivedAt && item.employmentStatus === "INACTIVE"));
  return (
    <AdminShell
      session={previewSession}
      eyebrow="People & Access"
      title={employee ? employee.displayName : "Employees"}
      description={employee
        ? `${employee.employeeCode} · ${employee.department} · ${employee.designation}`
        : "Development-only visual preview of the WP1.5 employee control plane."}
    >
      {employee ? (
        <EmployeeDetailControl employee={employee} employees={employeePreviewItems} teams={employeePreviewTeams} />
      ) : (
        <EmployeeDirectoryControl
          employees={params.state === "empty" ? [] : filteredEmployees}
          teams={employeePreviewTeams}
          lifecycle={lifecycle}
        />
      )}
    </AdminShell>
  );
}
