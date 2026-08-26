import type { NextRequest } from "next/server";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageWebsiteExperience } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  applyHolidayAdminAction,
  approveHolidayDetectedPalette,
  approveHolidayManualPalette,
  getHolidayPaletteSourceAsset,
  getHolidayExperienceSnapshot,
  resetHolidaySafePalette,
  saveHolidayDetectedPalette
} from "@/lib/holiday/repository";
import {
  extractHolidayPalette,
  safeNeutralExtractedPalette
} from "@/lib/holiday/palette";
import { getPrivateObjectBuffer } from "@/lib/storage/s3";
import {
  HOLIDAY_PREVIEW_COOKIE,
  HOLIDAY_PREVIEW_MAX_AGE_SECONDS
} from "@/lib/holiday/preview";
import { holidayAdminActionSchema } from "@/lib/holiday/validation";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext,
  parseJson
} from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestReference(request: NextRequest) {
  const supplied = request.headers.get("x-correlation-id")?.trim();
  return supplied && /^[a-zA-Z0-9_-]{8,80}$/.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

function apiErrorWithReference(error: unknown, referenceId: string) {
  console.error("Holiday website-experience request failed.", {
    referenceId,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage:
      error instanceof Error ? error.message : "Unknown request failure"
  });
  const response = apiError(error);
  response.headers.set("x-correlation-id", referenceId);
  response.headers.set("cache-control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const referenceId = requestReference(request);
  try {
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanManageWebsiteExperience(admin);
    return apiOk(await getHolidayExperienceSnapshot(), {
      headers: {
        "cache-control": "private, no-store",
        "x-correlation-id": referenceId
      }
    });
  } catch (error) {
    return apiErrorWithReference(error, referenceId);
  }
}

export async function POST(request: NextRequest) {
  const referenceId = requestReference(request);
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanManageWebsiteExperience(admin);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `holiday-admin:${admin.adminUserId}:${context.ipAddress}`,
      limit: 120,
      windowSeconds: 60 * 60
    });
    const action = await parseJson(request, holidayAdminActionSchema);

    if (action.action === "detect_palette") {
      const source = await getHolidayPaletteSourceAsset(action.themeId);
      if (!source) {
        throw badRequest(
          "Upload desktop, mobile or background login artwork before detecting a palette."
        );
      }
      let detectedPalette;
      let status: "pending_review" | "needs_review" = "pending_review";
      let message =
        "Detected from uploaded artwork. Preview and approve before activation.";
      try {
        const buffer = await getPrivateObjectBuffer(
          source.s3_key,
          5 * 1024 * 1024
        );
        detectedPalette = await extractHolidayPalette(buffer);
      } catch {
        detectedPalette = safeNeutralExtractedPalette();
        status = "needs_review";
        message =
          "Palette detection needs review. A safe WriteX-balanced palette is available.";
      }
      return apiOk(
        await saveHolidayDetectedPalette({
          themeId: action.themeId,
          sourceAssetId: source.id,
          detectedPalette,
          status,
          message,
          actorId: admin.adminUserId
        }),
        {
          headers: {
            "cache-control": "private, no-store",
            "x-correlation-id": referenceId
          }
        }
      );
    }

    if (action.action === "accept_detected_palette") {
      return apiOk(
        await approveHolidayDetectedPalette({
          themeId: action.themeId,
          matchMode: action.paletteMatchMode,
          actorId: admin.adminUserId
        }),
        {
          headers: {
            "cache-control": "private, no-store",
            "x-correlation-id": referenceId
          }
        }
      );
    }

    if (action.action === "approve_manual_palette") {
      return apiOk(
        await approveHolidayManualPalette({
          themeId: action.themeId,
          palette: action.palette,
          matchMode: action.paletteMatchMode,
          actorId: admin.adminUserId
        }),
        {
          headers: {
            "cache-control": "private, no-store",
            "x-correlation-id": referenceId
          }
        }
      );
    }

    if (action.action === "reset_safe_palette") {
      return apiOk(
        await resetHolidaySafePalette({
          themeId: action.themeId,
          actorId: admin.adminUserId
        }),
        {
          headers: {
            "cache-control": "private, no-store",
            "x-correlation-id": referenceId
          }
        }
      );
    }

    if (action.action === "preview") {
      await applyHolidayAdminAction(action, admin.adminUserId);
      const snapshot = await getHolidayExperienceSnapshot({
        previewThemeId: action.themeId,
        reconcile: false
      });
      if (!snapshot.activeTheme) {
        throw new Error("Preview theme is unavailable.");
      }
      const response = apiOk(
        {
          previewThemeId: action.themeId,
          previewThemeName: snapshot.activeTheme.name
        },
        { headers: { "x-correlation-id": referenceId } }
      );
      response.cookies.set(HOLIDAY_PREVIEW_COOKIE, action.themeId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: HOLIDAY_PREVIEW_MAX_AGE_SECONDS
      });
      return response;
    }

    if (action.action === "clear_preview") {
      await applyHolidayAdminAction(action, admin.adminUserId);
      const response = apiOk(
        { previewCleared: true },
        { headers: { "x-correlation-id": referenceId } }
      );
      response.cookies.set(HOLIDAY_PREVIEW_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0
      });
      return response;
    }

    return apiOk(await applyHolidayAdminAction(action, admin.adminUserId), {
      headers: {
        "cache-control": "private, no-store",
        "x-correlation-id": referenceId
      }
    });
  } catch (error) {
    return apiErrorWithReference(error, referenceId);
  }
}
