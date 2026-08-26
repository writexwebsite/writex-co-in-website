import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import {
  assertCanActivateWebsiteExperience,
  assertCanManageWebsiteExperience,
  assertCanViewWebsiteExperience,
  canActivateWebsiteExperience,
  canManageWebsiteExperience
} from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  activateFestivalPreviewSnapshot,
  activateFestivalStudioConfiguration,
  assignFestivalStudioAsset,
  createFestivalStudioPreviewSnapshot,
  dismissFestivalStudioSimplifiedNotice,
  endFestivalStudioConfiguration,
  fullResetFestivalStudio,
  getFestivalStudioPreviewTarget,
  getFestivalStudioSnapshot,
  restorePreviousFestivalStudioSlot,
  restorePreviousFestivalHero,
  restorePreviousPublicFestivalSnapshot,
  restoreDefaultFestivalStudio,
  saveFestivalStudioConfiguration,
  saveFestivalStudioScene
} from "@/lib/holiday/festival-studio-repository";
import { studioSchema } from "@/lib/holiday/validation";
import {
  FESTIVAL_HERO_SURFACES,
  FESTIVAL_PREVIEW_SNAPSHOT_COOKIE,
  FESTIVAL_STUDIO_SLOTS
} from "@/lib/holiday/festival-studio-types";
import {
  FESTIVAL_PACK_PREVIEW_COOKIE,
  FESTIVAL_PACK_PREVIEW_MAX_AGE_SECONDS
} from "@/lib/holiday/festival-pack-types";
import {
  HOLIDAY_PREVIEW_COOKIE,
  HOLIDAY_PREVIEW_MAX_AGE_SECONDS
} from "@/lib/holiday/preview";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext
} from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const nullableDate = z.union([z.iso.datetime(), z.null()]);
const payloadSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview"), configurationId: z.string().uuid() }),
  z.object({
    action: z.literal("save_scene"),
    configurationId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    studio: studioSchema
  }),
  z.object({
    action: z.literal("preview_exact"),
    configurationId: z.string().uuid(),
    selectedVariantPackId: z.string().uuid(),
    targetSurfaces: z.array(z.enum(FESTIVAL_HERO_SURFACES)).min(1).max(3)
  }),
  z.object({ action: z.literal("clear_preview") }),
  z.object({ action: z.literal("dismiss_simplified_notice") }),
  z.object({
    action: z.literal("activate_snapshot"),
    previewSnapshotId: z.string().uuid(),
    targetSurfaces: z.array(z.enum(FESTIVAL_HERO_SURFACES)).min(1).max(3),
    visualApprovalConfirmed: z.literal(true),
    religiousArtworkConfirmed: z.boolean()
  }),
  z.object({
    action: z.literal("restore_previous_hero"),
    surface: z.enum(FESTIVAL_HERO_SURFACES)
  }),
  z.object({
    action: z.literal("save"),
    configurationId: z.string().uuid(),
    selectedVariantPackId: z.string().uuid().nullable(),
    clientLoginEnabled: z.boolean(),
    employeeLoginEnabled: z.boolean(),
    websiteEnabled: z.boolean(),
    axoEnabled: z.boolean(),
    soundEnabled: z.boolean(),
    motionEnabled: z.boolean(),
    motionLevel: z.enum(["none", "subtle", "standard"]),
    protectedLoginBrand: z.object({
      placement: z.enum(["safe_auto", "upper_left", "compact_top"]),
      size: z.enum(["compact", "standard"]),
      lightContrast: z.enum(["soft_glass", "text_shadow"]),
      darkContrast: z.enum(["soft_glass", "text_shadow"])
    }),
    startAt: nullableDate,
    endAt: nullableDate,
    repeatYearly: z.boolean()
  }),
  z.object({
    action: z.literal("assign_asset"),
    configurationId: z.string().uuid(),
    slot: z.enum(FESTIVAL_STUDIO_SLOTS),
    assetId: z.string().uuid().nullable()
  }),
  z.object({
    action: z.literal("restore_previous_asset"),
    configurationId: z.string().uuid(),
    slot: z.enum(FESTIVAL_STUDIO_SLOTS)
  }),
  z.object({
    action: z.literal("activate"),
    configurationId: z.string().uuid(),
    visualApprovalConfirmed: z.literal(true),
    religiousArtworkConfirmed: z.boolean()
  }),
  z.object({
    action: z.literal("schedule"),
    configurationId: z.string().uuid(),
    visualApprovalConfirmed: z.literal(true),
    religiousArtworkConfirmed: z.boolean(),
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
    repeatYearly: z.boolean()
  }),
  z.object({ action: z.literal("end"), configurationId: z.string().uuid() }),
  z.object({ action: z.literal("restore_previous_public_snapshot") }),
  z.object({ action: z.literal("restore_default") }),
  z.object({ action: z.literal("full_reset") })
]);

function referenceId(request: NextRequest) {
  const supplied = request.headers.get("x-correlation-id")?.trim();
  return supplied && /^[a-zA-Z0-9_-]{8,80}$/.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

function databaseErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function publicFestivalStudioError(error: unknown) {
  if (error instanceof ApiError) return error;
  if (error instanceof z.ZodError) {
    return badRequest(
      "The festival scene contains an invalid saved value. Refresh the page or restore the recommended setup."
    );
  }
  const code = databaseErrorCode(error);
  if (code === "23503") {
    return badRequest(
      "An assigned festival asset is no longer available. Refresh the page and select an available asset."
    );
  }
  if (code === "23505") {
    return badRequest(
      "Another festival change completed first. Refresh the page before applying this selection."
    );
  }
  if (code === "40001" || code === "40P01") {
    return badRequest(
      "This festival changed while it was being applied. Refresh the page and try once more."
    );
  }
  if (code === "42804") {
    return badRequest(
      "The selected festival pack could not be applied to the activation record. Refresh the page and try again."
    );
  }
  return error;
}

function errorResponse(error: unknown, id: string, operation: string) {
  const safeError = publicFestivalStudioError(error);
  console.error("[festival-studio-request-failed]", {
    referenceId: id,
    operation,
    code: safeError instanceof ApiError ? safeError.code : databaseErrorCode(error) ?? "UNHANDLED",
    message: error instanceof Error ? error.message.slice(0, 300) : "Unknown error"
  });
  const response = apiError(safeError);
  response.headers.set("cache-control", "private, no-store");
  response.headers.set("x-correlation-id", id);
  return response;
}

async function snapshotFor(admin: ReturnType<typeof getAdminSessionFromRequest>) {
  const canEdit = canManageWebsiteExperience(admin);
  return getFestivalStudioSnapshot({
    canEdit,
    canActivate: canActivateWebsiteExperience(admin),
    readOnly: !canEdit,
    adminUserId: admin.adminUserId
  });
}

export async function GET(request: NextRequest) {
  const id = referenceId(request);
  try {
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanViewWebsiteExperience(admin);
    return apiOk(await snapshotFor(admin), {
      headers: { "cache-control": "private, no-store", "x-correlation-id": id }
    });
  } catch (error) {
    return errorResponse(error, id, "get_snapshot");
  }
}

export async function POST(request: NextRequest) {
  const id = referenceId(request);
  let operation = "parse_request";
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanViewWebsiteExperience(admin);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `festival-studio:${admin.adminUserId}:${context.ipAddress}`,
      limit: 180,
      windowSeconds: 60 * 60
    });
    const payload = payloadSchema.parse(await request.json());
    operation = payload.action;
    if (payload.action === "preview") {
      const preview = await getFestivalStudioPreviewTarget(payload.configurationId);
      const response = apiOk({ preview, snapshot: await snapshotFor(admin) });
      response.cookies.set(HOLIDAY_PREVIEW_COOKIE, preview.themeId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: HOLIDAY_PREVIEW_MAX_AGE_SECONDS
      });
      if (preview.packId) {
        response.cookies.set(FESTIVAL_PACK_PREVIEW_COOKIE, preview.packId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: FESTIVAL_PACK_PREVIEW_MAX_AGE_SECONDS
        });
      }
      return response;
    }
    if (payload.action === "preview_exact") {
      assertCanManageWebsiteExperience(admin);
      const preview = await createFestivalStudioPreviewSnapshot({
        ...payload,
        actorId: admin.adminUserId
      });
      const response = apiOk({ preview, snapshot: await snapshotFor(admin) });
      response.cookies.set(HOLIDAY_PREVIEW_COOKIE, preview.themeId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: HOLIDAY_PREVIEW_MAX_AGE_SECONDS
      });
      response.cookies.set(FESTIVAL_PACK_PREVIEW_COOKIE, preview.packId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: FESTIVAL_PACK_PREVIEW_MAX_AGE_SECONDS
      });
      response.cookies.set(FESTIVAL_PREVIEW_SNAPSHOT_COOKIE, preview.snapshotId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: FESTIVAL_PACK_PREVIEW_MAX_AGE_SECONDS
      });
      return response;
    }
    if (payload.action === "clear_preview") {
      const response = apiOk({ previewCleared: true });
      for (const cookie of [
        HOLIDAY_PREVIEW_COOKIE,
        FESTIVAL_PACK_PREVIEW_COOKIE,
        FESTIVAL_PREVIEW_SNAPSHOT_COOKIE
      ]) {
        response.cookies.set(cookie, "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 0
        });
      }
      return response;
    }
    if (payload.action === "dismiss_simplified_notice") {
      await dismissFestivalStudioSimplifiedNotice(admin.adminUserId);
      return apiOk({ snapshot: await snapshotFor(admin) }, { headers: { "cache-control": "private, no-store", "x-correlation-id": id } });
    }

    assertCanManageWebsiteExperience(admin);
    if (payload.action === "save") {
      await saveFestivalStudioConfiguration({ ...payload, actorId: admin.adminUserId });
    } else if (payload.action === "save_scene") {
      await saveFestivalStudioScene({ ...payload, actorId: admin.adminUserId });
    } else if (payload.action === "assign_asset") {
      await assignFestivalStudioAsset({ ...payload, actorId: admin.adminUserId });
    } else if (payload.action === "restore_previous_asset") {
      await restorePreviousFestivalStudioSlot({
        ...payload,
        actorId: admin.adminUserId
      });
    } else {
      assertCanActivateWebsiteExperience(admin);
      if (payload.action === "activate_snapshot") {
        await activateFestivalPreviewSnapshot({
          previewSnapshotId: payload.previewSnapshotId,
          targetSurfaces: payload.targetSurfaces,
          religiousArtworkConfirmed: payload.religiousArtworkConfirmed,
          actorId: admin.adminUserId
        });
      } else if (payload.action === "restore_previous_hero") {
        await restorePreviousFestivalHero({
          surface: payload.surface,
          actorId: admin.adminUserId
        });
      } else if (payload.action === "activate") {
        await activateFestivalStudioConfiguration({
          ...payload,
          actorId: admin.adminUserId,
          schedule: null
        });
      } else if (payload.action === "schedule") {
        await activateFestivalStudioConfiguration({
          configurationId: payload.configurationId,
          actorId: admin.adminUserId,
          visualApprovalConfirmed: payload.visualApprovalConfirmed,
          religiousArtworkConfirmed: payload.religiousArtworkConfirmed,
          schedule: {
            startAt: payload.startAt,
            endAt: payload.endAt,
            repeatYearly: payload.repeatYearly
          }
        });
      } else if (payload.action === "end") {
        await endFestivalStudioConfiguration({
          configurationId: payload.configurationId,
          actorId: admin.adminUserId
        });
      } else if (payload.action === "restore_previous_public_snapshot") {
        await restorePreviousPublicFestivalSnapshot(admin.adminUserId);
      } else if (payload.action === "restore_default") {
        await restoreDefaultFestivalStudio(admin.adminUserId);
      } else if (payload.action === "full_reset") {
        await fullResetFestivalStudio(admin.adminUserId);
      }
    }
    return apiOk({ snapshot: await snapshotFor(admin) }, {
      headers: { "cache-control": "private, no-store", "x-correlation-id": id }
    });
  } catch (error) {
    return errorResponse(error, id, operation);
  }
}
