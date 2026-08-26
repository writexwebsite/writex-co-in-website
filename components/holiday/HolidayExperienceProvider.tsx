"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";
import { usePathname } from "next/navigation";
import type { PublicHolidayExperience } from "@/lib/holiday/types";
import { loginCompositionUsesThemedForm } from "@/lib/holiday/login-theme";

type HolidayExperienceContextValue = {
  experience: PublicHolidayExperience | null;
  loading: boolean;
  refresh: () => void;
};

const HolidayExperienceContext =
  createContext<HolidayExperienceContextValue | null>(null);

const holidayCssVariables = [
  "--wx-holiday-accent",
  "--wx-holiday-accent-soft",
  "--wx-holiday-accent-warm",
  "--wx-holiday-secondary",
  "--wx-holiday-background-tint",
  "--wx-holiday-border-highlight",
  "--wx-holiday-cta",
  "--wx-holiday-decoration-one",
  "--wx-holiday-decoration-two",
  "--wx-holiday-text-on-accent",
  "--wx-holiday-surface-tint",
  "--wx-login-card-light",
  "--wx-login-card-dark",
  "--wx-login-heading-light",
  "--wx-login-heading-dark",
  "--wx-login-body-light",
  "--wx-login-body-dark",
  "--wx-login-input-light",
  "--wx-login-input-dark",
  "--wx-login-input-border-light",
  "--wx-login-input-border-dark",
  "--wx-login-focus-light",
  "--wx-login-focus-dark",
  "--wx-login-cta-start-light",
  "--wx-login-cta-end-light",
  "--wx-login-cta-start-dark",
  "--wx-login-cta-end-dark",
  "--wx-login-card-opacity",
  "--wx-login-card-blur",
  "--wx-login-card-border-width",
  "--wx-login-card-radius",
  "--wx-login-card-glow",
  "--wx-login-form-max-width",
  "--wx-login-background-intensity",
  "--wx-login-ambience-light-start",
  "--wx-login-ambience-light-end",
  "--wx-login-ambience-light-pattern",
  "--wx-login-ambience-dark-start",
  "--wx-login-ambience-dark-end",
  "--wx-login-ambience-dark-pattern"
] as const;

function clearHolidayRoot(root: HTMLElement) {
  delete root.dataset.holidayTheme;
  delete root.dataset.holidayMotif;
  delete root.dataset.holidayAnimation;
  delete root.dataset.holidayAnimationPreset;
  delete root.dataset.holidayAnimationIntensity;
  delete root.dataset.holidayHeaderPreset;
  delete root.dataset.holidayHeroPreset;
  delete root.dataset.holidayInnerPagePreset;
  delete root.dataset.holidayFooterPreset;
  delete root.dataset.holidayParticlePreset;
  delete root.dataset.holidayLevel;
  delete root.dataset.holidayScope;
  delete root.dataset.holidayPaletteMode;
  delete root.dataset.holidayWebsitePalette;
  delete root.dataset.holidayAxoTheme;
  delete root.dataset.holidayLoginAsset;
  delete root.dataset.holidayCustomAxo;
  delete root.dataset.holidayCustomAxoLoaded;
  delete root.dataset.holidayPreview;
  delete root.dataset.holidaySourceMode;
  delete root.dataset.holidayPublicArtwork;
  delete root.dataset.holidayDensity;
  delete root.dataset.holidayCoverage;
  delete root.dataset.holidayMotion;
  delete root.dataset.holidayRegionHeader;
  delete root.dataset.holidayRegionHero;
  delete root.dataset.holidayRegionInnerPages;
  delete root.dataset.holidayRegionFooter;
  delete root.dataset.holidayRegionLogin;
  delete root.dataset.holidayRegionAxo;
  delete root.dataset.holidayStudioSource;
  delete root.dataset.holidayStudioArtwork;
  delete root.dataset.holidayStudioDensity;
  delete root.dataset.holidayStudioCoverage;
  delete root.dataset.holidayStudioRegions;
  delete root.dataset.holidayLoginMode;
  delete root.dataset.holidayLoginAppearance;
  delete root.dataset.holidayLoginSkin;
  delete root.dataset.holidayLoginMobile;
  delete root.dataset.holidayLoginTexture;
  delete root.dataset.holidayLoginHeroFit;
  delete root.dataset.holidayLoginColumns;
  delete root.dataset.holidayLoginTransition;
  delete root.dataset.holidayLoginBackground;
  delete root.dataset.holidayLoginBackgroundStrategy;
  delete root.dataset.holidayLoginFormAnchor;
  delete root.dataset.holidayLoginPattern;
  delete root.dataset.holidayLoginSource;
  delete root.dataset.holidayLoginPack;
  delete root.dataset.holidayLoginPackMobile;
  for (const variable of holidayCssVariables) root.style.removeProperty(variable);
}

function applyHolidayRoot(
  root: HTMLElement,
  experience: PublicHolidayExperience | null
) {
  clearHolidayRoot(root);
  if (!experience) return;
  const { theme } = experience;
  root.dataset.holidayPreview = experience.preview ? "true" : "false";
  root.dataset.holidayTheme = theme.slug;
  root.dataset.holidayMotif = theme.motif;
  root.dataset.holidayAnimation = theme.animationLevel;
  root.dataset.holidayAnimationPreset = theme.experienceConfig.animationPreset;
  root.dataset.holidayAnimationIntensity =
    theme.experienceConfig.animationIntensity;
  root.dataset.holidayHeaderPreset = theme.experienceConfig.headerPreset;
  root.dataset.holidayHeroPreset = theme.experienceConfig.heroPreset;
  root.dataset.holidayInnerPagePreset =
    theme.experienceConfig.innerPagePreset;
  root.dataset.holidayFooterPreset = theme.experienceConfig.footerPreset;
  root.dataset.holidayParticlePreset = theme.experienceConfig.particlePreset;
  root.dataset.holidayLevel = theme.experienceLevel;
  root.dataset.holidayScope = theme.scope;
  const interpretation = theme.experienceConfig.interpretation;
  root.dataset.holidaySourceMode = interpretation.sourceMode;
  root.dataset.holidayPublicArtwork = interpretation.publicArtworkMode;
  root.dataset.holidayDensity = interpretation.headerDensity;
  root.dataset.holidayCoverage = interpretation.pageCoverage;
  root.dataset.holidayMotion = interpretation.motion;
  root.dataset.holidayRegionHeader = interpretation.regions.header
    ? "on"
    : "off";
  root.dataset.holidayRegionHero = interpretation.regions.hero ? "on" : "off";
  root.dataset.holidayRegionInnerPages = interpretation.regions.innerPages
    ? "on"
    : "off";
  root.dataset.holidayRegionFooter = interpretation.regions.footer
    ? "on"
    : "off";
  root.dataset.holidayRegionLogin = interpretation.regions.login
    ? "on"
    : "off";
  root.dataset.holidayRegionAxo = interpretation.regions.axo ? "on" : "off";
  const studio = theme.experienceConfig.studio;
  const protectedLoginBrand = theme.experienceConfig.protectedLoginBrand;
  root.dataset.holidayLoginBrandPlacement = protectedLoginBrand.placement;
  root.dataset.holidayLoginBrandSize = protectedLoginBrand.size;
  root.dataset.holidayLoginBrandLightContrast =
    protectedLoginBrand.lightContrast;
  root.dataset.holidayLoginBrandDarkContrast =
    protectedLoginBrand.darkContrast;
  root.dataset.holidayStudioSource = studio.sourceMode;
  root.dataset.holidayStudioArtwork = studio.artworkMode;
  root.dataset.holidayStudioDensity = studio.density;
  root.dataset.holidayStudioCoverage = studio.pageCoverage;
  root.dataset.holidayStudioRegions = Object.entries(studio.regions)
    .filter(([, region]) => region.enabled)
    .map(([region]) => region)
    .join(",");
  root.dataset.holidayPaletteMode = theme.paletteMatchMode;
  root.dataset.holidayWebsitePalette = theme.applyMatchingWebsitePalette
    ? "on"
    : "off";
  root.dataset.holidayAxoTheme = theme.applyAxoTheme ? "on" : "off";
  if (
    theme.assets.login_desktop ||
    theme.assets.login_mobile ||
    theme.assets.login_background
  ) {
    root.dataset.holidayLoginAsset = "on";
  }
  if (theme.applyAxoTheme && theme.assets.axo) {
    root.dataset.holidayCustomAxo = "on";
  }
  const login = experience.loginComposition;
  if (login) {
    root.dataset.holidayLoginMode = login.applyMode;
    root.dataset.holidayLoginAppearance = login.appearanceMode;
    root.dataset.holidayLoginSkin = loginCompositionUsesThemedForm(login)
      ? "themed"
      : "default";
    root.dataset.holidayLoginMobile = login.hero.mobileMode;
    root.dataset.holidayLoginTexture = login.background.texture;
    root.dataset.holidayLoginHeroFit = login.hero.fitMode;
    root.dataset.holidayLoginColumns = login.layout.desktopColumns;
    root.dataset.holidayLoginTransition = login.layout.transition;
    root.dataset.holidayLoginBackground = login.background.enabled
      ? login.background.mode
      : "default_writex_surface";
    root.dataset.holidayLoginBackgroundStrategy = login.background.strategy;
    root.dataset.holidayLoginFormAnchor = login.layout.formAnchor;
    root.dataset.holidayLoginPattern = login.background.enabled
      ? login.background.pattern
      : "none";
    root.dataset.holidayLoginSource = login.source.mode;
    root.dataset.holidayLoginPack = login.source.packId || "";
    root.dataset.holidayLoginPackMobile = login.source.mobileMode;
    root.style.setProperty(
      "--wx-login-card-light",
      login.formSkin.light.cardBackground
    );
    root.style.setProperty(
      "--wx-login-card-dark",
      login.formSkin.dark.cardBackground
    );
    root.style.setProperty(
      "--wx-login-heading-light",
      login.formSkin.light.headingColor
    );
    root.style.setProperty(
      "--wx-login-heading-dark",
      login.formSkin.dark.headingColor
    );
    root.style.setProperty("--wx-login-body-light", login.formSkin.light.bodyColor);
    root.style.setProperty("--wx-login-body-dark", login.formSkin.dark.bodyColor);
    root.style.setProperty(
      "--wx-login-input-light",
      login.formSkin.light.inputBackground
    );
    root.style.setProperty(
      "--wx-login-input-dark",
      login.formSkin.dark.inputBackground
    );
    root.style.setProperty(
      "--wx-login-input-border-light",
      login.formSkin.light.inputBorder
    );
    root.style.setProperty(
      "--wx-login-input-border-dark",
      login.formSkin.dark.inputBorder
    );
    root.style.setProperty("--wx-login-focus-light", login.formSkin.light.focusRing);
    root.style.setProperty("--wx-login-focus-dark", login.formSkin.dark.focusRing);
    root.style.setProperty(
      "--wx-login-cta-start-light",
      login.formSkin.light.ctaStart
    );
    root.style.setProperty(
      "--wx-login-cta-end-light",
      login.formSkin.light.ctaEnd
    );
    root.style.setProperty(
      "--wx-login-cta-start-dark",
      login.formSkin.dark.ctaStart
    );
    root.style.setProperty(
      "--wx-login-cta-end-dark",
      login.formSkin.dark.ctaEnd
    );
    root.style.setProperty(
      "--wx-login-card-opacity",
      String(login.formSkin.cardOpacity)
    );
    root.style.setProperty("--wx-login-card-blur", `${login.formSkin.blurPx}px`);
    root.style.setProperty(
      "--wx-login-card-border-width",
      `${login.formSkin.borderWidthPx}px`
    );
    root.style.setProperty(
      "--wx-login-card-radius",
      `${login.formSkin.radiusPx}px`
    );
    root.style.setProperty(
      "--wx-login-card-glow",
      String(login.formSkin.glowStrength)
    );
    root.style.setProperty(
      "--wx-login-form-max-width",
      `${login.layout.formMaxWidthPx}px`
    );
    root.style.setProperty(
      "--wx-login-background-intensity",
      String(login.background.intensity)
    );
    root.style.setProperty(
      "--wx-login-ambience-light-start",
      login.background.light.start
    );
    root.style.setProperty(
      "--wx-login-ambience-light-end",
      login.background.light.end
    );
    root.style.setProperty(
      "--wx-login-ambience-light-pattern",
      login.background.light.patternColor
    );
    root.style.setProperty(
      "--wx-login-ambience-dark-start",
      login.background.dark.start
    );
    root.style.setProperty(
      "--wx-login-ambience-dark-end",
      login.background.dark.end
    );
    root.style.setProperty(
      "--wx-login-ambience-dark-pattern",
      login.background.dark.patternColor
    );
  }
  root.style.setProperty("--wx-holiday-accent", theme.palette.accent);
  root.style.setProperty("--wx-holiday-accent-soft", theme.palette.accentSoft);
  root.style.setProperty("--wx-holiday-accent-warm", theme.palette.accentWarm);
  root.style.setProperty(
    "--wx-holiday-text-on-accent",
    theme.palette.textOnAccent
  );
  root.style.setProperty("--wx-holiday-surface-tint", theme.palette.surfaceTint);
  root.style.setProperty(
    "--wx-holiday-secondary",
    theme.palette.secondary || theme.palette.accentSoft
  );
  root.style.setProperty(
    "--wx-holiday-background-tint",
    theme.palette.backgroundTint || theme.palette.surfaceTint
  );
  root.style.setProperty(
    "--wx-holiday-border-highlight",
    theme.palette.borderHighlight || theme.palette.accent
  );
  root.style.setProperty(
    "--wx-holiday-cta",
    theme.palette.ctaAccent || theme.palette.accent
  );
  root.style.setProperty(
    "--wx-holiday-decoration-one",
    theme.palette.decorativeHighlights?.[0] || theme.palette.accentSoft
  );
  root.style.setProperty(
    "--wx-holiday-decoration-two",
    theme.palette.decorativeHighlights?.[1] || theme.palette.accentWarm
  );
}

export function HolidayExperienceProvider({
  children
}: {
  children: ReactNode;
}) {
  const pathname = usePathname() || "/";
  const [experience, setExperience] =
    useState<PublicHolidayExperience | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const shouldLoad =
    !(pathname === "/admin" || pathname.startsWith("/admin/")) ||
    pathname === "/admin/login";

  useEffect(() => {
    if (!shouldLoad) {
      clearHolidayRoot(document.documentElement);
      return;
    }
    const controller = new AbortController();
    const previewSnapshotId = new URLSearchParams(window.location.search).get(
      "festivalPreviewSnapshot"
    );
    const previewSnapshotQuery = previewSnapshotId
      ? `&festivalPreviewSnapshot=${encodeURIComponent(previewSnapshotId)}`
      : "";
    const previewPackId = new URLSearchParams(window.location.search).get(
      "festivalPackPreview"
    );
    const previewPackQuery = previewPackId
      ? `&festivalPackPreview=${encodeURIComponent(previewPackId)}`
      : "";
    fetch(
      `/api/website-experience/theme?route=${encodeURIComponent(pathname)}${previewSnapshotQuery}${previewPackQuery}`,
      {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal
      }
    )
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as {
          data?: { experience?: PublicHolidayExperience | null };
        };
        return body.data?.experience || null;
      })
      .catch(() => null)
      .then((nextExperience) => {
        if (controller.signal.aborted) return;
        setExperience(nextExperience);
        applyHolidayRoot(document.documentElement, nextExperience);
        if ((previewSnapshotId || previewPackId) && !nextExperience?.preview) {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("festivalPreviewSnapshot");
          cleanUrl.searchParams.delete("festivalPackPreview");
          window.history.replaceState(
            window.history.state,
            "",
            `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`
          );
        }
      })
    return () => controller.abort();
  }, [pathname, refreshKey, shouldLoad]);

  useEffect(
    () => () => clearHolidayRoot(document.documentElement),
    []
  );

  useEffect(() => {
    if (!shouldLoad) return;
    const timer = window.setInterval(
      () => setRefreshKey((value) => value + 1),
      60_000
    );
    return () => window.clearInterval(timer);
  }, [shouldLoad]);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);
  const value = useMemo(
    () => ({
      experience: shouldLoad ? experience : null,
      loading: false,
      refresh
    }),
    [experience, refresh, shouldLoad]
  );

  return (
    <HolidayExperienceContext.Provider value={value}>
      {children}
    </HolidayExperienceContext.Provider>
  );
}

export function useHolidayExperience() {
  const value = useContext(HolidayExperienceContext);
  if (!value) {
    return {
      experience: null,
      loading: false,
      refresh: () => undefined
    } satisfies HolidayExperienceContextValue;
  }
  return value;
}

export function holidayPreviewStyle(
  experience: PublicHolidayExperience | null
): CSSProperties | undefined {
  if (!experience) return undefined;
  return {
    "--holiday-preview-accent": experience.theme.palette.accent,
    "--holiday-preview-soft": experience.theme.palette.accentSoft
  } as CSSProperties;
}
