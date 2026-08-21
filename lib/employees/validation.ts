import { z } from "zod";
import { assignableAcademyRoles, employeeSegments, employeeStatuses } from "@/lib/employees/domain";

const optionalUuid = z.union([z.uuid(), z.literal(""), z.null()])
  .transform((value) => value || null);

export const employeeMutationSchema = z.object({
  employeeCode: z.string().trim().min(2).max(80),
  displayName: z.string().trim().min(2).max(120),
  officialEmail: z.email().max(254),
  department: z.string().trim().min(2).max(120),
  designation: z.string().trim().min(2).max(120),
  employmentStatus: z.enum(employeeStatuses),
  primaryTeamId: optionalUuid,
  managerEmployeeId: optionalUuid,
  academyEnabled: z.boolean(),
  academyRole: z.enum(assignableAcademyRoles),
  employeeSegment: z.enum(employeeSegments),
  academyRoleChangeReason: z.string().trim().max(500).optional()
});

export const employeeTeamSchema = z.object({
  teamCode: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(120),
  department: z.string().trim().min(2).max(120)
});

export const employeeLifecycleMutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("DEACTIVATE"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("ARCHIVE"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("RESTORE"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("SET_ACADEMY_ACCESS"), enabled: z.boolean() }),
  z.object({
    action: z.literal("SET_ACADEMY_ROLE"),
    role: z.enum(assignableAcademyRoles),
    reason: z.string().trim().min(3).max(500)
  })
]);

export const employeePermanentDeleteSchema = z.object({
  confirmation: z.string().trim().min(2).max(254),
  reason: z.string().trim().min(10).max(500)
});
