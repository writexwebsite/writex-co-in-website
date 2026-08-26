import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { HOLIDAY_PREVIEW_COOKIE } from "@/lib/holiday/preview";
import { FESTIVAL_PACK_PREVIEW_COOKIE } from "@/lib/holiday/festival-pack-types";
import { getFestivalPackPreviewContext } from "@/lib/holiday/festival-pack-repository";
import {
  getHolidayAssetRecord,
  getResolvedHolidayTheme
} from "@/lib/holiday/repository";
import { resolveHolidayPlaybackRange } from "@/lib/holiday/playback";
import { getPrivateObjectBuffer } from "@/lib/storage/s3";
import {
  placementPublicRole,
  type FestivalAssetPlacement
} from "@/lib/holiday/asset-governance-types";
import {
  LOGIN_HERO_VARIANTS,
  loginHeroVariantFromRequest,
  resolveLoginHeroCrop,
  safeLoginHeroOutputWidth
} from "@/lib/holiday/login-hero";
import { canViewWebsiteExperience } from "@/lib/admin/permissions";
import {
  getPublicFestivalActivationSnapshot,
  getPublicFestivalPreviewSnapshot
} from "@/lib/holiday/active-festival-snapshot";
import { FESTIVAL_PREVIEW_SNAPSHOT_COOKIE } from "@/lib/holiday/festival-studio-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const asset = await getHolidayAssetRecord(assetId);
    if (
      !asset ||
      !["active", "staged", "replaced"].includes(asset.status) ||
      ["trash", "deletion_pending", "deleted"].includes(
        asset.lifecycle_state || ""
      )
    ) {
      return new NextResponse(null, { status: 404 });
    }

    let previewThemeId: string | null = null;
    let previewPackId: string | null = null;
    let previewSnapshotId: string | null = null;
    const requestedPreviewSnapshotId = request.nextUrl.searchParams.get(
      "festivalPreviewSnapshot"
    );
    const requestedPreviewPackId = request.nextUrl.searchParams.get(
      "festivalPackPreview"
    );
    const previewCookie = request.cookies.get(HOLIDAY_PREVIEW_COOKIE)?.value;
    if (previewCookie || requestedPreviewPackId || requestedPreviewSnapshotId) {
      try {
        const admin = getAdminSessionFromRequest(request);
        if (canViewWebsiteExperience(admin)) {
          const requestedPack = requestedPreviewPackId
            ? await getFestivalPackPreviewContext(requestedPreviewPackId)
            : null;
          previewThemeId = requestedPack?.themeId || previewCookie || null;
          previewPackId =
            requestedPack?.id ||
            request.cookies.get(FESTIVAL_PACK_PREVIEW_COOKIE)?.value ||
            null;
          previewSnapshotId =
            requestedPreviewSnapshotId ||
            request.cookies.get(FESTIVAL_PREVIEW_SNAPSHOT_COOKIE)?.value ||
            null;
        }
      } catch {
        previewThemeId = null;
      }
    }
    const assetPackId =
      typeof asset.asset_metadata?.festivalPackId === "string"
        ? asset.asset_metadata.festivalPackId
        : null;
    const exactPrivatePackPreview = Boolean(
      previewThemeId && previewPackId && assetPackId === previewPackId
    );
    if (
      (asset.library_approval_state || "approved") !== "approved" &&
      !exactPrivatePackPreview
    ) {
      return new NextResponse(null, { status: 404 });
    }
    const route = request.nextUrl.searchParams.get("route") || "/";
    const activePublicAssignments = asset.placements.filter(
      (assignment) =>
        assignment.state === "active" &&
        Boolean(
          placementPublicRole({
            placement: assignment.placement as FestivalAssetPlacement,
            route
          })
        )
    );
    const previewSnapshot = previewSnapshotId
      ? await getPublicFestivalPreviewSnapshot(previewSnapshotId)
      : null;
    const publicActivationSnapshot =
      !previewThemeId && !previewSnapshotId
        ? await getPublicFestivalActivationSnapshot()
        : null;
    const canonicalSnapshot = previewSnapshot || publicActivationSnapshot;
    const routeSurface =
      route === "/client-login"
        ? "clientLoginHero"
        : route === "/employee-login" || route === "/admin/login"
          ? "employeeLoginHero"
          : "websiteHero";
    const exactSurfaceAssignment = Boolean(
      canonicalSnapshot?.surfaceAssets[routeSurface]?.some(
        (entry) => entry.assetId === asset.id
      )
    );
    const exactPublicAssignment = Boolean(
      publicActivationSnapshot && exactSurfaceAssignment
    );
    if (
      !previewThemeId &&
      (asset.review_status !== "approved" ||
        (!exactPublicAssignment && activePublicAssignments.length === 0))
    ) {
      return new NextResponse(null, { status: 404 });
    }

    const resolvedPreviewThemeId = canonicalSnapshot?.themeId || previewThemeId;
    const snapshot = await getResolvedHolidayTheme({
      previewThemeId: resolvedPreviewThemeId,
      reconcile: false,
      route
    });
    const exactPreviewAssignment = Boolean(
      previewSnapshot &&
        (exactSurfaceAssignment ||
          previewSnapshot.sceneConfiguration.motifAssignments.some(
            (assignment) =>
              assignment.enabled &&
              assignment.assetVersionId === asset.id &&
              assignment.libraryAssetId === asset.library_asset_id
          ))
    );
    const resolvedThemeId = snapshot.activeTheme?.id;
    const selectedPackId =
      previewSnapshot?.variantPackId ||
      publicActivationSnapshot?.surfaceState[routeSurface]?.packId ||
      canonicalSnapshot?.variantPackId ||
      previewPackId ||
      snapshot.activeTheme?.activeFestivalPackId ||
      null;
    if (
      !resolvedThemeId ||
      (assetPackId && assetPackId !== selectedPackId) ||
      (resolvedThemeId !== asset.theme_id &&
        !exactPreviewAssignment &&
        !asset.placements.some(
          (assignment) =>
            assignment.state === "active" &&
            assignment.themeId === resolvedThemeId
        ))
    ) {
      return new NextResponse(null, { status: 404 });
    }
    if (
      !previewThemeId &&
      !exactPublicAssignment &&
      !activePublicAssignments.some(
        (assignment) => assignment.themeId === resolvedThemeId
      )
    ) {
      return new NextResponse(null, { status: 404 });
    }
    let buffer: Uint8Array = await getPrivateObjectBuffer(
      asset.s3_key,
      45 * 1024 * 1024
    );
    const isAudio = asset.asset_role === "audio";
    let responseMimeType = asset.mime_type;
    let responseFileName = asset.safe_file_name;
    const loginVariant = loginHeroVariantFromRequest(
      request.nextUrl.searchParams.get("loginVariant")
    );
    const loginControl =
      route === "/client-login"
        ? snapshot.loginControls.find((control) => control.channel === "client")
        : route === "/employee-login"
          ? snapshot.loginControls.find(
              (control) => control.channel === "employee"
            )
          : route === "/admin/login"
            ? snapshot.loginControls.find((control) => control.channel === "admin")
            : null;
    const canRenderLoginDerivative =
      Boolean(loginVariant && loginControl) &&
      ["login_desktop", "login_mobile", "login_background", "mobile_fallback", "reduced_motion"].includes(
        asset.asset_role
      ) &&
      asset.mime_type.startsWith("image/");

    if (loginVariant && loginControl && canRenderLoginDerivative) {
      const image = sharp(buffer, { limitInputPixels: false });
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height) {
        return new NextResponse(null, { status: 422 });
      }
      const outputWidth = safeLoginHeroOutputWidth(
        request.nextUrl.searchParams.get("width"),
        loginVariant
      );
      const variant = LOGIN_HERO_VARIANTS[loginVariant];
      const outputHeight = Math.max(1, Math.round(outputWidth / variant.ratio));
      const crop = resolveLoginHeroCrop({
        config: loginControl.compositionConfig,
        breakpoint: loginVariant,
        sourceWidth: metadata.width,
        sourceHeight: metadata.height
      });

      if (crop.fit === "contain") {
        buffer = await image
          .resize(outputWidth, outputHeight, {
            fit: "contain",
            background:
              snapshot.activeTheme?.palette.backgroundTint || "#f7f3ff",
            withoutEnlargement: false
          })
          .webp({ quality: 88, smartSubsample: true })
          .toBuffer();
      } else {
        const left = Math.max(0, Math.floor(crop.source.left));
        const top = Math.max(0, Math.floor(crop.source.top));
        const width = Math.max(
          1,
          Math.min(metadata.width - left, Math.round(crop.source.width))
        );
        const height = Math.max(
          1,
          Math.min(metadata.height - top, Math.round(crop.source.height))
        );
        buffer = await image
          .extract({ left, top, width, height })
          .resize(outputWidth, outputHeight, {
            fit: "cover",
            position: "centre",
            withoutEnlargement: false
          })
          .webp({ quality: 88, smartSubsample: true })
          .toBuffer();
      }
      responseMimeType = "image/webp";
      responseFileName = `login-${loginVariant}-${outputWidth}.webp`;
    }
    const range = isAudio
      ? resolveHolidayPlaybackRange(
          request.headers.get("range"),
          buffer.byteLength
        )
      : {
          start: 0,
          end: buffer.byteLength - 1,
          partial: false
        };
    if (!range) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "content-range": `bytes */${buffer.byteLength}`,
          "cache-control": "private, no-store"
        }
      });
    }
    const body = buffer.subarray(range.start, range.end + 1);
    return new NextResponse(new Uint8Array(body), {
      status: range.partial ? 206 : 200,
      headers: {
        "content-type": responseMimeType,
        "content-length": String(body.byteLength),
        "content-disposition": `inline; filename="${responseFileName}"`,
        ...(isAudio
          ? {
              "accept-ranges": "bytes",
              ...(range.partial
                ? {
                    "content-range": `bytes ${range.start}-${range.end}/${buffer.byteLength}`
                  }
                : {})
            }
          : {}),
        "cache-control": "private, max-age=300",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox"
      }
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
