import "server-only";

import { dbQuery } from "@/lib/db";
import type {
  HolidayExperienceStudioConfig,
  HolidayTheme
} from "./types";
import { studioSchema } from "./validation";
import { normalizeFestivalStudioScene } from "./canonical-scene";

type SurfaceVariant = {
  packId: string;
  variantSlug: string;
  variantName: string;
  variantVersion: number;
};

export type PublicFestivalSnapshotAsset = {
  assetId: string;
  libraryAssetId: string | null;
  packAssetKey: string | null;
  responsiveVariant: string;
  versionNumber: number;
  checksumSha256: string | null;
};

export type PublicFestivalActivationSnapshot = {
  id: string;
  themeId: string;
  festivalSlug: string;
  festivalName: string;
  variantPackId: string;
  configurationHash: string;
  targetSurfaces: string[];
  surfaceState: Partial<Record<"websiteHero" | "clientLoginHero" | "employeeLoginHero", SurfaceVariant>>;
  surfaceAssets: Partial<
    Record<
      "websiteHero" | "clientLoginHero" | "employeeLoginHero",
      PublicFestivalSnapshotAsset[]
    >
  >;
  sceneConfiguration: HolidayExperienceStudioConfig;
  sceneState: {
    headerEnabled: boolean;
    groundEnabled: boolean;
    axoEnabled: boolean;
    motionEnabled: boolean;
    motionLevel: "none" | "subtle" | "standard";
    websiteEnabled: boolean;
  };
  behaviorSettings: {
    websiteEnabled: boolean;
    clientLoginEnabled: boolean;
    employeeLoginEnabled: boolean;
    axoEnabled: boolean;
    soundEnabled: boolean;
  };
};

type ActiveSnapshotRow = {
  id: string;
  canonical_theme_id: string;
  festival_slug: string;
  variant_pack_id: string;
  target_surfaces: string[];
  configuration_hash: string;
  snapshot_payload: {
    festivalName?: string;
    surfaceState?: PublicFestivalActivationSnapshot["surfaceState"];
    surfaceAssets?: PublicFestivalActivationSnapshot["surfaceAssets"];
    sceneState?: PublicFestivalActivationSnapshot["sceneState"];
    behaviorSettings?: Partial<PublicFestivalActivationSnapshot["behaviorSettings"]>;
    customOverrides?: {
      sceneConfiguration?: unknown;
    };
  };
};

const emptyBehavior: PublicFestivalActivationSnapshot["behaviorSettings"] = {
  websiteEnabled: false,
  clientLoginEnabled: false,
  employeeLoginEnabled: false,
  axoEnabled: false,
  soundEnabled: false
};

export async function getPublicFestivalActivationSnapshot(): Promise<PublicFestivalActivationSnapshot | null> {
  const result = await dbQuery<ActiveSnapshotRow>(`
    select snapshot.id, configuration.theme_id as canonical_theme_id,
      snapshot.festival_slug, snapshot.variant_pack_id, snapshot.target_surfaces,
      snapshot.configuration_hash, snapshot.snapshot_payload
    from active_festival_snapshots snapshot
    join festival_studio_configurations configuration
      on configuration.id = snapshot.configuration_id
    where snapshot.state = 'active'
    order by snapshot.activated_at desc
    limit 1
  `);
  const row = result.rows[0];
  if (!row) return null;
  const scene = studioSchema.safeParse(
    row.snapshot_payload?.customOverrides?.sceneConfiguration
  );
  const sceneState = row.snapshot_payload?.sceneState;
  if (!scene.success || !sceneState) return null;
  return {
    id: row.id,
    themeId: row.canonical_theme_id,
    festivalSlug: row.festival_slug,
    festivalName:
      row.snapshot_payload.festivalName || row.festival_slug.replaceAll("-", " "),
    variantPackId: row.variant_pack_id,
    configurationHash: row.configuration_hash,
    targetSurfaces: row.target_surfaces || [],
    surfaceState: row.snapshot_payload.surfaceState || {},
    surfaceAssets: row.snapshot_payload.surfaceAssets || {},
    sceneConfiguration: normalizeFestivalStudioScene(
      scene.data as HolidayExperienceStudioConfig
    ),
    sceneState,
    behaviorSettings: {
      ...emptyBehavior,
      ...(row.snapshot_payload.behaviorSettings || {})
    }
  };
}

export async function getPublicFestivalPreviewSnapshot(
  snapshotId: string
): Promise<PublicFestivalActivationSnapshot | null> {
  const result = await dbQuery<ActiveSnapshotRow>(`
    select preview.id, configuration.theme_id as canonical_theme_id,
      preview.festival_slug, preview.variant_pack_id, preview.target_surfaces,
      preview.configuration_hash, preview.snapshot_payload
    from festival_preview_snapshots preview
    join festival_studio_configurations configuration
      on configuration.id = preview.configuration_id
    where preview.id = $1 and preview.expires_at > now()
    limit 1
  `, [snapshotId]);
  const row = result.rows[0];
  if (!row) return null;
  const scene = studioSchema.safeParse(
    row.snapshot_payload?.customOverrides?.sceneConfiguration
  );
  const sceneState = row.snapshot_payload?.sceneState;
  if (!scene.success || !sceneState) return null;
  return {
    id: row.id,
    themeId: row.canonical_theme_id,
    festivalSlug: row.festival_slug,
    festivalName:
      row.snapshot_payload.festivalName || row.festival_slug.replaceAll("-", " "),
    variantPackId: row.variant_pack_id,
    configurationHash: row.configuration_hash,
    targetSurfaces: row.target_surfaces || [],
    surfaceState: row.snapshot_payload.surfaceState || Object.fromEntries(
      (row.target_surfaces || []).map((surface) => [surface, {
        packId: row.variant_pack_id,
        variantSlug: "preview",
        variantName: "Preview",
        variantVersion: 1
      }])
    ),
    surfaceAssets: row.snapshot_payload.surfaceAssets || {},
    sceneConfiguration: normalizeFestivalStudioScene(
      scene.data as HolidayExperienceStudioConfig
    ),
    sceneState,
    behaviorSettings: {
      ...emptyBehavior,
      ...(row.snapshot_payload.behaviorSettings || {})
    }
  };
}

export function applyPublicFestivalActivationSnapshot(
  theme: HolidayTheme | null,
  snapshot: PublicFestivalActivationSnapshot | null
): HolidayTheme | null {
  if (!theme || !snapshot || theme.id !== snapshot.themeId) return null;
  const surfacePackIds = Object.fromEntries(
    Object.entries(snapshot.surfaceState).map(([surface, variant]) => [
      surface,
      variant?.packId || null
    ])
  );
  const websiteActive =
    snapshot.sceneState.websiteEnabled ||
    Boolean(snapshot.surfaceState.websiteHero);
  const clientActive = Boolean(snapshot.surfaceState.clientLoginHero);
  const employeeActive = Boolean(snapshot.surfaceState.employeeLoginHero);
  const studioCoverage = snapshot.sceneConfiguration.pageCoverage;
  const innerPagesActive =
    websiteActive &&
    !["login_only", "homepage_only", "homepage_login"].includes(
      studioCoverage
    );
  const publicPageCoverage =
    studioCoverage === "homepage_only" || studioCoverage === "homepage_login"
      ? "homepage_only"
      : studioCoverage === "selected_pages"
        ? "homepage_key_pages"
        : "full_website";
  return {
    ...theme,
    slug: snapshot.festivalSlug,
    scope: websiteActive ? "entire_public" : "login_screens",
    applyToHeader: snapshot.sceneState.headerEnabled,
    applyToFooter: snapshot.sceneState.groundEnabled,
    applyToHomepage: websiteActive,
    applyToLoginScreens: clientActive || employeeActive,
    applyToClientLogin: clientActive,
    applyToEmployeeLogin: employeeActive,
    applyAxoTheme: snapshot.sceneState.axoEnabled,
    animationLevel: snapshot.sceneState.motionLevel,
    activeFestivalPackId: snapshot.surfaceState.websiteHero?.packId || null,
    activeSurfacePackIds: surfacePackIds,
    experienceConfig: {
      ...theme.experienceConfig,
      animationEnabled: snapshot.sceneState.motionEnabled,
      animationPreset: "none",
      studio: snapshot.sceneConfiguration,
      interpretation: {
        ...theme.experienceConfig.interpretation,
        publicArtworkMode: "interpreted_motifs",
        pageCoverage: publicPageCoverage,
        regions: {
          ...theme.experienceConfig.interpretation.regions,
          header: snapshot.sceneState.headerEnabled,
          hero: false,
          innerPages: innerPagesActive,
          footer: snapshot.sceneState.groundEnabled,
          login: clientActive || employeeActive,
          axo: snapshot.sceneState.axoEnabled
        }
      },
      sound: {
        ...theme.experienceConfig.sound,
        enabled: snapshot.behaviorSettings.soundEnabled
      }
    }
  };
}
