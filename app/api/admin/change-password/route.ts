import type { NextRequest } from "next/server";
import { apiError, apiOk, badRequest, unauthorized } from "@/lib/api/response";
import {
  createSignedSessionToken,
  getAdminSessionFromRequest,
  getAdminSessionMaxAgeSeconds,
  hashAdminPassword,
  setSessionCookie,
  verifyAdminPassword
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { dbQuery } from "@/lib/db";
import { assertRateLimit, getRequestContext, parseJson } from "@/lib/security";
import { adminChangePasswordSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = getAdminSessionFromRequest(request, {
      allowPasswordChangeRequired: true
    });
    const context = getRequestContext(request);
    assertRateLimit({
      key: `admin-password-change:${session.adminUserId}:${context.ipAddress}`,
      limit: 5,
      windowSeconds: 15 * 60
    });
    const body = await parseJson(request, adminChangePasswordSchema);
    const result = await dbQuery<{
      name: string;
      email: string;
      role: string;
      password_hash: string;
      is_active: boolean;
      session_version: number;
    }>(
      `
        select name, email, role, password_hash, is_active, session_version
        from admin_users
        where id = $1
        limit 1
      `,
      [session.adminUserId]
    );
    const admin = result.rows[0];

    if (!admin?.is_active) {
      throw unauthorized("Administrator access is unavailable.");
    }

    if (await verifyAdminPassword(body.newPassword, admin.password_hash)) {
      throw badRequest("Choose a password that is different from the temporary password.");
    }

    const passwordHash = await hashAdminPassword(body.newPassword);
    const update = await dbQuery<{ session_version: number }>(
      `
        update admin_users
        set password_hash = $1,
            must_change_password = false,
            password_changed_at = now(),
            session_version = session_version + 1,
            updated_at = now()
        where id = $2
        returning session_version
      `,
      [passwordHash, session.adminUserId]
    );

    const maxAge = getAdminSessionMaxAgeSeconds();
    const token = createSignedSessionToken(
      {
        kind: "admin",
        adminUserId: session.adminUserId,
        email: admin.email,
        role: admin.role,
        hiringRole: session.hiringRole,
        mustChangePassword: false,
        sessionVersion: update.rows[0].session_version
      },
      maxAge
    );
    const response = apiOk({
      passwordChanged: true,
      destination: session.role !== "super_admin" && session.hiringRole
        ? "/admin/hiring"
        : "/admin/dashboard"
    });
    setSessionCookie(response, token, maxAge);

    await logAuditEvent({
      actorType: "admin",
      actorId: session.adminUserId,
      actorEmail: admin.email,
      entityType: "admin_user",
      entityId: session.adminUserId,
      action: "admin_password_changed",
      request
    });

    return response;
  } catch (error) {
    return apiError(error);
  }
}
