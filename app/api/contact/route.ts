import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, notConfigured } from "@/lib/api/response";
import {
  isEmailConfigured,
  notifyContactAcknowledgement,
  notifyContactEnquiry
} from "@/lib/notifications";
import { assertRateLimit, getRequestContext, parseJson } from "@/lib/security";
import { getSubmissionKey, runSubmissionOnce } from "@/lib/submission-idempotency";
import { assertNotTestClientRequest } from "@/lib/auth";

export const runtime = "nodejs";

const contactSchema = z.object({
  intent: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  whatsapp: z.string().trim().max(40).optional(),
  reference: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10).max(5000)
});

export async function POST(request: NextRequest) {
  try {
    await assertNotTestClientRequest(request);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `contact:${context.ipAddress}`,
      limit: 8,
      windowSeconds: 600
    });

    if (!isEmailConfigured()) {
      throw notConfigured(
        "Email delivery is temporarily unavailable. Please contact WriteX on WhatsApp."
      );
    }

    const contact = await parseJson(request, contactSchema);
    const submission = await runSubmissionOnce({
      key: getSubmissionKey(request, "contact-notifications", contact),
      task: async () => {
        const internal = await notifyContactEnquiry(contact);

        if (!internal.sent) {
          throw notConfigured(
            "Email delivery is temporarily unavailable. Please contact WriteX on WhatsApp."
          );
        }

        let acknowledgement: Awaited<ReturnType<typeof notifyContactAcknowledgement>> = {
          sent: false,
          reason: "not_attempted"
        };

        try {
          acknowledgement = await notifyContactAcknowledgement(contact);
        } catch {
          console.error("Contact acknowledgement failed", {
            code: "SMTP_ACKNOWLEDGEMENT_FAILED"
          });
        }

        console.info("Contact email delivery completed", {
          internalMessageId: "messageId" in internal ? internal.messageId : undefined,
          acknowledgementMessageId:
            "messageId" in acknowledgement ? acknowledgement.messageId : undefined
        });

        return {
          received: true,
          acknowledgementSent: acknowledgement.sent
        };
      }
    });

    return apiOk({ ...submission.value, duplicateSuppressed: submission.replayed });
  } catch (error) {
    return apiError(error);
  }
}
