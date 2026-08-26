"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import {
  CircleAlert,
  RotateCcw,
  Volume2,
  VolumeX
} from "lucide-react";
import type {
  HolidaySoundConfig,
  PublicHolidayExperience
} from "@/lib/holiday/types";
import { useHolidayExperience } from "./HolidayExperienceProvider";
import {
  FestiveFooterLayer,
  FestiveHeroLayer,
  FestiveLoginLayer,
  FestiveSectionCornerLayer
} from "./FestivalMotifs";
import {
  FestivalHeroAccentLayer,
  FestivalLoginAssetLayer
} from "./FestivalAssetRenderer";
import {
  FESTIVAL_HEADER_TIERS,
  FestivalHeaderRail,
  type FestivalHeaderTier
} from "./FestivalHeaderRail";
import { FESTIVAL_MOTIF_LIBRARY } from "@/lib/holiday/motif-library";
import type {
  HolidayStudioRegion,
  HolidayStudioMotion
} from "@/lib/holiday/types";
import { activeFestivalSceneAssignments } from "@/lib/holiday/canonical-scene";
import { decorationPackById } from "@/lib/holiday/decoration-packs";
import {
  festivalAxoPlacement,
  type FestivalAxoPlacement
} from "@/lib/holiday/festival-review-standard";
import { getBuiltInFestivalAssetPack } from "@/lib/holiday/built-in-assets";

const builtInFestivalAssetVersion = "?v=2";

function subscribeToLocationSearch(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function locationSearchSnapshot() {
  return window.location.search;
}

function locationSearchServerSnapshot() {
  return "";
}

type StudioSceneAsset = {
  id: string;
  region: HolidayStudioRegion;
  path: string;
  size: "small" | "medium" | "large";
  motion: HolidayStudioMotion;
  visibility: { desktop: boolean; tablet: boolean; mobile: boolean };
  decorationPackId: string | null;
  decorationType: string | null;
  componentSlot: string | null;
  axoPlacement: FestivalAxoPlacement | null;
};

function studioSceneAssets(
  theme: PublicHolidayExperience["theme"],
  regions: HolidayStudioRegion[],
  previewSnapshotId: string | null = null
): StudioSceneAsset[] {
  const studio = theme.experienceConfig.studio;
  return activeFestivalSceneAssignments(studio, regions).flatMap((assignment) => {
    if (
      !regions.includes(assignment.region)
    ) {
      return [];
    }
    const motif = FESTIVAL_MOTIF_LIBRARY.find(
      (candidate) => candidate.id === assignment.assetId
    );
    const governedAssetPath = assignment.assetVersionId
      ? `/api/website-experience/assets/${assignment.assetVersionId}?route=%2F${
          previewSnapshotId
            ? `&festivalPreviewSnapshot=${encodeURIComponent(previewSnapshotId)}`
            : ""
        }`
      : null;
    const syntheticAxo = assignment.assetId === `festival-axo-${theme.slug}`;
    if (!motif && !syntheticAxo && !governedAssetPath) return [];
    if (
      motif?.religiousApprovalRequired &&
      (!studio.religiousArtworkApproved ||
        !assignment.religiousArtworkApproved)
    ) {
      return [];
    }
    const regionVisibility = studio.regions[assignment.region].visibility;
    const completePack = assignment.decorationPackId
      ? decorationPackById(assignment.decorationPackId, assignment.decorationPackVersion)
      : null;
    const completePackComponent = completePack?.components.find(
      (item) => item.id === assignment.decorationComponentId
    );
    return [{
      id: assignment.id,
      region: assignment.region,
      path: governedAssetPath || `${
        motif?.path || getBuiltInFestivalAssetPack(theme.slug).axoOutfit
      }${motif ? builtInFestivalAssetVersion : ""}`,
      size: assignment.size,
      motion: assignment.motion,
      visibility: {
        desktop: assignment.visibility.desktop && regionVisibility.desktop,
        tablet: assignment.visibility.tablet && regionVisibility.tablet,
        mobile: assignment.visibility.mobile && regionVisibility.mobile
      },
      decorationPackId: completePack?.id || null,
      decorationType: completePack?.type || assignment.decorationType || null,
      componentSlot: completePackComponent?.slot || assignment.componentSlot || null,
      axoPlacement: assignment.axoPlacement ||
        (assignment.decorationType === "axo_prop"
          ? festivalAxoPlacement(null, "right_hand")
          : null)
    }];
  });
}

function usesFixedFestivalPack(
  sourceMode: string | undefined
) {
  return (
    sourceMode === "built_in_writex_pack" ||
    sourceMode === "built_in_uploaded_hybrid"
  );
}

export function HolidayAnnouncementBar() {
  const { experience } = useHolidayExperience();
  const theme = experience?.theme;
  if (
    !theme?.announcementBarEnabled ||
    !theme.announcementBarText ||
    theme.experienceLevel === "accent_only" ||
    theme.scope === "login_screens"
  ) {
    return null;
  }
  return (
    <div
      className="wx-holiday-announcement relative z-[51] overflow-hidden border-b px-4 py-2 text-center text-xs font-semibold sm:text-sm"
      role="status"
    >
      {theme.assets.announcement ? (
        <Image
          aria-hidden
          src={theme.assets.announcement}
          alt=""
          fill
          unoptimized
          sizes="100vw"
          className="pointer-events-none object-cover opacity-15"
        />
      ) : null}
      <span className="relative">{theme.announcementBarText}</span>
      {theme.announcementBarCtaHref && theme.announcementBarCtaLabel ? (
        <Link
          href={theme.announcementBarCtaHref}
          className="relative ml-3 inline-flex underline decoration-current/35 underline-offset-4"
        >
          {theme.announcementBarCtaLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function HolidayHeaderDecoration({
  compact = false
}: {
  compact?: boolean;
}) {
  const { experience } = useHolidayExperience();
  const theme = experience?.theme;
  const locationSearch = useSyncExternalStore(
    subscribeToLocationSearch,
    locationSearchSnapshot,
    locationSearchServerSnapshot
  );
  const requestedHeaderTier = new URLSearchParams(locationSearch).get(
    "festivalHeaderTier"
  );
  const headerTierOverride =
    experience?.previewSnapshotId &&
    FESTIVAL_HEADER_TIERS.includes(requestedHeaderTier as FestivalHeaderTier)
      ? (requestedHeaderTier as FestivalHeaderTier)
      : null;
  const interpretation = theme?.experienceConfig.interpretation;
  const sceneAssets = theme
    ? studioSceneAssets(theme, ["navigation_rail"], experience?.previewSnapshotId)
    : [];
  if (
    !theme?.applyToHeader ||
    (!interpretation?.regions.header && sceneAssets.length === 0) ||
    theme.scope === "login_screens"
  ) return null;
  const ornamentConfig = theme.experienceConfig.headerOrnaments;
  if (
    sceneAssets.length > 0 ||
    (ornamentConfig.enabled && ornamentConfig.mode !== "none")
  ) {
    return (
      <FestivalHeaderRail
        festivalSlug={theme.slug}
        config={ornamentConfig}
        assets={theme.ornamentAssets}
        studioAssets={sceneAssets}
        compact={compact}
        tierOverride={headerTierOverride}
      />
    );
  }
  return null;
}

export function HolidayFooterDecoration() {
  const { experience } = useHolidayExperience();
  const theme = experience?.theme;
  const interpretation = theme?.experienceConfig.interpretation;
  const studioAssets = theme
    ? studioSceneAssets(theme, ["section_dividers"], experience?.previewSnapshotId)
    : [];
  if (
    !theme?.applyToFooter ||
    !interpretation?.regions.footer ||
    theme.scope === "login_screens"
  ) return null;
  if (studioAssets.length > 0) {
    return (
      <div aria-hidden className="wx-festival-footer-composition pointer-events-none absolute inset-x-0 top-0 z-[2] h-28 overflow-hidden" data-festival-region="footer-composition" data-festival={theme.slug}>
        {studioAssets.map((asset) => (
          <span key={asset.id} className="wx-festival-footer-asset absolute inset-0" data-pack-slot={asset.componentSlot || "full_width"} data-desktop={asset.visibility.desktop ? "true" : "false"} data-tablet={asset.visibility.tablet ? "true" : "false"} data-mobile={asset.visibility.mobile ? "true" : "false"}>
            <Image src={asset.path} alt="" fill unoptimized sizes="100vw" className={`object-contain object-top ${theme.slug === "independence-day" ? "opacity-70" : "opacity-45"}`} />
          </span>
        ))}
      </div>
    );
  }
  return theme.assets.footer ? (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <Image
        src={theme.assets.footer}
        alt=""
        fill
        unoptimized
        sizes="100vw"
        className="object-cover object-bottom opacity-20"
      />
    </div>
  ) : (
    <FestiveFooterLayer
      motifs={interpretation.motifs}
      density={interpretation.headerDensity}
    />
  );
}

export function HolidayPageDecoration() {
  const { experience } = useHolidayExperience();
  const theme = experience?.theme;
  const pathname = usePathname() || "/";
  const interpretation = theme?.experienceConfig.interpretation;
  if (
    !theme ||
    !interpretation ||
    theme.experienceLevel === "accent_only" ||
    theme.scope === "login_screens" ||
    theme.scope === "header_only"
  ) {
    return null;
  }
  if (pathname === "/" && theme.assets.homepage_background) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      >
        <Image
          src={theme.assets.homepage_background}
          alt=""
          fill
          unoptimized
          priority
          sizes="100vw"
          className="object-cover opacity-20"
        />
      </div>
    );
  }
  if (pathname !== "/" && theme.assets.inner_page) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      >
        <Image
          src={theme.assets.inner_page}
          alt=""
          fill
          unoptimized
          sizes="100vw"
          className="object-cover opacity-15"
        />
      </div>
    );
  }
  if (
    interpretation.publicArtworkMode === "banner_asset" &&
    theme.assets.hero_art
  ) {
    return (
      <div
        aria-hidden
        className="wx-holiday-explicit-banner pointer-events-none fixed inset-x-0 top-[var(--wx-header-height)] z-[1] h-[min(34rem,56vh)] overflow-hidden"
      >
      <Image
        src={theme.assets.hero_art}
        alt=""
        fill
        unoptimized
        priority={pathname === "/"}
        sizes="100vw"
        className="object-cover"
      />
      </div>
    );
  }

  if (pathname === "/" && interpretation.regions.hero) {
    if (usesFixedFestivalPack(theme.experienceConfig.studio.sourceMode)) {
      return (
        <FestivalHeroAccentLayer
          festivalSlug={theme.slug}
          intensity={theme.experienceConfig.animationIntensity}
        />
      );
    }
    return (
      <>
        <FestiveHeroLayer
          motifs={interpretation.motifs}
          density={interpretation.headerDensity}
        />
        {theme.experienceConfig.headerOrnaments.mode !== "uploaded_custom" ? (
          <FestivalHeroAccentLayer
            festivalSlug={theme.slug}
            intensity={theme.experienceConfig.animationIntensity}
          />
        ) : null}
      </>
    );
  }
  if (interpretation.regions.innerPages) {
    return (
      <FestiveSectionCornerLayer
        motifs={interpretation.motifs}
        density={
          interpretation.headerDensity === "rich"
            ? "balanced"
            : "subtle"
        }
      />
    );
  }
  return null;
}

function independencePageIntensity(pathname: string) {
  if (pathname === "/") return "high";
  if (["/privacy", "/terms", "/academic-integrity"].includes(pathname)) {
    return "low";
  }
  if (
    pathname.startsWith("/help") ||
    pathname.startsWith("/templates") ||
    pathname.startsWith("/samples") ||
    pathname.startsWith("/reviews") ||
    pathname.startsWith("/tools")
  ) {
    return "low-medium";
  }
  return "medium";
}

export function HolidaySitewideDecoration() {
  const { experience } = useHolidayExperience();
  const pathname = usePathname() || "/";
  const theme = experience?.theme;
  if (
    !theme ||
    theme.slug !== "independence-day" ||
    theme.scope === "login_screens"
  ) {
    return null;
  }
  return (
    <div
      aria-hidden
      className="wx-independence-site-frame pointer-events-none fixed inset-x-0 bottom-0 z-[1] overflow-hidden"
      data-festival-region="sitewide-page-frame"
      data-page-intensity={independencePageIntensity(pathname)}
    >
      <span className="wx-independence-site-edge" data-edge="left" />
      <span className="wx-independence-site-edge" data-edge="right" />
      <span className="wx-independence-site-divider" />
    </div>
  );
}

export function HolidayAmbientEffects() {
  const { experience } = useHolidayExperience();
  const theme = experience?.theme;
  const config = theme?.experienceConfig;
  const motionPreset = (motion: HolidayStudioMotion) =>
    motion === "snowfall"
      ? "snow"
      : motion === "firework_sky"
        ? "controlled_fireworks"
        : motion === "colour_burst" || motion === "powder_splash"
          ? "colour_burst"
          : motion === "petal_fall"
            ? "falling_petals"
            : motion === "kite_flight"
              ? "kite_movement"
              : "floating_decorations";
  const explicitEffects = theme
    ? studioSceneAssets(
        theme,
        ["page_ambience", "floating_edges"],
        experience?.previewSnapshotId
      )
    : [];
  const ambientMotion = explicitEffects.find(
    (asset) => asset.region === "page_ambience" && asset.motion !== "static"
  )?.motion;
  const featureMotion = explicitEffects.find(
    (asset) => asset.region === "floating_edges" && asset.motion !== "static"
  )?.motion;
  const studioPresets = [ambientMotion, featureMotion]
    .filter((motion): motion is HolidayStudioMotion => Boolean(motion))
    .map(motionPreset);
  const activePresets = studioPresets.length > 0
    ? studioPresets
    : theme?.slug === "independence-day"
      ? ["floating_decorations", "kite_movement"]
      : config && config.animationPreset !== "none"
        ? [config.animationPreset]
        : [];
  if (
    !theme ||
    !config?.animationEnabled ||
    activePresets.length === 0 ||
    config.interpretation.motion === "off" ||
    (theme.slug !== "independence-day" &&
      studioPresets.length === 0 &&
      !Object.values(config.interpretation.motifs).some(Boolean)) ||
    theme.experienceLevel === "accent_only" ||
    theme.scope === "login_screens"
  ) {
    return null;
  }
  const count =
    theme.slug === "independence-day"
      ? 6
      : config.animationIntensity === "high"
      ? 16
      : config.animationIntensity === "medium"
        ? 12
        : 8;
  return activePresets.map((preset, effectIndex) => {
    const featureEffect = effectIndex === 1;
    const particleCount = featureEffect ? Math.min(6, count) : count;
    return (
      <div
        key={`${preset}-${effectIndex}`}
        aria-hidden
        className={`wx-holiday-ambient pointer-events-none fixed inset-0 z-[2] overflow-hidden${featureEffect ? " wx-holiday-feature" : ""}`}
        data-effect-kind={featureEffect ? "feature" : "ambient"}
        data-preset={preset}
        data-particles={config.particlePreset}
        data-intensity={config.animationIntensity}
        data-festival={theme.slug}
        data-desktop-only={config.desktopOnly ? "true" : "false"}
        data-mobile-simplified={config.mobileSimplified ? "true" : "false"}
      >
        {Array.from({ length: particleCount }, (_, index) => (
          <span
            key={index}
            className="wx-holiday-ambient-particle"
            style={{
              left: `${6 + ((index * 17 + effectIndex * 9) % 88)}%`,
              animationDelay: `${(index % 7) * -0.8 - effectIndex * 3}s`,
              animationDuration: featureEffect
                ? `${18 + (index % 4) * 2}s`
                : `${8 + (index % 5) * 1.5}s`
            }}
          />
        ))}
      </div>
    );
  });
}

export function HolidayGroundDecoration() {
  const { experience } = useHolidayExperience();
  const theme = experience?.theme;
  if (
    !theme ||
    !theme.applyToHomepage ||
    !theme.applyToFooter ||
    theme.scope === "login_screens"
  ) {
    return null;
  }
  const assets = studioSceneAssets(theme, [
    "footer_decoration"
  ], experience?.previewSnapshotId);
  if (assets.length === 0) return null;

  return (
    <div
      aria-hidden
      className="wx-festival-ground-region pointer-events-none relative z-[3] overflow-hidden"
      data-festival-region="ground-page-bottom"
      data-festival={theme.slug}
    >
      <div className="premium-container relative flex h-full items-end justify-center gap-3">
        {assets.map((asset) => (
          <span
            key={asset.id}
            className="wx-festival-ground-asset relative block"
            data-size={asset.size}
            data-motion={asset.motion}
            data-desktop={asset.visibility.desktop ? "true" : "false"}
            data-tablet={asset.visibility.tablet ? "true" : "false"}
            data-mobile={asset.visibility.mobile ? "true" : "false"}
            data-decoration-pack={asset.decorationPackId || undefined}
            data-decoration-type={asset.decorationType || undefined}
            data-pack-slot={asset.componentSlot || "centre"}
          >
            <Image
              src={asset.path}
              alt=""
              fill
              unoptimized
              sizes={asset.componentSlot === "full_width" ? "100vw" : "(max-width: 767px) 82vw, 720px"}
              className="object-contain object-bottom"
            />
          </span>
        ))}
      </div>
    </div>
  );
}

export function HolidayFestivalAxoRegion() {
  const { experience } = useHolidayExperience();
  const theme = experience?.theme;
  if (
    !theme ||
    !theme.applyAxoTheme ||
    !theme.applyToHomepage ||
    theme.scope === "login_screens"
  ) {
    return null;
  }
  const assets = studioSceneAssets(
    theme,
    ["axo_area"],
    experience?.previewSnapshotId
  );
  if (assets.length === 0 && !theme.assets.axo) return null;

  return (
    <div
      aria-hidden
      className="wx-festival-axo-region pointer-events-none fixed z-[64]"
      data-festival-region="approved-axo-area"
      data-private-preview={experience?.previewSnapshotId ? "true" : "false"}
    >
      <div className="wx-festival-axo-stage flex justify-start">
        <span className="wx-festival-axo-figure relative block">
          {theme.assets.axo && assets.length === 0 ? (
            <Image
              src={theme.assets.axo}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 767px) 116px, 176px"
              className="object-contain object-bottom"
            />
          ) : (
            <span className="absolute bottom-0 left-1/2 h-full aspect-[752/1159] -translate-x-1/2">
              <Image
                src="/images/mascots/writex-mascot-standing-wave.webp"
                alt=""
                fill
                unoptimized
                sizes="(max-width: 767px) 116px, 176px"
                className="object-contain object-bottom drop-shadow-[0_14px_22px_rgba(49,46,129,.2)]"
              />
              {assets.map((asset) => (
                <FestivalAxoAssetLayer key={asset.id} asset={asset} />
              ))}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function FestivalAxoAssetLayer({ asset }: { asset: StudioSceneAsset }) {
  const placement = asset.axoPlacement;
  if (!placement) {
    return (
      <Image
        src={asset.path}
        alt=""
        fill
        unoptimized
        sizes="(max-width: 767px) 116px, 176px"
        className="wx-festival-axo-overlay object-contain object-bottom"
        data-motion={asset.motion}
        data-desktop={asset.visibility.desktop ? "true" : "false"}
        data-tablet={asset.visibility.tablet ? "true" : "false"}
        data-mobile={asset.visibility.mobile ? "true" : "false"}
      />
    );
  }
  const fullBounds = placement.coordinateSpace === "axo_bounds";
  const layout = (viewport: "desktop" | "tablet" | "mobile") => {
    const transform = placement.transforms[viewport];
    const width = fullBounds ? 100 : 46 * transform.scale;
    const height = fullBounds ? 100 : 30 * transform.scale;
    return {
      left: fullBounds
        ? transform.offsetXPercent
        : placement.anchorPoint.x * 100 - placement.gripPoint.x * width + transform.offsetXPercent,
      top: fullBounds
        ? transform.offsetYPercent
        : placement.anchorPoint.y * 100 - placement.gripPoint.y * height + transform.offsetYPercent,
      width,
      height,
      transform: fullBounds
        ? `scale(${transform.scale}) rotate(${transform.rotationDeg}deg)`
        : `rotate(${transform.rotationDeg}deg)`,
      origin: `${
        (fullBounds ? placement.anchorPoint.x : placement.gripPoint.x) * 100
      }% ${
        (fullBounds ? placement.anchorPoint.y : placement.gripPoint.y) * 100
      }%`,
      zIndex: transform.zIndex
    };
  };
  const desktop = layout("desktop");
  const tablet = layout("tablet");
  const mobile = layout("mobile");
  const style = {
    "--axo-left-desktop": `${desktop.left}%`,
    "--axo-top-desktop": `${desktop.top}%`,
    "--axo-width-desktop": `${desktop.width}%`,
    "--axo-height-desktop": `${desktop.height}%`,
    "--axo-transform-desktop": desktop.transform,
    "--axo-origin-desktop": desktop.origin,
    "--axo-z-desktop": desktop.zIndex,
    "--axo-left-tablet": `${tablet.left}%`,
    "--axo-top-tablet": `${tablet.top}%`,
    "--axo-width-tablet": `${tablet.width}%`,
    "--axo-height-tablet": `${tablet.height}%`,
    "--axo-transform-tablet": tablet.transform,
    "--axo-origin-tablet": tablet.origin,
    "--axo-z-tablet": tablet.zIndex,
    "--axo-left-mobile": `${mobile.left}%`,
    "--axo-top-mobile": `${mobile.top}%`,
    "--axo-width-mobile": `${mobile.width}%`,
    "--axo-height-mobile": `${mobile.height}%`,
    "--axo-transform-mobile": mobile.transform,
    "--axo-origin-mobile": mobile.origin,
    "--axo-z-mobile": mobile.zIndex
  } as CSSProperties;
  return (
    <span
      className="wx-festival-axo-positioned absolute"
      data-motion={asset.motion}
      data-desktop={asset.visibility.desktop ? "true" : "false"}
      data-tablet={asset.visibility.tablet ? "true" : "false"}
      data-mobile={asset.visibility.mobile ? "true" : "false"}
      data-axo-anchor={placement.anchorType}
      style={style}
    >
      <Image
        src={asset.path}
        alt=""
        fill
        unoptimized
        sizes="(max-width: 767px) 64px, 96px"
        className="wx-festival-axo-overlay object-contain"
        data-motion={asset.motion}
      />
    </span>
  );
}

export function HolidaySoundControl() {
  const { experience } = useHolidayExperience();
  const theme = experience?.theme;
  const source = theme?.assets.audio;
  const config = theme?.experienceConfig.sound;

  if (
    !theme ||
    !source ||
    !config?.available ||
    !config.enabled ||
    !config.showUserControl ||
    !config.culturallyReviewed
  ) {
    return null;
  }

  return (
    <HolidaySoundPlayer
      key={theme.slug}
      themeSlug={theme.slug}
      source={source}
      config={config}
    />
  );
}

function HolidaySoundPlayer({
  themeSlug,
  source,
  config
}: {
  themeSlug: string;
  source: string;
  config: HolidaySoundConfig;
}) {
  const pathname = usePathname() || "/";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [muted, setMuted] = useState(() => {
    const fallback = config.defaultState === "muted";
    if (typeof window === "undefined" || !config.rememberPreference) {
      return fallback;
    }
    const stored = window.localStorage.getItem(
      `wx-festival-sound:${themeSlug}`
    );
    if (!stored) return fallback;
    try {
      const parsed = JSON.parse(stored) as { muted?: unknown };
      return typeof parsed.muted === "boolean" ? parsed.muted : fallback;
    } catch {
      return fallback;
    }
  });
  const [volume, setVolume] = useState(() => {
    const fallback = Math.min(0.5, Math.max(0, config.volume));
    if (typeof window === "undefined" || !config.rememberPreference) {
      return fallback;
    }
    const stored = window.localStorage.getItem(
      `wx-festival-sound:${themeSlug}`
    );
    if (!stored) return fallback;
    try {
      const parsed = JSON.parse(stored) as {
        volume?: unknown;
      };
      const storedVolume = Number(parsed.volume);
      return Number.isFinite(storedVolume)
        ? Math.min(0.5, Math.max(0, storedVolume))
        : fallback;
    } catch {
      const legacyVolume = Number(stored);
      return Number.isFinite(legacyVolume)
        ? Math.min(0.5, Math.max(0, legacyVolume))
        : fallback;
    }
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.min(0.5, Math.max(0, volume));
    audio.muted = muted;
    if (config.rememberPreference) {
      window.localStorage.setItem(
        `wx-festival-sound:${themeSlug}`,
        JSON.stringify({ volume, muted })
      );
    }
  }, [config.rememberPreference, muted, themeSlug, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if ((config.stopOnRouteExit || config.stopOnThemeEnd) && audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [config.stopOnRouteExit, config.stopOnThemeEnd, pathname, source]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setPlaybackError(null);
        setPlaying(true);
      } catch {
        setPlaybackError(
          "Sound preview could not start. Check the asset and select Retry."
        );
        setPlaying(false);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    setMuted((current) => !current);
  };

  const retryPlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaybackError(null);
    audio.load();
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaybackError(
        "Sound preview could not start. The approved audio may be unavailable."
      );
      setPlaying(false);
    }
  };

  return (
    <div
      className={`wx-holiday-sound-control fixed bottom-5 left-4 z-[47] flex-wrap items-center gap-2 rounded-md border border-wxBorder bg-wxSurface/95 p-2 shadow-soft backdrop-blur sm:left-5 ${
        config.mobileEnabled ? "flex" : "hidden md:flex"
      }`}
      aria-live="polite"
    >
      <audio
        ref={audioRef}
        src={source}
        loop={config.loop}
        preload="none"
        muted={muted}
        onEnded={() => setPlaying(false)}
        onCanPlay={() => setPlaybackError(null)}
        onError={() => {
          setPlaying(false);
          setPlaybackError(
            "Sound preview could not load. Check the approved audio asset."
          );
        }}
      />
      <button
        type="button"
        onClick={togglePlayback}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-wxBorder px-3 text-xs font-semibold text-wxIndigo800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
        aria-label={playing ? "Pause festive ambience" : "Play festive ambience"}
      >
        <Volume2 className="h-4 w-4" />
        {playing ? "Pause" : "Play Festive Ambience"}
      </button>
      <button
        type="button"
        onClick={toggleMute}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-wxBorder text-wxIndigo800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
        aria-label={muted ? "Unmute festive ambience" : "Mute festive ambience"}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>
      <label className="hidden items-center gap-2 text-xs text-wxIndigo600 sm:flex">
        <span className="sr-only">Festive ambience volume</span>
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.05}
          value={volume}
          onChange={(event) => {
            const next = Number(event.target.value);
            setVolume(next);
          }}
          className="w-20 accent-wxViolet700"
          aria-label="Festive ambience volume"
        />
      </label>
      {playbackError ? (
        <div
          className="flex basis-full items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-800"
          role="alert"
        >
          <CircleAlert className="h-4 w-4 shrink-0" />
          <span className="max-w-64">{playbackError}</span>
          <button
            type="button"
            onClick={retryPlayback}
            className="ml-auto inline-flex min-h-8 items-center gap-1 rounded-md border border-red-300 px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}

function loginThemeAppliesToPath({
  pathname,
  theme
}: {
  pathname: string;
  theme: NonNullable<ReturnType<typeof useHolidayExperience>["experience"]>["theme"];
}) {
  if (pathname === "/client-login") return theme.applyToClientLogin;
  if (pathname === "/employee-login") return theme.applyToEmployeeLogin;
  if (pathname === "/admin/login") return theme.applyToAdminLogin;
  return false;
}

function loginHeroDerivativeUrl({
  source,
  variant,
  width,
  version
}: {
  source: string;
  variant:
    | "desktopWide"
    | "desktopSplit"
    | "tablet"
    | "mobileBanner"
    | "mobilePortrait";
  width: number;
  version: number;
}) {
  const separator = source.includes("?") ? "&" : "?";
  return `${source}${separator}loginVariant=${variant}&width=${width}&dv=${version}`;
}

export function HolidayLoginHero() {
  const { experience } = useHolidayExperience();
  const theme = experience?.theme;
  const composition = experience?.loginComposition;
  const pathname = usePathname() || "/";
  const [failedRoles, setFailedRoles] = useState<string[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setDarkMode(root.dataset.theme === "dark");
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  if (
    !theme ||
    !composition ||
    composition.applyMode === "default" ||
    !theme.experienceConfig.interpretation.regions.login ||
    !loginThemeAppliesToPath({ pathname, theme }) ||
    (!theme.applyToLoginScreens && !experience?.preview)
  ) {
    return null;
  }

  const markFailed = (role: keyof typeof theme.assets) => {
    setFailedRoles((current) =>
      current.includes(role) ? current : [...current, role]
    );
    void fetch("/api/website-experience/asset-failure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ themeId: theme.id, role, route: pathname })
    }).catch(() => undefined);
  };

  const desktopRole = theme.assets.login_desktop
    ? "login_desktop"
    : theme.assets.login_background
      ? "login_background"
      : "login_mobile";
  const mobileRole = theme.assets.mobile_fallback
    ? "mobile_fallback"
    : theme.assets.login_mobile
    ? "login_mobile"
    : theme.assets.login_background
      ? "login_background"
      : "login_desktop";
  const preferredDesktopRole =
    reducedMotion && theme.assets.reduced_motion
      ? "reduced_motion"
      : desktopRole;
  const preferredMobileRole =
    reducedMotion && theme.assets.reduced_motion ? "reduced_motion" : mobileRole;
  const desktopAsset =
    theme.assets[preferredDesktopRole] &&
    !failedRoles.includes(preferredDesktopRole)
      ? theme.assets[preferredDesktopRole]
      : null;
  const mobileAsset =
    theme.assets[preferredMobileRole] &&
    !failedRoles.includes(preferredMobileRole)
      ? theme.assets[preferredMobileRole]
      : desktopAsset;

  const activeAsset = desktopAsset || mobileAsset;
  if (!activeAsset) return null;
  const desktopSource = desktopAsset || activeAsset;
  const mobileSource = mobileAsset || activeAsset;
  const derivativeVersion = composition.hero.derivativeVersion;
  const derivative = (
    source: string,
    variant: Parameters<typeof loginHeroDerivativeUrl>[0]["variant"],
    width: number
  ) =>
    loginHeroDerivativeUrl({
      source,
      variant,
      width,
      version: derivativeVersion
    });
  const overlayOpacity = darkMode
    ? composition.hero.darkOverlayOpacity
    : composition.hero.lightOverlayOpacity;

  return (
    <div
      aria-hidden
      className="wx-holiday-login-hero pointer-events-none absolute inset-0 z-[8] hidden overflow-hidden lg:block"
      data-embedded-ui={composition.hero.embeddedUiState}
      data-safe-crop={composition.hero.safeCropApproved}
      data-fit-mode={composition.hero.fitMode}
    >
      <div className="absolute inset-0 overflow-hidden">
        <picture>
          <source
            media="(min-width: 1536px)"
            srcSet={[
              `${derivative(desktopSource, "desktopWide", 1920)} 1920w`,
              `${derivative(desktopSource, "desktopWide", 3840)} 3840w`
            ].join(", ")}
            sizes="58vw"
          />
          <source
            media="(min-width: 1024px)"
            srcSet={[
              `${derivative(desktopSource, "desktopSplit", 1280)} 1280w`,
              `${derivative(desktopSource, "desktopSplit", 2560)} 2560w`
            ].join(", ")}
            sizes="58vw"
          />
          <source
            media="(min-width: 768px)"
            srcSet={[
              `${derivative(mobileSource, "tablet", 960)} 960w`,
              `${derivative(mobileSource, "tablet", 1920)} 1920w`
            ].join(", ")}
            sizes="100vw"
          />
          <source
            media="(min-height: 720px)"
            srcSet={[
              `${derivative(mobileSource, "mobilePortrait", 768)} 768w`,
              `${derivative(mobileSource, "mobilePortrait", 1536)} 1536w`
            ].join(", ")}
            sizes="100vw"
          />
          <Image
            src={derivative(mobileSource, "mobileBanner", 768)}
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className="wx-holiday-login-hero-image object-cover"
            onError={() =>
              markFailed(
                desktopAsset ? preferredDesktopRole : preferredMobileRole
              )
            }
          />
        </picture>
      </div>
      <div
        className="absolute inset-0 bg-[var(--wx-holiday-background-tint)]"
        style={{ opacity: overlayOpacity }}
      />
    </div>
  );
}

export function HolidayLoginFormBackground() {
  const { experience } = useHolidayExperience();
  const theme = experience?.theme;
  const composition = experience?.loginComposition;
  const [failed, setFailed] = useState(false);
  const mode = composition?.background.mode;
  const source = theme?.assets.login_background;
  if (
    !theme ||
    !composition?.background.enabled ||
    !source ||
    failed ||
    !["uploaded_form_background", "extended_artwork_ambience"].includes(
      mode || ""
    )
  ) {
    return null;
  }
  return (
    <Image
      aria-hidden
      src={source}
      alt=""
      fill
      unoptimized
      sizes="(min-width: 1024px) 42vw, 100vw"
      className="wx-auth-form-ambience-image object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function HolidayLoginDecoration() {
  const { experience } = useHolidayExperience();
  const theme = experience?.theme;
  const composition = experience?.loginComposition;
  const pathname = usePathname() || "/";
  const [failedRoles, setFailedRoles] = useState<string[]>([]);
  const customAxoAsset =
    theme?.applyAxoTheme && theme.assets.axo ? theme.assets.axo : null;

  useEffect(() => {
    const root = document.documentElement;
    delete root.dataset.holidayCustomAxoLoaded;
    return () => {
      delete root.dataset.holidayCustomAxoLoaded;
    };
  }, [customAxoAsset, pathname]);

  if (
    !theme ||
    !composition ||
    composition.applyMode === "default" ||
    !theme.experienceConfig.interpretation.regions.login ||
    !loginThemeAppliesToPath({ pathname, theme }) ||
    (!theme.applyToLoginScreens && !experience?.preview)
  ) {
    return null;
  }

  const markFailed = (role: keyof typeof theme.assets) => {
    setFailedRoles((current) =>
      current.includes(role) ? current : [...current, role]
    );
    void fetch("/api/website-experience/asset-failure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ themeId: theme.id, role, route: pathname })
    }).catch(() => undefined);
  };
  const showAmbience =
    composition.applyMode === "full_composition" &&
    composition.background.enabled;

  return (
    <>
      {theme.assets.decorative_overlay &&
      showAmbience &&
      !failedRoles.includes("decorative_overlay") ? (
        <Image
          aria-hidden
          src={theme.assets.decorative_overlay}
          alt=""
          fill
          unoptimized
          sizes="100vw"
          className="wx-holiday-login-overlay pointer-events-none z-[3] object-cover"
          onError={() => markFailed("decorative_overlay")}
        />
      ) : null}
      {!theme.assets.login_desktop &&
      !theme.assets.login_mobile &&
      !theme.assets.login_background &&
      theme.experienceConfig.headerOrnaments.mode !== "uploaded_custom" ? (
        <FestivalLoginAssetLayer festivalSlug={theme.slug} />
      ) : null}
      {theme.assets.logo_overlay && !failedRoles.includes("logo_overlay") ? (
        <Image
          aria-hidden
          src={theme.assets.logo_overlay}
          alt=""
          width={480}
          height={180}
          unoptimized
          className="wx-holiday-login-logo-overlay pointer-events-none absolute left-[4%] top-[3%] z-[15] hidden h-auto w-[min(24rem,34vw)] object-contain lg:block"
          onError={() => markFailed("logo_overlay")}
        />
      ) : null}
      {theme.applyAxoTheme &&
      theme.assets.axo &&
      !failedRoles.includes("axo") ? (
        <Image
          aria-hidden
          src={theme.assets.axo}
          alt=""
          width={900}
          height={900}
          unoptimized
          className="wx-holiday-login-axo pointer-events-none absolute bottom-0 left-0 z-[9] hidden h-[78%] w-[58%] object-contain object-bottom lg:block"
          onLoad={() => {
            document.documentElement.dataset.holidayCustomAxoLoaded = "on";
          }}
          onError={() => {
            delete document.documentElement.dataset.holidayCustomAxoLoaded;
            markFailed("axo");
          }}
        />
      ) : null}
      {showAmbience &&
      !usesFixedFestivalPack(theme.experienceConfig.studio.sourceMode) ? (
        <FestiveLoginLayer
          motifs={theme.experienceConfig.interpretation.motifs}
          density={theme.experienceConfig.interpretation.headerDensity}
        />
      ) : null}
      <div
        aria-hidden
        className="wx-holiday-login-accent pointer-events-none absolute inset-x-0 top-0 z-20 h-1"
      />
    </>
  );
}

export function HolidayPreviewBar() {
  const { experience, refresh } = useHolidayExperience();
  if (!experience?.preview || !experience.previewSnapshotId) return null;
  const exitPreview = async () => {
    await fetch("/api/admin/website-experience", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action: "clear_preview" })
    });
    refresh();
  };
  return (
    <div className="wx-holiday-preview-bar fixed inset-x-0 bottom-0 z-[90] flex min-h-12 items-center justify-center gap-3 border-t border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 shadow-lg">
      <span>
        Private preview:{" "}
        {experience.previewIdentity
          ? `${experience.previewIdentity.festivalName} - ${experience.previewIdentity.variantName}`
          : experience.theme.name}
      </span>
      <button
        type="button"
        onClick={exitPreview}
        className="min-h-9 rounded-md border border-amber-400 bg-white px-3 transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
      >
        Exit preview
      </button>
    </div>
  );
}
