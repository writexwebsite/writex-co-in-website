import type { NextRequest } from "next/server";
import { apiError, apiOk, unauthorized } from "@/lib/api/response";
import { createEmployeeSessionRecord, createSignedSessionToken, getEmployeeSessionMaxAgeSeconds, setEmployeeSessionCookie } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { authenticateEmployee } from "@/lib/integrations/employeeAuth";
import { assertRateLimit, getRequestContext, hashValue, parseJson } from "@/lib/security";
import { employeeLoginSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const context = getRequestContext(request);
    const body = await parseJson(request, employeeLoginSchema);
    assertRateLimit({ key: `employee-login:${context.ipAddress}:${hashValue(body.identifier.toLowerCase()).slice(0, 16)}`, limit: Number(process.env.EMPLOYEE_LOGIN_MAX_ATTEMPTS || 6), windowSeconds: 900 });
    const bootstrap = await authenticateEmployee(body.identifier, body.password);
    const allowedRoutes = new Set(bootstrap.navigation.map((item) => item.route));
    if (!bootstrap.user?.employeeId || !bootstrap.defaultRoute || !allowedRoutes.has(bootstrap.defaultRoute)) throw unauthorized("Unable to sign in with those details. Please try again or contact WriteX IT Support.");
    const maxAge = getEmployeeSessionMaxAgeSeconds();
    const stored = await createEmployeeSessionRecord(bootstrap.user.employeeId, context.ipAddress, context.userAgent);
    const token = createSignedSessionToken({ kind: "employee", sessionId: stored.sessionId, employeeId: bootstrap.user.employeeId, email: bootstrap.user.email, tokenHash: stored.tokenHash, defaultRoute: bootstrap.defaultRoute }, maxAge);
    const response = apiOk({ authenticated: true, user: { employeeId: bootstrap.user.employeeId, name: bootstrap.user.name }, defaultRoute: bootstrap.defaultRoute, availableWorkspaces: bootstrap.availableWorkspaces });
    setEmployeeSessionCookie(response, token, maxAge);
    await logAuditEvent({ actorType: "employee", actorId: bootstrap.user.employeeId, actorEmail: bootstrap.user.email, entityType: "employee_session", action: "employee_login_success", request });
    return response;
  } catch (error) {
    await logAuditEvent({ actorType: "employee", entityType: "employee_session", action: "employee_login_failed", request });
    return apiError(error);
  }
}
