import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { EmployeeDetailControl, EmployeeDirectoryControl } from "@/components/admin/EmployeeControlPlane";
import { employeePreviewIds, employeePreviewItems, employeePreviewTeams } from "@/lib/employees/preview-data";
import type { AcademyArea, EmployeeDeletionAssessment, EmployeeLifecycleFilter } from "@/lib/employees/domain";

export const dynamic = "force-dynamic";

const previewSession = {
  kind: "admin" as const,
  adminUserId: "00000000-0000-4000-8000-000000000001",
  email: "founder.preview@example.test",
  role: "super_admin",
  mustChangePassword: false
};

const deletionAssessments: Record<string, EmployeeDeletionAssessment> = {
  [employeePreviewIds.salesManager]: {
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
  [employeePreviewIds.salesEmployee]: {
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
  searchParams: Promise<{ view?: string; state?: string; lifecycle?: EmployeeLifecycleFilter; area?: AcademyArea; responsibility?: string; access?: string; sync?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const employeeId = params.view === "superadmin"
    ? employeePreviewIds.superAdmin
    : params.view === "delivery"
      ? employeePreviewIds.juniorSme
      : params.view === "detail"
        ? employeePreviewIds.salesEmployee
        : null;
  const employee = employeeId ? employeePreviewItems.find((item) => item.id === employeeId)! : null;
  const lifecycle = params.lifecycle || "active";
  const setupEmployees = params.state === "empty"
    ? []
    : params.state === "delivery-incomplete"
      ? employeePreviewItems.filter((item) => item.id !== employeePreviewIds.juniorSme)
      : employeePreviewItems;
  const filteredEmployees = employeePreviewItems.filter((item) => (lifecycle === "all"
    || (lifecycle === "archived" && Boolean(item.archivedAt))
    || (lifecycle === "active" && !item.archivedAt && item.employmentStatus === "ACTIVE")
    || (lifecycle === "inactive" && !item.archivedAt && item.employmentStatus === "INACTIVE"))
    && (!params.area || item.academyArea === params.area)
    && (!params.access || (params.access === "enabled" ? item.academyEnabled : !item.academyEnabled))
    && (!params.sync || (params.sync === "attention" ? item.syncStatus !== "SYNCED" : item.syncStatus === params.sync))
    && (!params.responsibility || (
      params.responsibility === "SUPER_ADMIN" ? item.academyRole === "SUPER_ADMIN"
        : params.responsibility === "SALES_MANAGER_TL" ? item.academyArea === "SALES" && item.academyRole === "MANAGER_TL"
          : params.responsibility === "SALES_TRAINER" ? item.academyArea === "SALES" && item.academyRole === "TRAINER"
            : params.responsibility === "SALES_EMPLOYEE" ? item.academyArea === "SALES" && item.academyRole === "EMPLOYEE"
              : params.responsibility === "DELIVERY_TRAINER" ? item.academyArea === "DEVELOPMENT_OPERATIONS" && item.academyRole === "TRAINER"
                : item.deliveryOperationalRole === params.responsibility
    )));
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
          setupEmployees={setupEmployees}
          teams={employeePreviewTeams}
          lifecycle={lifecycle}
          syncFilter={params.sync || ""}
          academyAreaFilter={params.area || ""}
          responsibilityFilter={params.responsibility || ""}
          academyAccessFilter={params.access || ""}
          deletionAssessments={deletionAssessments}
          bootstrap={{
            status: params.state === "empty" ? "READY" : "CONSUMED",
            candidateEmployeeId: null,
            consumedByEmployeeId: params.state === "empty" ? null : employeePreviewIds.superAdmin,
            readyAt: params.state === "empty" ? new Date().toISOString() : null,
            consumedAt: params.state === "empty" ? null : new Date().toISOString(),
            backupReference: null,
            employeeCount: params.state === "empty" ? 0 : filteredEmployees.length,
            primarySuperAdminEmployeeId: params.state === "empty" ? null : employeePreviewIds.superAdmin,
            requiresConfirmation: params.state === "empty"
          }}
        />
      )}
    </AdminShell>
  );
}
