"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  AlertTriangle,
  Check,
  Copy,
  GraduationCap,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserX,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import { AdminStatusBadge } from "@/components/admin/AdminPrimitives";
import type {
  AcademyInitialAdminBootstrap,
  AcademyRole,
  EmployeeDeletionAssessment,
  EmployeeDirectoryItem,
  EmployeeLifecycleFilter,
  EmployeeSegment,
  EmployeeTeam
} from "@/lib/employees/domain";

type ApiFailure = { error?: { message?: string } };

type AcademyAccessCredentials = {
  employeeName: string;
  loginEmail: string;
  initialPassword: string;
  academyUrl?: string;
  academyRole?: AcademyRole;
  primarySuperAdmin?: boolean;
};

function syncTone(status: EmployeeDirectoryItem["syncStatus"]) {
  return status === "SYNCED" ? "success" : status === "FAILED" ? "danger" : "warning";
}

export function EmployeeDirectoryControl({
  employees,
  teams,
  initialSearch = "",
  attentionOnly = false,
  lifecycle = "active",
  bootstrap
}: {
  employees: EmployeeDirectoryItem[];
  teams: EmployeeTeam[];
  initialSearch?: string;
  attentionOnly?: boolean;
  lifecycle?: EmployeeLifecycleFilter;
  bootstrap: AcademyInitialAdminBootstrap;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [provisionedAccess, setProvisionedAccess] = useState<{
    employeeName: string;
    loginEmail: string;
    initialPassword: string;
  } | null>(null);
  const [teamMessage, setTeamMessage] = useState("");
  const [teamBusy, setTeamBusy] = useState(false);

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTeamBusy(true);
    setTeamMessage("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/admin/employee-teams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values)
    });
    const payload = await response.json().catch(() => null) as ApiFailure | null;
    setTeamBusy(false);
    if (!response.ok) {
      setTeamMessage(payload?.error?.message || "The team could not be created.");
      return;
    }
    form.reset();
    setTeamMessage("Team created. It is now available for employee assignment.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-wxIndigo900">Employee directory</h2>
            <p className="mt-1 text-sm leading-6 text-wxIndigo500">
              Website Admin is the source of truth for employment, reporting lines and application access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating((current) => !current)}
            className="wx-gradient-action inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white"
            aria-expanded={creating}
          >
            <Plus className="h-4 w-4" />
            Create Employee
          </button>
        </div>

        {creating ? (
          <div className="mt-6 border-t border-wxBorder pt-6">
            <EmployeeEditor
              employees={employees}
              teams={teams}
              bootstrap={bootstrap}
              onCreated={(result) => {
                setCreating(false);
                if (result.initialPassword) setProvisionedAccess(result as AcademyAccessCredentials);
              }}
            />
          </div>
        ) : null}

        {provisionedAccess ? <AcademyAccessReadyModal credentials={provisionedAccess} onDone={() => setProvisionedAccess(null)} /> : null}

        <form className="mt-6 flex flex-col gap-2 sm:flex-row" method="get">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search employees</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-wxIndigo400" />
            <input
              name="search"
              defaultValue={initialSearch}
              placeholder="Search name, code, email, department or team"
              className="min-h-11 w-full rounded-md border border-wxBorder bg-wxSurfaceSoft pl-10 pr-3 text-sm text-wxIndigo900 outline-none focus:border-wxViolet700"
            />
          </label>
          {attentionOnly ? <input type="hidden" name="sync" value="attention" /> : null}
          <input type="hidden" name="lifecycle" value={lifecycle} />
          <button className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold text-wxIndigo700 hover:border-wxViolet700">
            Search
          </button>
          {(initialSearch || attentionOnly) ? (
            <Link href="/admin/employees" className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold text-wxViolet700">
              Clear
            </Link>
          ) : null}
        </form>

        <nav aria-label="Employee directory filters" className="mt-4 flex overflow-x-auto rounded-md border border-wxBorder bg-wxSurfaceSoft p-1">
          {(["active", "inactive", "archived", "all"] as const).map((filter) => {
            const query = new URLSearchParams();
            if (filter !== "active") query.set("lifecycle", filter);
            if (initialSearch) query.set("search", initialSearch);
            if (attentionOnly) query.set("sync", "attention");
            const href = `/admin/employees${query.size ? `?${query}` : ""}`;
            return (
              <Link
                key={filter}
                href={href}
                aria-current={lifecycle === filter ? "page" : undefined}
                className={`inline-flex min-h-10 min-w-[92px] flex-1 items-center justify-center rounded px-3 text-sm font-semibold capitalize ${
                  lifecycle === filter
                    ? "bg-wxSurface text-wxViolet700 shadow-sm"
                    : "text-wxIndigo500 hover:text-wxIndigo900"
                }`}
              >
                {filter}
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 rounded-md border border-wxBorder">
          {employees.length ? (
            <div className="divide-y divide-wxBorder">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="grid min-h-[88px] gap-3 bg-wxSurface px-4 py-4 transition hover:bg-wxSurfaceSoft md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/employees/${employee.id}`} className="font-semibold text-wxIndigo900 hover:text-wxViolet700 hover:underline">
                        {employee.displayName}
                      </Link>
                      <AdminStatusBadge tone={employee.archivedAt ? "neutral" : employee.employmentStatus === "ACTIVE" ? "success" : "neutral"}>
                        {employee.archivedAt ? "Archived" : employee.employmentStatus === "ACTIVE" ? "Active" : "Inactive"}
                      </AdminStatusBadge>
                    </div>
                    <p className="mt-1 truncate text-sm text-wxIndigo500">
                      {employee.employeeCode} · {employee.officialEmail}
                    </p>
                  </div>
                  <div className="text-sm text-wxIndigo600">
                    <p className="font-medium text-wxIndigo800">{employee.department} · {employee.designation}</p>
                    <p className="mt-1">{employee.teamName || "No team"} · {employee.managerName || "No manager"}</p>
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <AdminStatusBadge tone={employee.academyEnabled ? "info" : "neutral"}>
                      Academy {employee.academyEnabled ? "On" : "Off"}
                    </AdminStatusBadge>
                    <AdminStatusBadge tone={syncTone(employee.syncStatus)}>{employee.syncStatus}</AdminStatusBadge>
                    <EmployeeLifecycleMenu employee={employee} employees={employees} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <UsersRound className="mx-auto h-6 w-6 text-wxIndigo400" />
              <p className="mt-3 font-semibold text-wxIndigo900">{bootstrap.requiresConfirmation ? "No employees yet" : `No ${lifecycle === "all" ? "" : lifecycle} employees match this view`}</p>
              <p className="mt-1 text-sm text-wxIndigo500">{bootstrap.requiresConfirmation ? "The Academy directory is clean. Create the first employee to initialise Academy governance." : "Choose another filter, clear the search or create an employee."}</p>
              {bootstrap.requiresConfirmation ? (
                <div className="mx-auto mt-5 max-w-md rounded-md border border-violet-200 bg-violet-50 p-4 text-left text-sm text-violet-950">
                  <p><span className="font-semibold">Primary SuperAdmin:</span> Not yet assigned</p>
                  <p className="mt-1"><span className="font-semibold">Bootstrap:</span> Ready</p>
                  <button type="button" onClick={() => setCreating(true)} className="wx-gradient-action mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 font-semibold text-white">
                    <Plus className="h-4 w-4" /> Create First Employee
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section id="teams" className="scroll-mt-24 rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft md:p-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
          <div>
            <h2 className="text-lg font-semibold text-wxIndigo900">Teams & departments</h2>
            <p className="mt-1 text-sm leading-6 text-wxIndigo500">
              Teams are reusable organisational records. Academy mirrors only the selected team relationship.
            </p>
            <form onSubmit={createTeam} className="mt-5 grid gap-3">
              <Field label="Team code"><input name="teamCode" required maxLength={40} placeholder="SALES-EAST" className={inputClass} /></Field>
              <Field label="Team name"><input name="name" required maxLength={120} placeholder="Sales East" className={inputClass} /></Field>
              <Field label="Department"><input name="department" required maxLength={120} placeholder="Sales" className={inputClass} /></Field>
              <button disabled={teamBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-wxBorder bg-wxSurfaceSoft px-4 text-sm font-semibold text-wxViolet700 hover:border-wxViolet700 disabled:opacity-60">
                <Plus className="h-4 w-4" /> {teamBusy ? "Creating..." : "Add team"}
              </button>
              {teamMessage ? <p role="status" className="text-sm text-wxIndigo600">{teamMessage}</p> : null}
            </form>
          </div>
          <div className="overflow-hidden rounded-md border border-wxBorder">
            {teams.length ? teams.map((team) => (
              <div key={team.id} className="flex items-center justify-between gap-4 border-b border-wxBorder px-4 py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="font-semibold text-wxIndigo900">{team.name}</p>
                  <p className="mt-1 text-xs text-wxIndigo500">{team.teamCode} · {team.department}</p>
                </div>
                <AdminStatusBadge tone={team.status === "ACTIVE" ? "success" : "neutral"}>{team.status}</AdminStatusBadge>
              </div>
            )) : (
              <p className="px-5 py-10 text-center text-sm text-wxIndigo500">No teams yet. Employees may remain unassigned.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export function EmployeeDetailControl({
  employee,
  employees,
  teams
}: {
  employee: EmployeeDirectoryItem;
  employees: EmployeeDirectoryItem[];
  teams: EmployeeTeam[];
}) {
  return <EmployeeEditor employee={employee} employees={employees} teams={teams} />;
}

type LifecycleDialog =
  | "DEACTIVATE"
  | "ARCHIVE"
  | "RESTORE"
  | "ACCESS"
  | "ROLE"
  | "RESET_PASSWORD"
  | "DELETE";

function EmployeeLifecycleMenu({ employee, employees }: { employee: EmployeeDirectoryItem; employees: EmployeeDirectoryItem[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<LifecycleDialog | null>(null);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [role, setRole] = useState<AcademyRole>(employee.academyRole);
  const [managerEmployeeId, setManagerEmployeeId] = useState(employee.managerEmployeeId || "");
  const [acknowledged, setAcknowledged] = useState(false);
  const [deletionMode, setDeletionMode] = useState<"ZERO_HISTORY" | "FULL_PURGE">("ZERO_HISTORY");
  const [assessment, setAssessment] = useState<EmployeeDeletionAssessment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<AcademyAccessCredentials | null>(null);

  useEffect(() => {
    if (dialog !== "DELETE") return;
    let active = true;
    fetch(`/api/admin/employees/${employee.id}/lifecycle`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as {
          data?: { assessment?: EmployeeDeletionAssessment };
          error?: { message?: string };
        } | null;
        if (!response.ok || !payload?.data?.assessment) {
          throw new Error(payload?.error?.message || "Deletion eligibility could not be checked.");
        }
        if (active) {
          setAssessment(payload.data.assessment);
          setDeletionMode(payload.data.assessment.recommendedMode === "FULL_PURGE" ? "FULL_PURGE" : "ZERO_HISTORY");
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Deletion eligibility could not be checked.");
      });
    return () => { active = false; };
  }, [dialog, employee.id]);

  function openDialog(next: LifecycleDialog) {
    setDialog(next);
    setReason("");
    setConfirmation("");
    setAcknowledged(false);
    setManagerEmployeeId(employee.managerEmployeeId || "");
    setError("");
    if (next === "DELETE") setAssessment(null);
  }

  async function submitLifecycle() {
    if (!dialog) return;
    setBusy(true);
    setError("");
    const endpoint = dialog === "RESET_PASSWORD"
      ? `/api/admin/employees/${employee.id}/academy-password`
      : `/api/admin/employees/${employee.id}/lifecycle`;
    let method = "POST";
    let body: Record<string, unknown>;
    if (dialog === "RESET_PASSWORD") {
      body = {};
    } else if (dialog === "DELETE") {
      method = "DELETE";
      body = { confirmation, reason, mode: deletionMode, acknowledged };
    } else if (dialog === "ACCESS") {
      body = { action: "SET_ACADEMY_ACCESS", enabled: !employee.academyEnabled, managerEmployeeId: managerEmployeeId || null };
    } else if (dialog === "ROLE") {
      body = { action: "SET_ACADEMY_ROLE", role, reason, managerEmployeeId: managerEmployeeId || null };
    } else {
      body = { action: dialog, reason };
    }
    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => null) as {
      data?: {
        sync?: { synced?: boolean; error?: string; initialPassword?: string };
        credentials?: AcademyAccessCredentials;
      };
      error?: { message?: string };
    } | null;
    setBusy(false);
    if (!response.ok) {
      setError(payload?.error?.message || "The employee lifecycle change could not be completed.");
      if (dialog === "DELETE") {
        const refreshed = await fetch(endpoint, { cache: "no-store" }).then((item) => item.json()).catch(() => null) as {
          data?: { assessment?: EmployeeDeletionAssessment };
        } | null;
        if (refreshed?.data?.assessment) setAssessment(refreshed.data.assessment);
      }
      return;
    }
    if (payload?.data?.sync?.synced === false) {
      setError(`Website state is saved, but Academy security sync needs attention: ${payload.data.sync.error || "retry from the employee record."}`);
      router.refresh();
      return;
    }
    const credentials = payload?.data?.credentials;
    const credentialPassword = credentials?.initialPassword?.trim();
    const syncPassword = payload?.data?.sync?.initialPassword?.trim();
    const generated = credentials && credentialPassword ? {
      employeeName: credentials.employeeName,
      loginEmail: credentials.loginEmail,
      initialPassword: credentialPassword,
      academyUrl: credentials.academyUrl
    } : syncPassword ? {
      employeeName: employee.displayName,
      loginEmail: employee.officialEmail,
      initialPassword: syncPassword,
      academyUrl: "https://academy.writex.co.in"
    } : null;
    if (generated) setCredentials(generated);
    setDialog(null);
    router.refresh();
  }

  const title = dialog === "DEACTIVATE" ? "Deactivate employee"
    : dialog === "ARCHIVE" ? "Archive employee"
    : dialog === "RESTORE" ? "Restore employee"
    : dialog === "ACCESS" ? `${employee.academyEnabled ? "Turn off" : "Turn on"} Academy access`
    : dialog === "ROLE" ? "Change Academy role"
    : dialog === "RESET_PASSWORD" ? "Reset Academy password"
    : "Permanently delete employee";

  const needsReason = dialog === "DEACTIVATE" || dialog === "ARCHIVE" || dialog === "RESTORE" || dialog === "DELETE" || dialog === "ROLE";
  const effectiveRole = dialog === "ROLE" ? role : employee.academyRole;
  const needsSupervisor = (dialog === "ROLE" || (dialog === "ACCESS" && !employee.academyEnabled))
    && (effectiveRole === "EMPLOYEE" || effectiveRole === "TRAINER");
  const validManagers = employees.filter((item) => item.id !== employee.id
    && !item.archivedAt
    && item.employmentStatus === "ACTIVE"
    && item.academyEnabled
    && item.academyRole === "MANAGER_TL");
  const validManagerIds = new Set(validManagers.map((item) => item.id));
  const supervisorOptions = employees.filter((item) => item.id !== employee.id
    && !item.archivedAt
    && item.employmentStatus === "ACTIVE"
    && item.academyEnabled
    && (effectiveRole === "EMPLOYEE"
      ? item.academyRole === "TRAINER" && Boolean(item.managerEmployeeId && validManagerIds.has(item.managerEmployeeId))
      : item.academyRole === "MANAGER_TL"));
  const deleteReady = dialog !== "DELETE" || (
    assessment?.allowed
    && (deletionMode === "FULL_PURGE" ? assessment.fullPurgeAllowed : assessment.zeroHistoryAllowed)
    && acknowledged
    && reason.trim().length >= 10
    && confirmation.trim().toUpperCase() === `DELETE ${employee.employeeCode}`.toUpperCase()
  );

  return (
    <>
      <details className="relative">
        <summary
          className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-wxBorder bg-wxSurface text-wxIndigo600 hover:border-wxViolet700 hover:text-wxViolet700"
          aria-label={`Manage ${employee.displayName}`}
          title={`Manage ${employee.displayName}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </summary>
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-md border border-wxBorder bg-wxSurface py-1 shadow-lift">
          <Link href={`/admin/employees/${employee.id}`} className={menuItemClass}>
            <Pencil className="h-4 w-4" /> View / Edit
          </Link>
          <button type="button" disabled={Boolean(employee.archivedAt)} onClick={() => openDialog("ACCESS")} className={menuItemClass}>
            <GraduationCap className="h-4 w-4" /> Academy Access {employee.academyEnabled ? "Off" : "On"}
          </button>
          <button type="button" disabled={Boolean(employee.archivedAt)} onClick={() => openDialog("ROLE")} className={menuItemClass}>
            <ShieldCheck className="h-4 w-4" /> Change Academy Role
          </button>
          <button
            type="button"
            disabled={Boolean(employee.archivedAt) || employee.employmentStatus !== "ACTIVE" || !employee.academyEnabled}
            onClick={() => openDialog("RESET_PASSWORD")}
            className={menuItemClass}
          >
            <KeyRound className="h-4 w-4" /> Reset Academy Password
          </button>
          {!employee.archivedAt && employee.employmentStatus === "ACTIVE" ? (
            <button type="button" onClick={() => openDialog("DEACTIVATE")} className={menuItemClass}>
              <UserX className="h-4 w-4" /> Deactivate Employee
            </button>
          ) : null}
          {!employee.archivedAt ? (
            <button type="button" onClick={() => openDialog("ARCHIVE")} className={menuItemClass}>
              <Archive className="h-4 w-4" /> Archive Employee
            </button>
          ) : (
            <button type="button" onClick={() => openDialog("RESTORE")} className={menuItemClass}>
              <RotateCcw className="h-4 w-4" /> Restore Employee
            </button>
          )}
          <button type="button" onClick={() => openDialog("DELETE")} className={`${menuItemClass} text-red-700 hover:text-red-800`}>
            <Trash2 className="h-4 w-4" /> Permanently Delete
          </button>
        </div>
      </details>

      {dialog ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby={`lifecycle-${employee.id}`} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border border-wxBorder bg-wxSurface p-5 shadow-lift md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={`lifecycle-${employee.id}`} className="text-lg font-semibold text-wxIndigo900">{title}</h2>
                <p className="mt-1 text-sm text-wxIndigo500">{employee.displayName} · {employee.employeeCode}</p>
              </div>
              <button type="button" onClick={() => setDialog(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-wxBorder" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {dialog === "DEACTIVATE" ? <p className="mt-5 text-sm leading-6 text-wxIndigo600">Employment becomes inactive, Academy access is disabled, and active Academy sessions are revoked. History remains intact.</p> : null}
            {dialog === "ARCHIVE" ? <p className="mt-5 text-sm leading-6 text-wxIndigo600">The employee is deactivated, removed from operational views and retained in Archived with all history.</p> : null}
            {dialog === "RESTORE" ? <p className="mt-5 text-sm leading-6 text-wxIndigo600">The employee returns to the state held before archiving. Restored Academy access is synchronised immediately.</p> : null}
            {dialog === "ACCESS" ? <p className="mt-5 text-sm leading-6 text-wxIndigo600">This will {employee.academyEnabled ? "revoke active Academy sessions and prevent future sign-in" : "provision or reactivate Academy sign-in"}.</p> : null}
            {dialog === "RESET_PASSWORD" ? <p className="mt-5 text-sm leading-6 text-wxIndigo600">A new secure password will replace the old one and every active Academy session will be signed out. Learning progress and customer history remain unchanged.</p> : null}
            {dialog === "ROLE" ? (
              <label className="mt-5 grid gap-1.5 text-sm font-semibold text-wxIndigo800">
                Academy role
                <select value={role} onChange={(event) => setRole(event.target.value as AcademyRole)} className={inputClass}>
                  <option value="EMPLOYEE">Employee / BDE</option>
                  <option value="TRAINER">Trainer</option>
                  <option value="MANAGER_TL">Manager / TL</option>
                  <option value="SUPER_ADMIN">SuperAdmin</option>
                </select>
                <span className="text-xs font-normal text-wxIndigo500">Role changes are explicit, audited, and do not alter the employee segment or learning history.</span>
              </label>
            ) : null}
            {needsSupervisor ? (
              <div className="mt-4">
                {supervisorOptions.length ? (
                  <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo800">
                    {effectiveRole === "EMPLOYEE" ? "Assigned Trainer" : "Reports To Manager / TL"}
                    <select value={managerEmployeeId} onChange={(event) => setManagerEmployeeId(event.target.value)} className={inputClass}>
                      <option value="">Select {effectiveRole === "EMPLOYEE" ? "Trainer" : "Manager / TL"}</option>
                      {supervisorOptions.map((item) => <option key={item.id} value={item.id}>{item.displayName} · {item.employeeCode}</option>)}
                    </select>
                  </label>
                ) : (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
                    <p className="font-semibold">No active Academy {effectiveRole === "EMPLOYEE" ? "Trainer" : "Manager / TL"} available</p>
                    <p className="mt-1 text-sm leading-6">Create, enable or repair an authorised supervisor before assigning this employee.</p>
                  </div>
                )}
              </div>
            ) : null}
            {dialog === "DELETE" ? (
              <div className="mt-5 space-y-4">
                {!assessment && !error ? <p className="text-sm text-wxIndigo500">Checking Website and Academy dependencies...</p> : null}
                {assessment ? (
                  <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                    <p className="font-semibold text-wxIndigo900">Delete impact</p>
                    {assessment.dependencies.length ? (
                      <ul className="mt-3 space-y-1 text-sm text-wxIndigo700">
                        {assessment.dependencies.map((dependency) => <li key={dependency.code}>• {dependency.label} ({dependency.count})</li>)}
                      </ul>
                    ) : <p className="mt-2 text-sm text-wxIndigo500">No meaningful governed history was found.</p>}
                  </div>
                ) : null}
                {assessment && !assessment.fullPurgeAllowed ? (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
                    <p className="font-semibold">Permanent deletion is blocked</p>
                    <p className="mt-1 text-sm">Resolve protected reporting or governance assignments first. Archive remains available.</p>
                    <ul className="mt-3 space-y-1 text-sm">
                      {assessment.blockers.map((blocker) => <li key={blocker.code}>• {blocker.label}{blocker.count > 1 ? ` (${blocker.count})` : ""}</li>)}
                    </ul>
                  </div>
                ) : null}
                {assessment?.fullPurgeAllowed ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
                    {assessment.academyHasMeaningfulHistory
                      ? "Archive is recommended because governed history exists. Founder-authorised full purge remains available with deliberate confirmation."
                      : "No meaningful governed history was found. This identity can be permanently deleted."}
                  </div>
                ) : null}
                {assessment?.fullPurgeAllowed && assessment.academyHasMeaningfulHistory ? (
                  <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo800">
                    Deletion mode
                    <select value={deletionMode} onChange={(event) => setDeletionMode(event.target.value as "ZERO_HISTORY" | "FULL_PURGE")} className={inputClass}>
                      <option value="FULL_PURGE">Permanently purge employee and linked history</option>
                    </select>
                  </label>
                ) : null}
                <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo800">
                  Type DELETE {employee.employeeCode}
                  <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClass} disabled={!assessment?.fullPurgeAllowed} />
                </label>
                <label className="flex items-start gap-3 text-sm leading-6 text-wxIndigo700">
                  <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 accent-red-700" disabled={!assessment?.fullPurgeAllowed} />
                  <span>I understand that training, practice and linked employee data may be permanently removed.</span>
                </label>
              </div>
            ) : null}
            {needsReason ? (
              <label className="mt-4 grid gap-1.5 text-sm font-semibold text-wxIndigo800">
                Reason
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={500} className={`${inputClass} py-3`} placeholder="Record why this lifecycle action is required" />
              </label>
            ) : null}
            {error ? <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDialog(null)} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold text-wxIndigo700">Cancel</button>
              <button
                type="button"
                disabled={busy || !deleteReady || (needsSupervisor && (!managerEmployeeId || supervisorOptions.length === 0)) || (needsReason && reason.trim().length < (dialog === "DELETE" ? 10 : 3))}
                onClick={submitLifecycle}
                className={`min-h-11 rounded-md px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${dialog === "DELETE" ? "bg-red-700" : "wx-gradient-action"}`}
              >
                {busy ? "Working..." : dialog === "DELETE" ? deletionMode === "FULL_PURGE" ? "Permanently Purge Employee" : "Permanently Delete Employee" : dialog === "RESET_PASSWORD" ? "Reset Academy Password" : "Confirm"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {credentials ? <AcademyAccessReadyModal credentials={credentials} onDone={() => setCredentials(null)} /> : null}
    </>
  );
}

function EmployeeEditor({
  employee,
  employees,
  teams,
  onCreated,
  bootstrap
}: {
  employee?: EmployeeDirectoryItem;
  employees: EmployeeDirectoryItem[];
  teams: EmployeeTeam[];
  onCreated?: (result: {
    employeeName: string;
    loginEmail: string;
    initialPassword?: string;
    academyRole?: AcademyRole;
    primarySuperAdmin?: boolean;
  }) => void;
  bootstrap?: AcademyInitialAdminBootstrap;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const initialBootstrap = !employee && Boolean(bootstrap?.requiresConfirmation);
  const [academyEnabled, setAcademyEnabled] = useState(initialBootstrap || (employee?.academyEnabled ?? false));
  const [academyRole, setAcademyRole] = useState<AcademyRole>(initialBootstrap ? "SUPER_ADMIN" : (employee?.academyRole || "EMPLOYEE"));
  const [academyRoleChangeReason, setAcademyRoleChangeReason] = useState("");
  const [employeeSegment, setEmployeeSegment] = useState<EmployeeSegment>(employee?.employeeSegment || "NEW_BDE");
  const [department, setDepartment] = useState(employee?.department ?? "");
  const [managerEmployeeId, setManagerEmployeeId] = useState(employee?.managerEmployeeId || "");
  const [bootstrapConfirmed, setBootstrapConfirmed] = useState(false);
  const [confirmingDeactivation, setConfirmingDeactivation] = useState(false);
  const [confirmingSegment, setConfirmingSegment] = useState(false);
  const deactivationConfirmed = useRef(false);
  const segmentConfirmed = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const compatibleTeams = useMemo(
    () => teams.filter((team) => !department || team.department.toLowerCase() === department.toLowerCase()),
    [department, teams]
  );
  const validManagers = employees.filter((item) => item.id !== employee?.id
    && !item.archivedAt
    && item.employmentStatus === "ACTIVE"
    && item.academyEnabled
    && item.academyRole === "MANAGER_TL");
  const validManagerIds = new Set(validManagers.map((item) => item.id));
  const supervisorOptions = employees.filter((item) => item.id !== employee?.id
    && !item.archivedAt
    && item.employmentStatus === "ACTIVE"
    && item.academyEnabled
    && (academyRole === "EMPLOYEE"
      ? item.academyRole === "TRAINER" && Boolean(item.managerEmployeeId && validManagerIds.has(item.managerEmployeeId))
      : item.academyRole === "MANAGER_TL"));
  const directSupervisor = employees.find((item) => item.id === managerEmployeeId) || null;
  const displayedTrainer = academyRole === "EMPLOYEE"
    ? directSupervisor?.academyRole === "TRAINER"
      && directSupervisor.employmentStatus === "ACTIVE"
      && directSupervisor.academyEnabled
      && Boolean(directSupervisor.managerEmployeeId && validManagerIds.has(directSupervisor.managerEmployeeId))
      ? directSupervisor
      : null
    : academyRole === "TRAINER" ? employee || null : null;
  const displayedManager = academyRole === "MANAGER_TL"
    ? employee || null
    : academyRole === "TRAINER"
      ? directSupervisor
      : employees.find((item) => item.id === displayedTrainer?.managerEmployeeId) || null;
  const hierarchyRequired = academyEnabled && (academyRole === "EMPLOYEE" || academyRole === "TRAINER");
  const hierarchyValid = !hierarchyRequired || Boolean(managerEmployeeId && supervisorOptions.some((item) => item.id === managerEmployeeId));
  const storedSupervisor = employee ? employees.find((item) => item.id === employee.managerEmployeeId) || null : null;
  const storedHierarchyValid = !employee?.academyEnabled
    || !["EMPLOYEE", "TRAINER"].includes(employee.academyRole)
    || Boolean(storedSupervisor
      && storedSupervisor.employmentStatus === "ACTIVE"
      && storedSupervisor.academyEnabled
      && (employee.academyRole === "EMPLOYEE"
        ? storedSupervisor.academyRole === "TRAINER" && Boolean(storedSupervisor.managerEmployeeId && validManagerIds.has(storedSupervisor.managerEmployeeId))
        : storedSupervisor.academyRole === "MANAGER_TL"));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    setInitialPassword("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const disablesEmployee = employee?.employmentStatus === "ACTIVE" && values.employmentStatus === "INACTIVE";
    const disablesAcademy = Boolean(employee?.academyEnabled) && !academyEnabled;
    if ((disablesEmployee || disablesAcademy) && !deactivationConfirmed.current) {
      setBusy(false);
      setConfirmingDeactivation(true);
      return;
    }
    const changesSegment = employee?.academyRole === "EMPLOYEE" && employee.employeeSegment !== employeeSegment;
    if (changesSegment && !segmentConfirmed.current) {
      setBusy(false);
      setConfirmingSegment(true);
      return;
    }
    deactivationConfirmed.current = false;
    setConfirmingDeactivation(false);
    segmentConfirmed.current = false;
    setConfirmingSegment(false);
    const input = {
      ...values,
      academyEnabled,
      academyRole,
      employeeSegment,
      academyRoleChangeReason,
      initialBootstrapConfirmed: initialBootstrap ? bootstrapConfirmed : undefined,
      primaryTeamId: values.primaryTeamId || null,
      managerEmployeeId: managerEmployeeId || null
    };
    const response = await fetch(employee ? `/api/admin/employees/${employee.id}` : "/api/admin/employees", {
      method: employee ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });
    const payload = await response.json().catch(() => null) as {
      data?: { employee?: EmployeeDirectoryItem; sync?: { synced?: boolean; initialPassword?: string; error?: string } };
      error?: { message?: string };
    } | null;
    setBusy(false);
    if (!response.ok) {
      setError(payload?.error?.message || "The employee change could not be saved.");
      return;
    }
    if (payload?.data?.sync?.initialPassword) setInitialPassword(payload.data.sync.initialPassword);
    setMessage(payload?.data?.sync?.synced === false
      ? `Employee saved. Academy sync needs attention: ${payload.data.sync.error || "Retry from this record."}`
      : employee ? "Employee and Academy access updated." : "Employee created and Academy state processed.");
    onCreated?.({
      employeeName: String(values.displayName || "Employee"),
      loginEmail: String(values.officialEmail || ""),
      initialPassword: payload?.data?.sync?.initialPassword,
      academyRole: payload?.data?.employee?.academyRole,
      primarySuperAdmin: payload?.data?.employee?.primarySuperAdmin
    });
    router.refresh();
  }

  async function retrySync() {
    if (!employee) return;
    setRetrying(true);
    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/employees/${employee.id}/sync`, { method: "POST" });
    const payload = await response.json().catch(() => null) as {
      data?: { sync?: { initialPassword?: string } };
      error?: { message?: string };
    } | null;
    setRetrying(false);
    if (!response.ok) {
      setError(payload?.error?.message || "Academy sync is still unavailable.");
      router.refresh();
      return;
    }
    if (payload?.data?.sync?.initialPassword) setInitialPassword(payload.data.sync.initialPassword);
    setMessage("Academy sync completed.");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div role="alert" className="flex gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
        </div>
      ) : null}
      {message ? (
        <div role="status" className="flex gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <Check className="mt-0.5 h-4 w-4 shrink-0" /> <span>{message}</span>
        </div>
      ) : null}
      {initialPassword ? (
        <AcademyAccessReadyModal
          credentials={{
            employeeName: employee?.displayName || "Employee",
            loginEmail: employee?.officialEmail || "",
            initialPassword
          }}
          onDone={() => setInitialPassword("")}
        />
      ) : null}

      {employee ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusTile label="Employment" value={employee.employmentStatus} icon={<UserRound className="h-4 w-4" />} />
          <StatusTile label="Academy access" value={employee.academyEnabled ? storedHierarchyValid ? "Enabled" : "Setup Incomplete" : "Disabled"} icon={<ShieldCheck className="h-4 w-4" />} tone={employee.academyEnabled && !storedHierarchyValid ? "danger" : undefined} />
          <StatusTile label="Academy role" value={employee.academyRole === "SUPER_ADMIN" ? "SuperAdmin" : employee.academyRole === "MANAGER_TL" ? "Manager / TL" : employee.academyRole === "TRAINER" ? "Trainer" : "Employee / BDE"} icon={<ShieldCheck className="h-4 w-4" />} />
          <StatusTile label="Primary SuperAdmin" value={employee.primarySuperAdmin ? "YES" : "NO"} icon={<UserRound className="h-4 w-4" />} />
          {employee.academyRole === "EMPLOYEE" ? <StatusTile label="Employee segment" value={employee.employeeSegment === "SENIOR_BDE" ? "Senior BDE" : "New BDE"} icon={<GraduationCap className="h-4 w-4" />} /> : null}
          <StatusTile label="Credential" value={employee.academyEnabled && employee.academyUserId && employee.syncStatus === "SYNCED" ? "ACTIVE" : "SETUP REQUIRED"} icon={<KeyRound className="h-4 w-4" />} tone={employee.academyEnabled && employee.academyUserId && employee.syncStatus === "SYNCED" ? undefined : "danger"} />
          <StatusTile label="Login email" value={employee.officialEmail} icon={<UserRound className="h-4 w-4" />} />
          <StatusTile label="Sync status" value={!storedHierarchyValid ? "Requires Action" : employee.syncStatus === "FAILED" ? "Runtime Failure" : employee.syncStatus === "PENDING" ? "Requires Action" : "Healthy"} icon={<RefreshCw className="h-4 w-4" />} tone={employee.syncStatus === "FAILED" || !storedHierarchyValid ? "danger" : undefined} />
          <StatusTile label="Last Academy sync" value={employee.lastSyncedAt ? new Date(employee.lastSyncedAt).toLocaleString() : "Not synced yet"} icon={<RefreshCw className="h-4 w-4" />} />
        </div>
      ) : null}

      {employee?.syncStatus === "FAILED" ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-4">
          <p className="font-semibold text-red-900">{storedHierarchyValid ? "Academy access is out of sync" : "Hierarchy required"}</p>
          <p className="mt-1 text-sm leading-6 text-red-800">{employee.lastSyncError || "The Academy did not accept the latest change."}</p>
          {!storedHierarchyValid && (employee.academyRole === "EMPLOYEE" || employee.academyRole === "TRAINER") ? (
            <div className="mt-4 max-w-xl">
              {supervisorOptions.length ? (
                <label className="grid gap-1.5 text-sm font-semibold text-red-950">
                  {employee.academyRole === "EMPLOYEE" ? "Assigned Trainer" : "Manager / TL"}
                  <select value={managerEmployeeId} onChange={(event) => setManagerEmployeeId(event.target.value)} className={inputClass}>
                    <option value="">Select {employee.academyRole === "EMPLOYEE" ? "Trainer" : "Manager / TL"}</option>
                    {supervisorOptions.map((item) => <option key={item.id} value={item.id}>{item.displayName} · {item.employeeCode}</option>)}
                  </select>
                  {displayedManager ? <span className="text-xs font-normal">Manager / TL: {displayedManager.displayName}</span> : null}
                </label>
              ) : (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
                  <p className="font-semibold">No active Academy {employee.academyRole === "EMPLOYEE" ? "Trainer" : "Manager / TL"} available</p>
                  <p className="mt-1 text-sm">Create/enable a supervisor or repair an existing hierarchy before assigning this employee.</p>
                </div>
              )}
              <button type="button" disabled={!hierarchyValid || busy} onClick={() => formRef.current?.requestSubmit()} className="wx-gradient-action mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-50">
                <RefreshCw className="h-4 w-4" /> Save & Retry Academy Sync
              </button>
            </div>
          ) : !employee.academyEnabled || employee.employmentStatus === "INACTIVE" ? (
            <p className="mt-2 text-sm font-semibold text-red-900">Security attention: confirm deactivation by retrying until the status is SYNCED.</p>
          ) : null}
          {storedHierarchyValid ? <button type="button" disabled={retrying} onClick={retrySync} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} /> {retrying ? "Retrying..." : "Retry Academy Sync"}
          </button> : null}
        </div>
      ) : null}

      {confirmingDeactivation ? (
        <div role="alertdialog" aria-labelledby="deactivation-title" className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <h2 id="deactivation-title" className="font-semibold">Confirm employee access change</h2>
          <p className="mt-1 text-sm leading-6">
            This will disable the selected access and revoke active Sales Academy sessions after the Website record is saved.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                deactivationConfirmed.current = true;
                formRef.current?.requestSubmit();
              }}
              className="min-h-11 rounded-md bg-amber-700 px-4 text-sm font-semibold text-white"
            >
              Confirm and revoke access
            </button>
            <button type="button" onClick={() => setConfirmingDeactivation(false)} className="min-h-11 rounded-md border border-amber-300 bg-white px-4 text-sm font-semibold">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {confirmingSegment ? (
        <div role="alertdialog" aria-labelledby="segment-change-title" className="rounded-md border border-violet-300 bg-violet-50 p-4 text-violet-950">
          <h2 id="segment-change-title" className="font-semibold">Confirm employee training-track change</h2>
          <p className="mt-1 text-sm leading-6">This changes which governed Academy journey the employee receives. Their identity, progress, practice, customer history, and audit records remain preserved.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => { segmentConfirmed.current = true; formRef.current?.requestSubmit(); }} className="wx-gradient-action min-h-11 rounded-md px-4 text-sm font-semibold text-white">Confirm segment change</button>
            <button type="button" onClick={() => setConfirmingSegment(false)} className="min-h-11 rounded-md border border-violet-300 bg-white px-4 text-sm font-semibold">Cancel</button>
          </div>
        </div>
      ) : null}

      <form ref={formRef} onSubmit={save} className="grid gap-5">
        {initialBootstrap ? (
          <section className="rounded-lg border border-violet-300 bg-violet-50 p-5 text-violet-950 shadow-soft md:p-6">
            <p className="text-xs font-semibold uppercase text-violet-700">Academy initial admin setup</p>
            <h2 className="mt-2 text-lg font-semibold">First Academy Admin</h2>
            <p className="mt-2 text-sm leading-6">This is the first real Academy account. It will receive SuperAdmin access and unique Primary SuperAdmin governance after successful credential creation.</p>
            <label className="mt-4 flex items-start gap-3 text-sm leading-6">
              <input type="checkbox" checked={bootstrapConfirmed} onChange={(event) => setBootstrapConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-violet-700" />
              <span>I confirm this is the real first Academy administrator, not a test, UAT, demo or temporary identity.</span>
            </label>
          </section>
        ) : null}
        <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft md:p-6">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-wxViolet700" />
            <h2 className="text-lg font-semibold text-wxIndigo900">Employment</h2>
          </div>
          {employee ? <p className="mt-2 break-all text-xs text-wxIndigo500">Stable employee ID: {employee.id}</p> : null}
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Employee code"><input name="employeeCode" required maxLength={80} defaultValue={employee?.employeeCode} className={inputClass} /></Field>
            <Field label="Full name"><input name="displayName" required maxLength={120} defaultValue={employee?.displayName} className={inputClass} /></Field>
            <Field label="Official email"><input name="officialEmail" type="email" required maxLength={254} defaultValue={employee?.officialEmail} className={inputClass} /></Field>
            <Field label="Department"><input name="department" required maxLength={120} value={department} onChange={(event) => setDepartment(event.target.value)} className={inputClass} /></Field>
            <Field label="Designation"><input name="designation" required maxLength={120} defaultValue={employee?.designation} className={inputClass} /></Field>
            <Field label="Employment status"><select name="employmentStatus" defaultValue={employee?.employmentStatus || "ACTIVE"} className={inputClass}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></Field>
            <Field label="Primary team"><select name="primaryTeamId" defaultValue={employee?.primaryTeamId || ""} className={inputClass}><option value="">No team</option>{compatibleTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field>
          </div>
        </section>

        <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft md:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-wxViolet700" />
            <h2 className="text-lg font-semibold text-wxIndigo900">Application access</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-wxIndigo500">Training content and progress stay in the Academy. This screen controls identity and access only.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,.75fr)]">
            <label className="flex min-h-[76px] cursor-pointer items-center justify-between gap-4 rounded-md border border-wxBorder bg-wxSurfaceSoft px-4 py-3">
              <span>
                <span className="block font-semibold text-wxIndigo900">Sales Academy access</span>
                <span className="mt-1 block text-sm text-wxIndigo500">Turning this off revokes active Academy sessions.</span>
              </span>
              <input type="checkbox" checked={academyEnabled} onChange={(event) => setAcademyEnabled(event.target.checked)} disabled={initialBootstrap} className="h-5 w-5 accent-violet-700 disabled:opacity-60" />
            </label>
            <Field label="Academy role">
              <select name="academyRole" value={academyRole} onChange={(event) => { setAcademyRole(event.target.value as AcademyRole); setManagerEmployeeId(""); }} disabled={initialBootstrap} className={inputClass}>
                <option value="EMPLOYEE">Employee / BDE</option>
                <option value="TRAINER">Trainer</option>
                <option value="MANAGER_TL">Manager / TL</option>
                <option value="SUPER_ADMIN">SuperAdmin</option>
              </select>
              <span className="text-xs font-normal text-wxIndigo500">Role, employee segment, and reporting hierarchy are separate controls.</span>
            </Field>
          </div>
          {employee && academyRole !== employee.academyRole ? (
            <div className="mt-4 max-w-xl">
              <Field label="Role change reason">
                <textarea value={academyRoleChangeReason} onChange={(event) => setAcademyRoleChangeReason(event.target.value)} required minLength={3} maxLength={500} rows={3} className={`${inputClass} py-3`} placeholder="Record the authorised reason for this Academy role change" />
              </Field>
            </div>
          ) : null}
          {academyRole === "EMPLOYEE" ? <div className="mt-4 max-w-xl"><Field label="Employee segment"><select name="employeeSegment" value={employeeSegment} onChange={(event) => setEmployeeSegment(event.target.value as EmployeeSegment)} className={inputClass}><option value="NEW_BDE">New BDE · Foundation journey</option><option value="SENIOR_BDE">Senior BDE · Diagnostic and focused development</option></select><span className="text-xs font-normal text-wxIndigo500">This is a training segment, not an Academy role. Changing it preserves the employee identity and all history.</span></Field></div> : <input type="hidden" name="employeeSegment" value="SENIOR_BDE" />}
          {academyRole === "EMPLOYEE" || academyRole === "TRAINER" ? <div id="academy-hierarchy" className="mt-4 max-w-xl">{supervisorOptions.length ? <Field label={academyRole === "EMPLOYEE" ? "Assigned Trainer" : "Reports To Manager / TL"}><select name="managerEmployeeId" required={academyEnabled} value={managerEmployeeId} onChange={(event) => setManagerEmployeeId(event.target.value)} className={inputClass}><option value="">{academyRole === "EMPLOYEE" ? "Select Trainer" : "Select Manager / TL"}</option>{supervisorOptions.map((item) => <option key={item.id} value={item.id}>{item.displayName} · {item.employeeCode}</option>)}</select><span className="text-xs font-normal text-wxIndigo500">{academyRole === "EMPLOYEE" ? displayedManager ? `Manager / TL: ${displayedManager.displayName}` : "The Manager / TL resolves automatically through the selected Trainer." : "Only active authorised Manager / TL employees are available."}</span></Field> : <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950"><p className="font-semibold">No active Academy {academyRole === "EMPLOYEE" ? "Trainer" : "Manager / TL"} available</p><p className="mt-1 text-sm leading-6">Create/enable a {academyRole === "EMPLOYEE" ? "Trainer or repair an existing Trainer" : "Manager / TL"} before assigning this employee.</p></div>}</div> : <input type="hidden" name="managerEmployeeId" value="" />}

          {hierarchyRequired && !hierarchyValid ? (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
              <p className="font-semibold">Academy setup incomplete</p>
              <p className="mt-1 text-sm leading-6">Assign an active {academyRole === "EMPLOYEE" ? "Trainer" : "Manager / TL"} before enabling Academy access for this employee.</p>
            </div>
          ) : null}

          {academyRole === "SUPER_ADMIN" ? (
            <div className="mt-4 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 text-sm text-wxIndigo700">
              <p><span className="font-semibold">Primary SuperAdmin:</span> {initialBootstrap ? "Will be assigned after successful credential creation" : employee?.primarySuperAdmin ? "YES" : "NO"}</p>
              <p className="mt-1 leading-6">{initialBootstrap
                ? "This one-time bootstrap does not apply to any later employee."
                : "Multiple SuperAdmins are allowed. Exactly one Primary is managed through the separate governance transfer control."}</p>
              {!initialBootstrap ? <Link href="/admin/ai-governance#primary-superadmin" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md border border-wxBorder bg-wxSurface px-4 font-semibold text-wxViolet700">Manage Primary SuperAdmin</Link> : null}
            </div>
          ) : null}

          {employee && academyRole !== "SUPER_ADMIN" ? <div className="mt-5 grid gap-3 md:grid-cols-3" aria-label="Academy reporting chain">
            <StatusTile label="Manager / TL" value={displayedManager?.displayName || (academyRole === "MANAGER_TL" ? employee.displayName : "Reassignment required")} icon={<UsersRound className="h-4 w-4" />} tone={displayedManager ? undefined : "danger"}/>
            <StatusTile label="Trainer" value={displayedTrainer?.displayName || (academyRole === "MANAGER_TL" ? "Not applicable" : "Reassignment required")} icon={<GraduationCap className="h-4 w-4" />} tone={academyRole !== "MANAGER_TL" && !displayedTrainer ? "danger" : undefined}/>
            <StatusTile label="Employee" value={employee.displayName} icon={<UserRound className="h-4 w-4" />}/>
          </div> : null}
        </section>

        <div className="flex flex-col gap-2 rounded-md border border-wxBorder bg-wxSurfaceElevated/95 p-3 shadow-lift sm:flex-row sm:items-center sm:justify-between md:sticky md:bottom-20 md:z-20 md:backdrop-blur">
          <p className="text-xs leading-5 text-wxIndigo500">Changes are audited. Academy sync runs after the Website record is safely saved.</p>
          <button disabled={busy || !hierarchyValid || (initialBootstrap && !bootstrapConfirmed)} className="wx-gradient-action inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold text-white disabled:opacity-60">
            <Check className="h-4 w-4" /> {busy ? "Saving..." : initialBootstrap ? "Create Primary SuperAdmin" : employee ? "Save Employee" : "Create Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AcademyAccessReadyModal({
  credentials,
  onDone
}: {
  credentials: AcademyAccessCredentials;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState<"email" | "password" | "details" | null>(null);
  const academyUrl = credentials.academyUrl || "https://academy.writex.co.in";
  const password = credentials.initialPassword.trim();
  if (!password) return null;

  async function copy(kind: "email" | "password" | "details") {
    const value = kind === "email"
      ? credentials.loginEmail
      : kind === "password"
        ? password
        : `WriteX Sales Academy\n${academyUrl}\n\nEmail: ${credentials.loginEmail}\nPassword: ${password}`;
    await navigator.clipboard.writeText(value);
    setCopied(kind);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="academy-access-ready-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-md border border-wxBorder bg-wxSurface p-5 shadow-lift md:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-700">Sales Academy</p>
            <h2 id="academy-access-ready-title" className="mt-1 text-xl font-semibold text-wxIndigo900">Sales Academy Access Ready</h2>
            <p className="mt-1 text-sm leading-6 text-wxIndigo500">Share these login details privately. This password is shown only now.</p>
          </div>
        </div>

        <dl className="mt-5 grid gap-4">
          <div><dt className="text-xs font-semibold uppercase text-wxIndigo500">Employee</dt><dd className="mt-1 font-semibold text-wxIndigo900">{credentials.employeeName}</dd></div>
          {credentials.academyRole ? <div><dt className="text-xs font-semibold uppercase text-wxIndigo500">Academy Role</dt><dd className="mt-1 font-semibold text-wxIndigo900">{credentials.academyRole === "SUPER_ADMIN" ? "SuperAdmin" : credentials.academyRole.replace("_", " / ")}</dd></div> : null}
          {credentials.primarySuperAdmin ? <div><dt className="text-xs font-semibold uppercase text-wxIndigo500">Primary SuperAdmin</dt><dd className="mt-1 font-semibold text-emerald-700">Yes</dd></div> : null}
          <div>
            <dt className="text-xs font-semibold uppercase text-wxIndigo500">Login Email</dt>
            <dd className="mt-1 break-all rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 py-2 font-mono text-sm text-wxIndigo900">{credentials.loginEmail}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-wxIndigo500">Password</dt>
            <dd className="mt-1"><input aria-label="Generated Academy password" readOnly value={password} className={`${inputClass} font-mono`} /></dd>
          </div>
          <div><dt className="text-xs font-semibold uppercase text-wxIndigo500">Academy URL</dt><dd className="mt-1"><a href={academyUrl} target="_blank" rel="noreferrer" className="font-semibold text-wxViolet700 underline underline-offset-4">{academyUrl}</a></dd></div>
        </dl>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => copy("email")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-semibold text-wxIndigo700 hover:border-wxViolet700">
            <Copy className="h-4 w-4" /> {copied === "email" ? "Email Copied" : "Copy Email"}
          </button>
          <button type="button" onClick={() => copy("password")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-semibold text-wxIndigo700 hover:border-wxViolet700">
            <Copy className="h-4 w-4" /> {copied === "password" ? "Password Copied" : "Copy Password"}
          </button>
          <button type="button" onClick={() => copy("details")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-semibold text-wxIndigo700 hover:border-wxViolet700">
            <Copy className="h-4 w-4" /> {copied === "details" ? "Details Copied" : "Copy Login Details"}
          </button>
        </div>

        <p className="mt-4 text-xs leading-5 text-wxIndigo500">If this window is closed before the password is shared, use Manage → Reset Academy Password. Existing passwords cannot be retrieved.</p>
        <button type="button" onClick={onDone} className="wx-gradient-action mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md px-5 text-sm font-semibold text-white">Done</button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo800"><span>{label}</span>{children}</label>;
}

function StatusTile({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone?: "danger" }) {
  return <div className={`rounded-md border px-4 py-3 ${tone === "danger" ? "border-red-200 bg-red-50" : "border-wxBorder bg-wxSurface"}`}><div className="flex items-center gap-2 text-xs font-semibold uppercase text-wxIndigo500">{icon}{label}</div><p className={`mt-2 font-semibold ${tone === "danger" ? "text-red-800" : "text-wxIndigo900"}`}>{value}</p></div>;
}

const inputClass = "min-h-11 w-full rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm font-normal text-wxIndigo900 outline-none focus:border-wxViolet700";
const menuItemClass = "flex min-h-10 w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-wxIndigo700 hover:bg-wxSurfaceSoft hover:text-wxViolet700 disabled:cursor-not-allowed disabled:opacity-40";
