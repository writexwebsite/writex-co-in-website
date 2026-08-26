import type { NextRequest } from "next/server";
import { apiOk } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { HOLIDAY_PREVIEW_COOKIE } from "@/lib/holiday/preview";
import { toPublicHolidayExperience } from "@/lib/holiday/public";
import { getResolvedHolidayTheme } from "@/lib/holiday/repository";
import { normalizeHolidayRoute } from "@/lib/holiday/resolver";
import { FESTIVAL_PACK_PREVIEW_COOKIE } from "@/lib/holiday/festival-pack-types";
import { getFestivalPackPreviewContext } from "@/lib/holiday/festival-pack-repository";
import { canViewWebsiteExperience } from "@/lib/admin/permissions";
import {
  applyPublicFestivalActivationSnapshot,
  getPublicFestivalActivationSnapshot,
  getPublicFestivalPreviewSnapshot
} from "@/lib/holiday/active-festival-snapshot";
import { FESTIVAL_PREVIEW_SNAPSHOT_COOKIE } from "@/lib/holiday/festival-studio-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const route = normalizeHolidayRoute(
    request.nextUrl.searchParams.get("route") || "/"
  );
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

  try {
    const canonicalFestivalSnapshot = previewSnapshotId
      ? await getPublicFestivalPreviewSnapshot(previewSnapshotId)
      : previewThemeId
        ? null
        : await getPublicFestivalActivationSnapshot();
    const resolvedSnapshotThemeId =
      canonicalFestivalSnapshot?.themeId || previewThemeId;
    const snapshot = await getResolvedHolidayTheme({
      previewThemeId: resolvedSnapshotThemeId,
      reconcile: !resolvedSnapshotThemeId,
      route
    });
    const publicTheme = canonicalFestivalSnapshot
      ? applyPublicFestivalActivationSnapshot(
          snapshot.activeTheme,
          canonicalFestivalSnapshot
        )
      : previewThemeId
        ? snapshot.activeTheme
        : null;
    const previewSurface =
      route === "/client-login"
        ? "clientLoginHero"
        : route === "/employee-login" || route === "/admin/login"
          ? "employeeLoginHero"
          : "websiteHero";
    const previewVariant = canonicalFestivalSnapshot?.surfaceState[previewSurface];
    return apiOk(
      {
        experience: toPublicHolidayExperience({
          theme: publicTheme,
          route,
          preview: Boolean(previewThemeId || previewSnapshotId),
          previewSnapshotId,
          previewPackId,
          canonicalActivation: Boolean(canonicalFestivalSnapshot),
          exactSnapshotAssets:
            previewSnapshotId && canonicalFestivalSnapshot
              ? canonicalFestivalSnapshot.surfaceAssets
              : {},
          previewIdentity:
            previewSnapshotId && canonicalFestivalSnapshot && previewVariant
              ? {
                  festivalSlug: canonicalFestivalSnapshot.festivalSlug,
                  festivalName: canonicalFestivalSnapshot.festivalName,
                  variantPackId: previewVariant.packId,
                  variantSlug: previewVariant.variantSlug,
                  variantName: previewVariant.variantName,
                  variantVersion: previewVariant.variantVersion
                }
              : null,
          loginControl:
            snapshot.loginControls.find((control) => {
              if (route === "/client-login") return control.channel === "client";
              if (route === "/employee-login")
                return control.channel === "employee";
              if (route === "/admin/login") return control.channel === "admin";
              return false;
            }) || null
        })
      },
      {
        headers: {
          "cache-control": "private, no-store",
          "x-robots-tag": "noindex, nofollow"
        }
      }
    );
  } catch {
    return apiOk(
      { experience: null, fallback: true },
      {
        headers: {
          "cache-control": "private, no-store",
          "x-robots-tag": "noindex, nofollow"
        }
      }
    );
  }
}
