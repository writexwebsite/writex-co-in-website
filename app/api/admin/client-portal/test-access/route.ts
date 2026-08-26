import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { assertCanManageClientPortal } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  assertClientPortalTestAccessEnabled,
  createClientPortalTestAccess,
  getClientPortalTestAccessSummary,
  listClientPortalTestAccess
} from "@/lib/client/test-access";
import { clientTestProfileReferences } from "@/lib/client/test-access-types";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext,
  parseJson
} from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createSchema = z.object({
  testProfileReference: z.enum(clientTestProfileReferences),
  testInvoiceReference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^WX-TEST-[A-Z0-9][A-Z0-9-]{3,63}$/,
      "Use a sanitized invoice reference beginning with WX-TEST-."
    ),
  durationMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  singleUse: z.boolean(),
  reason: z.string().trim().min(10).max(500)
});

export async function GET(request: NextRequest) {
  try {
    assertClientPortalTestAccessEnabled();
    const admin = getAdminSessionFromRequest(request);
    assertCanManageClientPortal(admin);
    const records = await listClientPortalTestAccess();
    const summary = await getClientPortalTestAccessSummary(records);
    return apiOk(
      { records, summary },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertClientPortalTestAccessEnabled();
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    assertCanManageClientPortal(admin);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `client-test-access-generate:${admin.adminUserId}:${context.ipAddress}`,
      limit: 10,
      windowSeconds: 15 * 60
    });
    const body = await parseJson(request, createSchema);
    const generated = await createClientPortalTestAccess({
      ...body,
      adminUserId: admin.adminUserId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
    await logAuditEvent({
      actorType: "admin",
      actorId: admin.adminUserId,
      actorEmail: admin.email,
      entityType: "client_portal_test_access",
      entityId: generated.record.id,
      action: "client_test_access_generated",
      metadata: {
        testProfileReference: generated.record.testProfileReference,
        testInvoiceReference: generated.record.testInvoiceReference,
        expiresAt: generated.record.expiresAt,
        singleUse: generated.record.singleUse
      },
      request
    });
    return apiOk(generated, {
      headers: { "cache-control": "no-store" }
    });
  } catch (error) {
    return apiError(error);
  }
}
