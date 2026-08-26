import "server-only";

import { themeAppliesToRoute } from "./resolver";
import type {
  HolidayAssetRole,
  HolidayLoginControl,
  HolidayTheme,
  PublicHolidayExperience
} from "./types";
import {
  HOLIDAY_EXPERIENCE_LEVELS,
  HOLIDAY_PALETTE_MATCH_MODES,
  HOLIDAY_THEME_CATEGORIES
} from "./types";
import { isValidHolidayPalette } from "./validation";
import {
  placementPublicRole,
  type FestivalAssetPlacement
} from "./asset-governance-types";
import {
  defaultHolidayLoginComposition,
  festivalPackFullCanvasComposition,
  resolveHolidayLoginComposition,
  withThemePalette
} from "./login-theme";
import type { PublicFestivalActivationSnapshot } from "./active-festival-snapshot";

function isSafePublicTheme(theme: HolidayTheme, preview: boolean) {
  return (
    theme.name.trim().length >= 2 &&
    HOLIDAY_THEME_CATEGORIES.includes(
      theme.festivalType as (typeof HOLIDAY_THEME_CATEGORIES)[number]
    ) &&
    HOLIDAY_EXPERIENCE_LEVELS.includes(theme.experienceLevel) &&
    HOLIDAY_PALETTE_MATCH_MODES.includes(theme.paletteMatchMode) &&
    (preview || theme.experienceConfig.approvalStatus === "approved") &&
    (preview ||
      !["pending_review", "needs_review", "failed"].includes(
        theme.paletteDetectionStatus
      )) &&
    isValidHolidayPalette(theme.palette)
  );
}

export function toPublicHolidayExperience({
  theme,
  route,
  preview,
  previewSnapshotId = null,
  previewPackId = null,
  loginControl = null,
  canonicalActivation = false,
  exactSnapshotAssets = {},
  previewIdentity = null
}: {
  theme: HolidayTheme | null;
  route: string;
  preview: boolean;
  previewSnapshotId?: string | null;
  previewPackId?: string | null;
  loginControl?: HolidayLoginControl | null;
  canonicalActivation?: boolean;
  exactSnapshotAssets?: PublicFestivalActivationSnapshot["surfaceAssets"];
  previewIdentity?: PublicHolidayExperience["previewIdentity"];
}): PublicHolidayExperience | null {
  if (
    !theme ||
    theme.slug === "default" ||
    !isSafePublicTheme(theme, preview) ||
    (route === "/admin/login" && !theme.applyToAdminLogin) ||
    (!preview && !themeAppliesToRoute(theme, route))
  ) {
    return null;
  }

  const loginAssetRoles = new Set<HolidayAssetRole>([
    "login_desktop",
    "login_mobile",
    "login_background",
    "decorative_overlay",
    "logo_overlay",
    "axo"
  ]);
  const isLoginPreview = [
    "/client-login",
    "/employee-login",
    "/admin/login"
  ].includes(route);
  const assets: Partial<Record<HolidayAssetRole, string>> = {};
  const ornamentAssets: Record<string, string> = {};
  const configuredLoginPackId =
    loginControl?.compositionConfig?.source?.packId?.startsWith("festival-pack:")
      ? loginControl.compositionConfig.source.packId.slice("festival-pack:".length)
      : null;
  const loginSurfacePackId =
    route === "/client-login"
      ? theme.activeSurfacePackIds?.clientLoginHero || configuredLoginPackId
      : route === "/employee-login"
        ? theme.activeSurfacePackIds?.employeeLoginHero || configuredLoginPackId
        : configuredLoginPackId;
  const selectedPackId =
    previewPackId ||
    (isLoginPreview ? loginSurfacePackId : theme.activeSurfacePackIds?.websiteHero) ||
    theme.activeFestivalPackId ||
    null;
  const designerPackUrls = new Map<string, string>();
  const exactSurfaceAssets = previewSnapshotId
    ? route === "/client-login"
      ? exactSnapshotAssets.clientLoginHero || []
      : route === "/employee-login"
        ? exactSnapshotAssets.employeeLoginHero || []
        : route === "/admin/login"
          ? exactSnapshotAssets.employeeLoginHero || []
          : exactSnapshotAssets.websiteHero || []
    : [];
  for (const asset of exactSurfaceAssets) {
    if (!asset.assetId || !asset.packAssetKey) continue;
    designerPackUrls.set(
      asset.packAssetKey,
      `/api/website-experience/assets/${encodeURIComponent(asset.assetId)}` +
        `?route=${encodeURIComponent(route)}` +
        `&festivalPreviewSnapshot=${encodeURIComponent(previewSnapshotId as string)}`
    );
  }
  const allowedOrnamentVariants = new Set(
    theme.experienceConfig.headerOrnaments.items
      .map((item) => item.assetVariant)
      .filter((variant): variant is string => Boolean(variant))
  );
  const orderedAssets = [...theme.assets].sort((left, right) => {
    if (left.role !== "audio" || right.role !== "audio") return 0;
    const priority = (variant: string) =>
      variant === "primary" ? 0 : variant === "default" ? 1 : 2;
    return priority(left.variant) - priority(right.variant);
  });
  const packIdForRole = (role: HolidayAssetRole) => {
    if (loginAssetRoles.has(role) && isLoginPreview) return selectedPackId;
    if (role === "hero_art") {
      return theme.activeSurfacePackIds?.websiteHero || theme.activeFestivalPackId || null;
    }
    if (role === "homepage_background" || role === "decorative_overlay") {
      return theme.activeSurfacePackIds?.background || theme.activeFestivalPackId || null;
    }
    if (role === "header") {
      return theme.activeSurfacePackIds?.header || theme.activeFestivalPackId || null;
    }
    if (role === "axo" || role === "axo_animation") {
      return theme.activeSurfacePackIds?.axo || theme.activeFestivalPackId || null;
    }
    if (role === "audio") {
      return theme.activeSurfacePackIds?.sound || theme.activeFestivalPackId || null;
    }
    return theme.activeFestivalPackId || null;
  };
  for (const asset of orderedAssets) {
    const assetPackId =
      typeof asset.assetMetadata?.festivalPackId === "string"
        ? asset.assetMetadata.festivalPackId
        : null;
    const mappedRoles = asset.libraryAssetId
      ? [
          ...new Set(
            (asset.placements || [])
              .map((placement) =>
                placementPublicRole({
                  placement: placement as FestivalAssetPlacement,
                  route
                })
              )
              .filter((role): role is HolidayAssetRole => Boolean(role))
          )
        ]
      : [asset.role];
    const canonicalLegacyDecoration = canonicalActivation && mappedRoles.some(
      (role) => [
        "hero_art",
        "homepage_background",
        "decorative_overlay",
        "particle_overlay",
        "inner_page",
        "header",
        "footer",
        "announcement",
        "supporting",
        "axo",
        "axo_animation",
        "audio"
      ].includes(role)
    );
    if (assetPackId) {
      const expectedPackIds = mappedRoles
        .map(packIdForRole)
        .filter((value): value is string => Boolean(value));
      if (
        expectedPackIds.length > 0 &&
        !expectedPackIds.includes(assetPackId)
      ) {
        continue;
      }
    }
    const isPrivateReference =
      mappedRoles.length === 0 ||
      (asset.role === "reference_image" && !asset.libraryAssetId);
    const isInterpretedLegacyReference =
      asset.role === "hero_art" &&
      theme.experienceConfig.interpretation.sourceMode === "reference_image" &&
      theme.experienceConfig.interpretation.publicArtworkMode ===
        "interpreted_motifs";
    const exactPrivatePackPreview = Boolean(
      preview && previewPackId && assetPackId === previewPackId
    );
    if (
      !canonicalLegacyDecoration &&
      !isPrivateReference &&
      !isInterpretedLegacyReference &&
      (asset.lifecycleState !== "trash" &&
        asset.lifecycleState !== "deletion_pending" &&
        asset.lifecycleState !== "deleted") &&
      ((asset.libraryApprovalState || "approved") === "approved" ||
        exactPrivatePackPreview) &&
      (asset.status === "active" ||
        asset.status === "replaced" ||
        (preview && asset.status === "staged")) &&
      (asset.reviewStatus === "approved" || preview) &&
      (preview ||
        ["approved", "approved_with_size_restrictions"].includes(
          asset.qualityStatus
        )) &&
      mappedRoles.some(
        (role) =>
          (theme.experienceLevel !== "accent_only" ||
            role === "header" ||
            (isLoginPreview && loginAssetRoles.has(role))) &&
          (role !== "axo" || theme.applyAxoTheme) &&
          (role !== "audio" ||
            (theme.experienceConfig.sound.available &&
              theme.experienceConfig.sound.enabled &&
              theme.experienceConfig.sound.culturallyReviewed))
      )
    ) {
      const publicAssetUrl =
        `/api/website-experience/assets/${asset.id}?route=${encodeURIComponent(route)}` +
        (previewSnapshotId
          ? `&festivalPreviewSnapshot=${encodeURIComponent(previewSnapshotId)}`
          : previewPackId
            ? `&festivalPackPreview=${encodeURIComponent(previewPackId)}`
          : "");
      if (
        selectedPackId &&
        asset.assetMetadata?.festivalPackId === selectedPackId &&
        typeof asset.assetMetadata?.packAssetKey === "string"
      ) {
        designerPackUrls.set(asset.assetMetadata.packAssetKey, publicAssetUrl);
      }
      for (const mappedRole of mappedRoles) {
        if (!assets[mappedRole]) assets[mappedRole] = publicAssetUrl;
        if (
          mappedRole === "header" &&
          allowedOrnamentVariants.has(asset.variant)
        ) {
          ornamentAssets[asset.variant] = publicAssetUrl;
        }
      }
    }
  }

  const isLoginRoute = [
    "/client-login",
    "/employee-login",
    "/admin/login"
  ].includes(route);
  let loginComposition = isLoginRoute
    ? withThemePalette(
        resolveHolidayLoginComposition(
          loginControl?.compositionConfig || defaultHolidayLoginComposition()
        ),
        theme
      )
    : null;
  const designerPackAssets = selectedPackId
    ? {
        packId: selectedPackId,
        backgroundFourThree:
          designerPackUrls.get("background_four_three") ||
          designerPackUrls.get("background_wide") ||
          designerPackUrls.get("hero_desktop") ||
          "",
        backgroundWide:
          designerPackUrls.get("background_wide") ||
          designerPackUrls.get("background_four_three") ||
          designerPackUrls.get("hero_desktop") ||
          "",
        backgroundUltrawide:
          designerPackUrls.get("background_ultrawide") ||
          designerPackUrls.get("background_wide") ||
          designerPackUrls.get("hero_desktop") ||
          "",
        heroDesktop: designerPackUrls.get("hero_desktop") || null,
        heroTablet:
          designerPackUrls.get("hero_tablet") ||
          designerPackUrls.get("hero_desktop") ||
          null,
        heroMobile:
          designerPackUrls.get("hero_mobile") ||
          designerPackUrls.get("hero_tablet") ||
          designerPackUrls.get("hero_desktop") ||
          null,
        logo: designerPackUrls.get("logo") || null,
        activationReady: Boolean(
          designerPackUrls.get("background_wide") ||
            designerPackUrls.get("background_four_three") ||
            designerPackUrls.get("hero_desktop")
        )
      }
    : undefined;

  if (
    isLoginRoute &&
    selectedPackId &&
    designerPackAssets?.activationReady &&
    (Boolean(previewPackId) || loginSurfacePackId === selectedPackId)
  ) {
    loginComposition = withThemePalette(
      festivalPackFullCanvasComposition(selectedPackId),
      theme
    );
  }

  return {
    theme: {
      id: theme.id,
      slug: theme.slug,
      name: theme.name,
      festivalType: theme.festivalType,
      scope: theme.scope,
      selectedRoutes: theme.selectedRoutes,
      applyToHeader: theme.applyToHeader,
      applyToFooter: theme.applyToFooter,
      applyToHomepage: theme.applyToHomepage,
      applyToLoginScreens: theme.applyToLoginScreens,
      applyToClientLogin: theme.applyToClientLogin,
      applyToEmployeeLogin: theme.applyToEmployeeLogin,
      applyToAdminLogin: theme.applyToAdminLogin,
      applyMatchingWebsitePalette: theme.applyMatchingWebsitePalette,
      applyAxoTheme: theme.applyAxoTheme,
      applyToSelectedRoutes: theme.applyToSelectedRoutes,
      palette: theme.palette,
      paletteMatchMode: theme.paletteMatchMode,
      experienceLevel: theme.experienceLevel,
      animationLevel: theme.animationLevel,
      experienceConfig: theme.experienceConfig,
      assetAvailability: theme.assetAvailability,
      announcementBarEnabled: theme.announcementBarEnabled,
      announcementBarText: theme.announcementBarText,
      announcementBarCtaLabel: theme.announcementBarCtaLabel,
      announcementBarCtaHref: theme.announcementBarCtaHref,
      motif: theme.motif,
      axoAccessory: theme.axoAccessory,
      assets,
      ornamentAssets
      ,designerPackAssets
    },
    loginComposition,
    preview,
    previewSnapshotId,
    previewIdentity,
    resolvedAt: new Date().toISOString()
  };
}
