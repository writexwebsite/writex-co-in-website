import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageWebsiteExperience } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  activateFestivalPack,
  approveFestivalPack,
  archiveFestivalPack,
  getFestivalPackSnapshot,
  restorePreviousFestivalPack,
  updateFestivalPackMappings
} from "@/lib/holiday/festival-pack-repository";
import {
  FESTIVAL_PACK_MAPPING_LOCATIONS,
  FESTIVAL_PACK_PREVIEW_COOKIE,
  FESTIVAL_PACK_PREVIEW_MAX_AGE_SECONDS,
  FESTIVAL_PACK_RESPONSIVE_VARIANTS
} from "@/lib/holiday/festival-pack-types";
import { HOLIDAY_PREVIEW_COOKIE, HOLIDAY_PREVIEW_MAX_AGE_SECONDS } from "@/lib/holiday/preview";
import { applyHolidayAdminAction } from "@/lib/holiday/repository";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_mappings"),
    updates: z.array(z.object({
      fileId: z.string().uuid(),
      mappings: z.array(z.object({
        location: z.enum(FESTIVAL_PACK_MAPPING_LOCATIONS),
        variant: z.enum(FESTIVAL_PACK_RESPONSIVE_VARIANTS)
      })).max(20)
    })).min(1).max(500)
  }),
  z.object({ action: z.literal("preview") }),
  z.object({ action: z.literal("clear_preview") }),
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("activate"),
    targets: z.object({
      clientLoginEnabled: z.boolean(),
      employeeLoginEnabled: z.boolean()
    }).optional()
  }),
  z.object({
    action: z.literal("schedule"),
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
    repeatYearly: z.boolean().default(false),
    targets: z.object({
      clientLoginEnabled: z.boolean(),
      employeeLoginEnabled: z.boolean()
    }).optional()
  }),
  z.object({ action: z.literal("archive") }),
  z.object({ action: z.literal("restore_previous") }),
  z.object({ action: z.literal("restore_default") })
]);

function requestReference(request: NextRequest) {
  return request.headers.get("x-correlation-id")?.trim() || crypto.randomUUID();
}

function responseError(error: unknown, referenceId: string) {
  const response = apiError(error);
  response.headers.set("cache-control", "private, no-store");
  response.headers.set("x-correlation-id", referenceId);
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ packId: string }> }
) {
  const referenceId = requestReference(request);
  try {
    const { packId } = await params;
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanManageWebsiteExperience(admin);
    const snapshot = await getFestivalPackSnapshot();
    const pack = snapshot.packs.find((item) => item.id === packId);
    if (!pack) throw badRequest("Festival pack was not found.");
    return apiOk({ pack }, {
      headers: { "cache-control": "private, no-store", "x-correlation-id": referenceId }
    });
  } catch (error) {
    return responseError(error, referenceId);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ packId: string }> }
) {
  const referenceId = requestReference(request);
  try {
    assertSameOrigin(request);
    const { packId } = await params;
    if (!z.string().uuid().safeParse(packId).success) throw badRequest("Festival pack was not found.");
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanManageWebsiteExperience(admin);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `festival-pack-control:${admin.adminUserId}:${context.ipAddress}`,
      limit: 120,
      windowSeconds: 60 * 60
    });
    const payload = payloadSchema.parse(await request.json());
    let result;
    if (payload.action === "update_mappings") {
      result = await updateFestivalPackMappings({
        packId,
        updates: payload.updates,
        actorId: admin.adminUserId
      });
    } else if (payload.action === "approve") {
      result = await approveFestivalPack(packId, admin.adminUserId);
    } else if (payload.action === "activate") {
      result = await activateFestivalPack({
        packId,
        actorId: admin.adminUserId,
        targets: payload.targets || null
      });
    } else if (payload.action === "schedule") {
      result = await activateFestivalPack({
        packId,
        actorId: admin.adminUserId,
        schedule: {
          startAt: payload.startAt,
          endAt: payload.endAt,
          repeatYearly: payload.repeatYearly
        },
        targets: payload.targets || null
      });
    } else if (payload.action === "archive") {
      result = await archiveFestivalPack(packId, admin.adminUserId);
    } else if (payload.action === "restore_previous") {
      result = await restorePreviousFestivalPack(packId, admin.adminUserId);
    } else if (payload.action === "restore_default") {
      result = await applyHolidayAdminAction(
        { action: "restore_default" },
        admin.adminUserId
      );
    } else {
      const snapshot = await getFestivalPackSnapshot();
      const pack = snapshot.packs.find((item) => item.id === packId);
      if (!pack) throw badRequest("Festival pack was not found.");
      result = {
        previewPackId: payload.action === "preview" ? packId : null,
        previewThemeId: payload.action === "preview" ? pack.themeId : null
      };
    }
    const response = apiOk(result, {
      headers: { "cache-control": "private, no-store", "x-correlation-id": referenceId }
    });
    if (payload.action === "preview") {
      const snapshot = await getFestivalPackSnapshot();
      const pack = snapshot.packs.find((item) => item.id === packId);
      if (!pack) throw badRequest("Festival pack was not found.");
      response.cookies.set(HOLIDAY_PREVIEW_COOKIE, pack.themeId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: HOLIDAY_PREVIEW_MAX_AGE_SECONDS
      });
      response.cookies.set(FESTIVAL_PACK_PREVIEW_COOKIE, packId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: FESTIVAL_PACK_PREVIEW_MAX_AGE_SECONDS
      });
    }
    if (payload.action === "clear_preview" || payload.action === "restore_default") {
      for (const cookie of [HOLIDAY_PREVIEW_COOKIE, FESTIVAL_PACK_PREVIEW_COOKIE]) {
        response.cookies.set(cookie, "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 0
        });
      }
    }
    return response;
  } catch (error) {
    return responseError(error, referenceId);
  }
}
