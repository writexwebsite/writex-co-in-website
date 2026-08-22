import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmployeeDetailControl, EmployeeDirectoryControl } from "@/components/admin/EmployeeControlPlane";
import { employeePreviewItems, employeePreviewTeams } from "@/lib/employees/preview-data";
import type { EmployeeDeletionAssessment, EmployeeLifecycleFilter } from "@/lib/employees/domain";

export const dynamic = "force-dynamic";

const previewSession = {
  kind: "admin" as const,
  adminUserId: "00000000-0000-4000-8000-000000000001",
  email: "founder.preview@example.test",
  role: "super_admin",
  mustChangePassword: false
};

const deletionAssessments: Record<string, EmployeeDeletionAssessment> = {
  "20000000-0000-4000-8000-000000000001": {
    allowed: true,
    zeroHistoryAllowed: false,
    fullPurgeAllowed: true,
    recommendedMode: "FULL_PURGE",
    temporaryIdentity: false,
    blockers: [],
    dependencies: [
      { code: "ACADEMY_IDENTITY", label: "Academy identity and login", count: 1 },
      { code: "LESSON_PROGRESS", label: "Lesson progress", count: 18 },
      { code: "PRACTICE_HISTORY", label: "Customer Practice and journey history", count: 7 }
    ],
    academyAvailable: true,
    academyHasMeaningfulHistory: true,
    totalDependencyCount: 26
  },
  "20000000-0000-4000-8000-000000000002": {
    allowed: true,
    zeroHistoryAllowed: true,
    fullPurgeAllowed: true,
    recommendedMode: "ZERO_HISTORY",
    temporaryIdentity: true,
    blockers: [],
    dependencies: [{ code: "ACADEMY_IDENTITY", label: "Academy identity and login", count: 1 }],
    academyAvailable: true,
    academyHasMeaningfulHistory: false,
    totalDependencyCount: 1
  }
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
          setupEmployees={params.state === "empty" ? [] : employeePreviewItems}
          teams={employeePreviewTeams}
          lifecycle={lifecycle}
          deletionAssessments={deletionAssessments}
          bootstrap={{
            status: params.state === "empty" ? "READY" : "CONSUMED",
            candidateEmployeeId: null,
            consumedByEmployeeId: params.state === "empty" ? null : employeePreviewItems[0]?.id || null,
            readyAt: params.state === "empty" ? new Date().toISOString() : null,
            consumedAt: params.state === "empty" ? null : new Date().toISOString(),
            backupReference: null,
            employeeCount: params.state === "empty" ? 0 : filteredEmployees.length,
            primarySuperAdminEmployeeId: params.state === "empty" ? null : employeePreviewItems[0]?.id || null,
            requiresConfirmation: params.state === "empty"
          }}
        />
      )}
    </AdminShell>
  );
}
