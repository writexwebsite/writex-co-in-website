import type { NextRequest } from "next/server";
import { apiError, apiOk, forbidden } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { getProductionReadiness } from "@/lib/config/productionGuards";
import {
  getIntegrationHealth,
  storeIntegrationHealthSnapshot
} from "@/lib/integrations/health";
import { sendInternalEmail } from "@/lib/notifications";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext
} from "@/lib/security";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = getAdminSessionFromRequest(request);
    if (session.role !== "super_admin") {
      throw forbidden("Only a Super Admin can view infrastructure health.");
    }
    const readiness = getProductionReadiness();
    const systems = await getIntegrationHealth();

    return apiOk({
      systems,
      integrationMode: process.env.INTEGRATION_MODE || "disabled",
      jobSecretConfigured: Boolean(process.env.JOB_SECRET),
      readiness
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = getAdminSessionFromRequest(request);
    if (session.role !== "super_admin") {
      throw forbidden("Only a Super Admin can test notification delivery.");
    }
    const context = getRequestContext(request);
    assertRateLimit({
      key: `integration-email-test:${session.adminUserId}:${context.ipAddress}`,
      limit: 3,
      windowSeconds: 60 * 60
    });
    const recipient =
      process.env.SUPPORT_EMAIL ||
      process.env.CONTACT_NOTIFICATION_EMAIL ||
      process.env.QUOTE_NOTIFICATION_EMAIL;
    if (!recipient) {
      await storeIntegrationHealthSnapshot({
        key: "ses",
        status: "not_configured",
        detail: "No approved internal test recipient is configured."
      });
      return apiOk(
        { sent: false, status: "not_configured" },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }
    const result = await sendInternalEmail({
      to: recipient,
      subject: "WriteX integration health test",
      text: [
        "This is an authorised WriteX production notification-health test.",
        `UTC timestamp: ${new Date().toISOString()}`,
        "",
        "No action is required."
      ].join("\n")
    });
    await storeIntegrationHealthSnapshot({
      key: "ses",
      status: result.sent ? "connected_healthy" : "configured_unreachable",
      detail: result.sent
        ? "An authorised internal delivery test was accepted by the configured transport."
        : "The configured transport did not accept the authorised internal delivery test.",
      messageId: "messageId" in result ? result.messageId || null : null
    });
    await storeIntegrationHealthSnapshot({
      key: "notification_service",
      status: result.sent ? "connected_healthy" : "configured_unreachable",
      detail: result.sent
        ? "The application notification service completed an internal delivery test."
        : "The application notification service failed its internal delivery test.",
      messageId: "messageId" in result ? result.messageId || null : null
    });
    return apiOk(
      {
        sent: result.sent,
        provider: "provider" in result ? result.provider : undefined,
        messageIdStored: Boolean(
          "messageId" in result && result.messageId
        )
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}
