"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useHolidayExperience } from "@/components/holiday/HolidayExperienceProvider";
import {
  findDesignerLoginPack,
  type DesignerLoginPack
} from "@/lib/holiday/designer-login-packs";

const localIndependenceDayPreview =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEV_FESTIVAL_PREVIEW === "independence-day";

const localPreviewAssets = {
  fullSceneTwentyOneNine:
    "/designer-login-packs/independence-day-v2/background-full-scene-21x9-v3.webp",
  fullSceneUltrawide:
    "/designer-login-packs/independence-day-v2/background-full-scene-ultrawide-v3.webp",
  fullSceneWide:
    "/designer-login-packs/independence-day-v2/background-full-scene-wide-v3.webp",
  fullSceneSixteenTen:
    "/designer-login-packs/independence-day-v2/background-full-scene-16x10-v3.webp",
  fourThree:
    "/designer-login-packs/independence-day-v2/background-4x3-8k.webp",
  wide: "/designer-login-packs/independence-day-v2/background-wide-8k.webp",
  ultrawide:
    "/designer-login-packs/independence-day-v2/background-ultrawide-8k.webp"
};

type ResponsiveDesignerPackAssets = NonNullable<
  NonNullable<
    ReturnType<typeof useHolidayExperience>["experience"]
  >["theme"]["designerPackAssets"]
>;

type FestivalCanvasSources = {
  twentyOneNine: string;
  fourThree: string;
  standard: string;
  wide: string;
  ultrawide: string;
  tablet: string;
  mobile: string;
};

function resolveFestivalCanvasSources(
  pack: DesignerLoginPack,
  responsiveAssets: ResponsiveDesignerPackAssets | undefined
): FestivalCanvasSources {
  const fourThree =
    responsiveAssets?.backgroundFourThree || pack.assets.backgroundFourThree;
  const wide = responsiveAssets?.backgroundWide || pack.assets.backgroundWide;
  const ultrawide =
    responsiveAssets?.backgroundUltrawide || pack.assets.backgroundUltrawide;

  if (pack.festivalSlug === "independence-day") {
    return {
      twentyOneNine: localPreviewAssets.fullSceneTwentyOneNine,
      fourThree: localPreviewAssets.fourThree,
      standard: localPreviewAssets.fullSceneSixteenTen,
      wide: localPreviewAssets.fullSceneWide,
      ultrawide: localPreviewAssets.fullSceneUltrawide,
      tablet: localPreviewAssets.fourThree,
      mobile: localPreviewAssets.fourThree
    };
  }

  return {
    twentyOneNine: ultrawide,
    fourThree,
    standard: wide,
    wide,
    ultrawide,
    tablet: fourThree,
    mobile: fourThree
  };
}

function FestivalCanvas({ sources }: { sources: FestivalCanvasSources }) {
  return (
    <picture className="wx-festival-login-canvas absolute inset-0 block h-full w-full">
      <source media="(max-width: 767px)" srcSet={sources.mobile} />
      <source media="(max-width: 1199px)" srcSet={sources.tablet} />
      <source
        media="(min-width: 1200px) and (min-aspect-ratio: 7/3)"
        srcSet={sources.twentyOneNine}
      />
      <source
        media="(min-width: 1200px) and (min-aspect-ratio: 2/1)"
        srcSet={sources.ultrawide}
      />
      <source
        media="(min-width: 1200px) and (min-aspect-ratio: 17/10)"
        srcSet={sources.wide}
      />
      <source
        media="(min-width: 1200px) and (min-aspect-ratio: 3/2)"
        srcSet={sources.standard}
      />
      <source media="(min-width: 1200px)" srcSet={sources.fourThree} />
      <img
        src={sources.fourThree}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
    </picture>
  );
}

function packAppliesToCurrentLogin(
  pathname: string,
  theme: NonNullable<
    ReturnType<typeof useHolidayExperience>["experience"]
  >["theme"]
) {
  if (pathname === "/client-login") return theme.applyToClientLogin;
  if (pathname === "/employee-login") return theme.applyToEmployeeLogin;
  if (pathname === "/admin/login") return theme.applyToAdminLogin;
  return false;
}

function useActiveDesignerLoginPack(): DesignerLoginPack | null {
  const { experience } = useHolidayExperience();
  const pathname = usePathname() || "/";
  const composition = experience?.loginComposition;
  const theme = experience?.theme;
  if (
    !experience ||
    !theme ||
    !composition ||
    composition.applyMode === "default" ||
    composition.source.mode !== "designer_complete_pack" ||
    (!theme.experienceConfig.interpretation.regions.login && !experience.preview) ||
    !packAppliesToCurrentLogin(pathname, theme) ||
    (!theme.applyToLoginScreens && !experience.preview)
  ) {
    return null;
  }
  const pack = findDesignerLoginPack(composition.source.packId);
  if (pack?.activationReady) return pack;
  const imported = theme.designerPackAssets;
  if (
    imported?.activationReady &&
    composition.source.packId === `festival-pack:${imported.packId}`
  ) {
    return {
      id: composition.source.packId,
      version: 1,
      name: `${theme.name} imported designer pack`,
      festivalSlug: theme.slug,
      assets: {
        backgroundFourThree: imported.backgroundFourThree,
        backgroundWide: imported.backgroundWide,
        backgroundUltrawide: imported.backgroundUltrawide,
        logo: imported.logo || "/images/original/writex-logo-cropped.png",
        hero: imported.heroDesktop
      },
      integrity: {
        backgroundFourThreeSha256: "runtime-private-asset",
        backgroundWideSha256: "runtime-private-asset",
        backgroundUltrawideSha256: "runtime-private-asset",
        logoSha256: "runtime-private-asset",
        sourceReferenceSha256: "runtime-private-asset"
      },
      completeness: {
        responsiveBackgrounds: "approved",
        logo: "approved",
        formTokens: "approved",
        heroLayer: "approved_reference_8k",
        usesSceneBackgroundFallback: false,
        containsEmbeddedLoginUi: false,
        singleRealFormRequired: true
      },
      mobileModes: ["form_only", "compact_hero_form", "background_form"],
      defaultMobileMode: "background_form",
      activationReady: true
    };
  }
  return null;
}

export function DesignerLoginThemeRenderer() {
  const { experience } = useHolidayExperience();
  const pack = useActiveDesignerLoginPack();
  const composition = experience?.loginComposition;
  const responsiveAssets = experience?.theme.designerPackAssets;
  const mobileMode = composition?.source.mobileMode;

  if (localIndependenceDayPreview) {
    return (
      <div
        aria-hidden
        className="wx-designer-login-pack pointer-events-none absolute inset-0"
        data-pack-id="local-independence-day-approved-preview"
        data-mobile-mode="background_form"
        data-hero-layer="approved_reference_8k"
        data-composition-mode="full_canvas_floating_form"
        data-background-strategy="single_canvas"
        data-art-direction="responsive-approved-canvas"
        data-layout-contract="single-canvas-v1"
      >
        <FestivalCanvas
          sources={{
            twentyOneNine: localPreviewAssets.fullSceneTwentyOneNine,
            fourThree: localPreviewAssets.fourThree,
            standard: localPreviewAssets.fullSceneSixteenTen,
            wide: localPreviewAssets.fullSceneWide,
            ultrawide: localPreviewAssets.fullSceneUltrawide,
            tablet: localPreviewAssets.fourThree,
            mobile: localPreviewAssets.fourThree
          }}
        />
      </div>
    );
  }

  if (!pack || !mobileMode || !composition) return null;

  const canvasSources = resolveFestivalCanvasSources(pack, responsiveAssets);

  return (
    <div
      aria-hidden
      className="wx-designer-login-pack pointer-events-none absolute inset-0"
      data-pack-id={pack.id}
      data-mobile-mode={mobileMode}
      data-hero-layer={pack.completeness.heroLayer}
      data-composition-mode={composition.applyMode}
      data-background-strategy={composition.background.strategy}
      data-overlay-grain={
        composition.background.overlayGrain ? "on" : "off"
      }
      data-art-direction="responsive-approved-canvas"
      data-layout-contract="single-canvas-v1"
    >
      <FestivalCanvas sources={canvasSources} />
    </div>
  );
}

export function DesignerLoginPackLogo({
  fallback,
  className
}: {
  fallback: ReactNode;
  className: string;
}) {
  const { experience } = useHolidayExperience();
  const pack = useActiveDesignerLoginPack();
  void pack;
  void experience;
  void className;
  return fallback;
}
