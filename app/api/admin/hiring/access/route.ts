import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, forbidden } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import {
  grantHiringAccess,
  hiringDelegatedRoles,
  listHiringAccessGrants,
  resetHiringAdminPassword,
  revokeHiringAccess
} from "@/lib/hiring/access";
import { assertRateLimit, assertSameOrigin, getRequestContext, parseJson } from "@/lib/security";
import { strongAdminPassword } from "@/lib/validation";

const grantSchema = z.object({
  email: z.email().max(200),
  hiringRole: z.enum(hiringDelegatedRoles),
  reason: z.string().trim().min(5).max(500)
});
const revokeSchema = z.object({
  grantId: z.uuid(),
  reason: z.string().trim().min(5).max(500)
});
const passwordSchema = z.object({
  adminUserId: z.uuid(),
  newPassword: strongAdminPassword,
  confirmPassword: z.string(),
  reason: z.string().trim().min(5).max(500)
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"]
});

function requireSuperAdmin(request: NextRequest) {
  const admin = getAdminSessionFromRequest(request);
  if (admin.role !== "super_admin") throw forbidden("Only the Super Admin can manage Smart Hiring access.");
  return admin;
}

export async function GET(request: NextRequest) {
  try {
    requireSuperAdmin(request);
    return apiOk({ grants: await listHiringAccessGrants() }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = requireSuperAdmin(request);
    const context = getRequestContext(request);
    assertRateLimit({ key: `hiring-access-grant:${admin.adminUserId}:${context.ipAddress}`, limit: 30, windowSeconds: 3600 });
    const input = await parseJson(request, grantSchema);
    return apiOk(await grantHiringAccess({ ...input, actorAdminUserId: admin.adminUserId }), { status: 201, headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = requireSuperAdmin(request);
    const input = await parseJson(request, revokeSchema);
    return apiOk(await revokeHiringAccess({ ...input, actorAdminUserId: admin.adminUserId }), { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = requireSuperAdmin(request);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `hiring-access-password:${admin.adminUserId}:${context.ipAddress}`,
      limit: 10,
      windowSeconds: 3600
    });
    const input = await parseJson(request, passwordSchema);
    const result = await resetHiringAdminPassword({
      adminUserId: input.adminUserId,
      newPassword: input.newPassword,
      reason: input.reason,
      actorAdminUserId: admin.adminUserId
    });
    await logAuditEvent({
      actorType: "admin",
      actorId: admin.adminUserId,
      actorEmail: admin.email,
      entityType: "admin_user",
      entityId: input.adminUserId,
      action: "hiring_secondary_password_reset",
      metadata: {
        reason: input.reason,
        mustChangePassword: true,
        sessionsRevoked: true
      },
      request
    });
    return apiOk(result, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
