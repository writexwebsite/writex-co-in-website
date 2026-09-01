import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { apiError, apiOk, badRequest, notConfigured } from "@/lib/api/response";
import { isHiringFeatureEnabled } from "@/lib/hiring/feature-flags";
import {
  createHiringApplication,
  hiringApplicationSchema,
  validateHiringFile
} from "@/lib/hiring/public-applications";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext,
  hashValue
} from "@/lib/security";
import { getSalesVideoPolicy } from "@/lib/hiring/video-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();
  try {
    assertSameOrigin(request);
    if (!isHiringFeatureEnabled("applications")) {
      throw notConfigured("WriteX Careers applications are not currently open.");
    }
    const context = getRequestContext(request);
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 200) {
      throw badRequest("The application request could not be validated. Please try again.");
    }
    assertRateLimit({
      key: `hiring-application:${hashValue(context.ipAddress)}`,
      limit: 5,
      windowSeconds: 60 * 60
    });
    const formData = await request.formData();
    let json: unknown;
    try {
      json = JSON.parse(String(formData.get("payload") || ""));
    } catch {
      throw badRequest("Check the application details and try again.");
    }
    const parsed = hiringApplicationSchema.safeParse(json);
    if (!parsed.success || parsed.data.website) {
      throw badRequest("Check the application details and try again.");
    }
    const cvValue = formData.get("cv");
    if (!(cvValue instanceof File) || !cvValue.size) {
      throw badRequest("Upload your CV to continue.");
    }
    const files = [validateHiringFile(cvValue, "cv")];
    const writingSample = formData.get("writingSample");
    if (writingSample instanceof File && writingSample.size) {
      files.push(validateHiringFile(writingSample, "writing_sample"));
    }
    const videoIntroduction = formData.get("videoIntroduction");
    if (parsed.data.role === "sales_executive") {
      const videoPolicy = await getSalesVideoPolicy();
      if (!(videoIntroduction instanceof File) || !videoIntroduction.size) {
        throw badRequest(`Record or upload your ${videoPolicy.targetMinSeconds}-${videoPolicy.targetMaxSeconds} second Sales video introduction to continue.`);
      }
      const durationSeconds = Number(formData.get("videoDurationSeconds"));
      const captureSource = String(formData.get("videoCaptureSource") || "") as "RECORDED" | "UPLOADED";
      files.push(validateHiringFile(videoIntroduction, "video_introduction", { durationSeconds, captureSource }, videoPolicy));
    }
    const result = await createHiringApplication({
      input: parsed.data,
      files,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      submissionKeyHash: hashValue(idempotencyKey),
      correlationId
    });
    const response = apiOk(
      { applicationReference: result.reference, status: "Application received" },
      { status: 201, headers: { "cache-control": "no-store" } }
    );
    response.headers.set("x-correlation-id", correlationId);
    return response;
  } catch (error) {
    const response = apiError(error);
    response.headers.set("x-correlation-id", correlationId);
    return response;
  }
}
