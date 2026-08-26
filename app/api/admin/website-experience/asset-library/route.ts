import type { NextRequest } from "next/server";
import { ApiError, apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import {
  assertCanManageWebsiteExperience,
  assertCanViewWebsiteExperience
} from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  assignFestivalAsset,
  cancelFestivalAssetPermanentDeletion,
  copyFestivalLoginAssignments,
  finalizeFestivalAssetPermanentDeletion,
  getFestivalAssetLibrarySnapshot,
  prepareFestivalAssetPermanentDeletion,
  removeFestivalAssetAssignment,
  restoreFestivalAssetVersion,
  setFestivalAssetLifecycle
} from "@/lib/holiday/asset-governance";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";
import { deleteFile } from "@/lib/storage/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function referenceId(request: NextRequest) {
  const supplied = request.headers.get("x-correlation-id")?.trim();
  return supplied && /^[a-zA-Z0-9_-]{8,80}$/.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

function responseError(error: unknown, id: string) {
  const response = apiError(error);
  response.headers.set("x-correlation-id", id);
  response.headers.set("cache-control", "private, no-store");
  return response;
}

function textValue(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw badRequest(`${label} is required.`);
  }
  return value.trim();
}

export async function GET(request: NextRequest) {
  const id = referenceId(request);
  try {
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanViewWebsiteExperience(admin);
    return apiOk(
      { library: await getFestivalAssetLibrarySnapshot() },
      {
        headers: {
          "cache-control": "private, no-store",
          "x-correlation-id": id
        }
      }
    );
  } catch (error) {
    return responseError(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = referenceId(request);
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanManageWebsiteExperience(admin);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `festival-library:${admin.adminUserId}:${context.ipAddress}`,
      limit: 120,
      windowSeconds: 60 * 60
    });
    const payload = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const action = textValue(payload?.action, "Action");
    if (action === "assign") {
      const placements = Array.isArray(payload?.placements)
        ? payload.placements.filter(
            (value): value is string => typeof value === "string"
          )
        : [];
      await assignFestivalAsset({
        libraryAssetId: textValue(payload?.libraryAssetId, "Asset"),
        versionAssetId:
          typeof payload?.versionAssetId === "string"
            ? payload.versionAssetId
            : null,
        themeId: textValue(payload?.themeId, "Theme"),
        placements,
        actorId: admin.adminUserId
      });
    } else if (action === "remove_assignment") {
      await removeFestivalAssetAssignment({
        assignmentId: textValue(payload?.assignmentId, "Assignment"),
        actorId: admin.adminUserId,
        reason:
          typeof payload?.reason === "string"
            ? payload.reason.trim().slice(0, 240)
            : undefined
      });
    } else if (
      ["archive", "restore", "trash", "restore_trash"].includes(action)
    ) {
      await setFestivalAssetLifecycle({
        libraryAssetId: textValue(payload?.libraryAssetId, "Asset"),
        action: action as "archive" | "restore" | "trash" | "restore_trash",
        actorId: admin.adminUserId
      });
    } else if (action === "restore_version") {
      await restoreFestivalAssetVersion({
        libraryAssetId: textValue(payload?.libraryAssetId, "Asset"),
        versionAssetId: textValue(payload?.versionAssetId, "Version"),
        actorId: admin.adminUserId
      });
    } else if (action === "copy_login") {
      const direction = payload?.direction;
      if (
        direction !== "client_to_employee" &&
        direction !== "employee_to_client"
      ) {
        throw badRequest("Choose a supported login assignment direction.");
      }
      await copyFestivalLoginAssignments({
        themeId: textValue(payload?.themeId, "Theme"),
        direction,
        actorId: admin.adminUserId
      });
    } else {
      throw badRequest("The asset action is not supported.");
    }
    return apiOk(
      { library: await getFestivalAssetLibrarySnapshot() },
      {
        headers: {
          "cache-control": "private, no-store",
          "x-correlation-id": id
        }
      }
    );
  } catch (error) {
    return responseError(error, id);
  }
}

export async function DELETE(request: NextRequest) {
  const id = referenceId(request);
  let libraryAssetId = "";
  let adminUserId = "";
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanManageWebsiteExperience(admin);
    adminUserId = admin.adminUserId;
    const context = getRequestContext(request);
    assertRateLimit({
      key: `festival-library-delete:${admin.adminUserId}:${context.ipAddress}`,
      limit: 10,
      windowSeconds: 60 * 60
    });
    const payload = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    libraryAssetId = textValue(payload?.libraryAssetId, "Asset");
    if (payload?.confirmation !== "PERMANENTLY DELETE FESTIVAL ASSET") {
      throw badRequest("Enter the exact permanent deletion confirmation.");
    }
    const versions = await prepareFestivalAssetPermanentDeletion({
      libraryAssetId,
      actorId: admin.adminUserId,
      retentionOverride: payload?.retentionOverride === true
    });
    for (const version of versions) {
      await deleteFile(version.s3_key);
    }
    await finalizeFestivalAssetPermanentDeletion({
      libraryAssetId,
      actorId: admin.adminUserId
    });
    return apiOk(
      { library: await getFestivalAssetLibrarySnapshot() },
      {
        headers: {
          "cache-control": "private, no-store",
          "x-correlation-id": id
        }
      }
    );
  } catch (error) {
    if (libraryAssetId && adminUserId) {
      await cancelFestivalAssetPermanentDeletion({
        libraryAssetId,
        actorId: adminUserId
      }).catch(() => undefined);
    }
    return responseError(
      error instanceof ApiError
        ? error
        : new ApiError(
            503,
            "INTEGRATION_UNAVAILABLE",
            "Permanent deletion did not complete; the asset remains in Trash."
          ),
      id
    );
  }
}
