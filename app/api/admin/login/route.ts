import type { NextRequest } from "next/server";
import { apiError, apiOk, notConfigured, unauthorized } from "@/lib/api/response";
import {
  createSignedSessionToken,
  getAdminSessionMaxAgeSeconds,
  setSessionCookie,
  verifyAdminPassword
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { assertRateLimit, getRequestContext, parseJson } from "@/lib/security";
import { adminLoginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      throw notConfigured("Admin authentication storage is not configured.");
    }

    const context = getRequestContext(request);
    assertRateLimit({
      key: `admin-login:${context.ipAddress}`,
      limit: 8,
      windowSeconds: 300
    });
    const body = await parseJson(request, adminLoginSchema);
    const result = await dbQuery<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
      role: string;
      is_active: boolean;
      must_change_password: boolean;
    }>(
      `
        select id, name, email, password_hash, role, is_active, must_change_password
        from admin_users
        where lower(email) = lower($1)
        limit 1
      `,
      [body.email]
    );
    const admin = result.rows[0];

    if (
      !admin ||
      !admin.is_active ||
      !(await verifyAdminPassword(body.password, admin.password_hash))
    ) {
      await logAuditEvent({
        actorType: "admin",
        actorEmail: body.email,
        entityType: "admin_session",
        action: "admin_login_failed",
        request
      });
      throw unauthorized("Invalid admin credentials.");
    }

    await dbQuery("update admin_users set last_login_at = now() where id = $1", [
      admin.id
    ]);

    const maxAge = getAdminSessionMaxAgeSeconds();
    const token = createSignedSessionToken(
      {
        kind: "admin",
        adminUserId: admin.id,
        email: admin.email,
        role: admin.role,
        mustChangePassword: admin.must_change_password
      },
      maxAge
    );
    const response = apiOk({
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        mustChangePassword: admin.must_change_password
      }
    });

    setSessionCookie(response, token, maxAge);

    await logAuditEvent({
      actorType: "admin",
      actorId: admin.id,
      actorEmail: admin.email,
      entityType: "admin_session",
      action: "admin_login_success",
      request
    });

    return response;
  } catch (error) {
    return apiError(error);
  }
}
