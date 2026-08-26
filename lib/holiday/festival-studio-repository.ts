import "server-only";

import { createHash } from "node:crypto";
import { badRequest } from "@/lib/api/response";
import { dbQuery, withDbTransaction } from "@/lib/db";
import { getFestivalAssetLibrarySnapshot } from "./asset-governance";
import type { FestivalAssetPlacement } from "./asset-governance-types";
import {
  activateFestivalPack,
  getFestivalPackSnapshot
} from "./festival-pack-repository";
import {
  defaultHolidayLoginComposition,
  festivalPackFullCanvasComposition
} from "./login-theme";
import {
  applyHolidayAdminAction,
  getHolidayExperienceSnapshot
} from "./repository";
import type {
  FestivalStudioAssetSummary,
  FestivalStudioConfiguration,
  FestivalStudioDiagnostic,
  FestivalStudioHistory,
  FestivalHeroSurface,
  FestivalPreviewSnapshotSummary,
  FestivalSnapshotSummary,
  FestivalStudioSlot,
  FestivalStudioSnapshot
} from "./festival-studio-types";
import { DEFAULT_EXPERIENCE_PACK } from "./packs";
import type {
  HolidayExperienceStudioConfig,
  HolidayStudioMotifAssignment
} from "./types";
import { FESTIVAL_MOTIF_LIBRARY } from "./motif-library";
import {
  decorationPackById,
  decorationAssetFestivalSlugs,
  decorationPackSupportsFestival,
  isDecorationPackComponentValid
} from "./decoration-packs";
import { studioSchema } from "./validation";
import {
  activeFestivalSceneAssignments,
  normalizeFestivalStudioScene
} from "./canonical-scene";
import {
  FESTIVAL_HERO_SURFACES,
  isFestivalStudioRoleCompatible
} from "./festival-studio-types";

type ConfigRow = {
  id: string;
  festival_group_id: string | null;
  festival_slug: string;
  festival_name: string;
  theme_id: string | null;
  selected_variant_pack_id: string | null;
  selected_variant_slug: string | null;
  client_login_hero_asset_id: string | null;
  employee_login_hero_asset_id: string | null;
  website_hero_asset_id: string | null;
  header_asset_id: string | null;
  axo_asset_id: string | null;
  background_asset_id: string | null;
  sound_asset_id: string | null;
  motion_config: { enabled?: boolean; level?: string } | null;
  protected_brand_config: FestivalStudioConfiguration["protectedLoginBrand"] | null;
  studio_config: HolidayExperienceStudioConfig | null;
  client_login_enabled: boolean;
  employee_login_enabled: boolean;
  website_enabled: boolean;
  axo_enabled: boolean;
  sound_enabled: boolean;
  start_at: Date | string | null;
  end_at: Date | string | null;
  repeat_yearly: boolean;
  activation_status: FestivalStudioConfiguration["activationStatus"];
  version: number | string;
  updated_by_name: string | null;
  updated_at: Date | string;
};

type AssetRow = {
  id: string;
  library_asset_id: string | null;
  safe_file_name: string;
  mime_type: string;
  asset_role: string;
  status: string;
  review_status: string;
  quality_status: string;
  lifecycle_state: string;
  version_number: number | string;
  created_at: Date | string;
};

type HistoryRow = {
  id: string;
  configuration_id: string;
  version: number | string;
  version_state: string;
  action: string;
  changed_by_name: string | null;
  created_at: Date | string;
};

const slotColumns: Record<FestivalStudioSlot, string> = {
  clientLoginHero: "client_login_hero_asset_id",
  employeeLoginHero: "employee_login_hero_asset_id",
  websiteHero: "website_hero_asset_id",
  header: "header_asset_id",
  axo: "axo_asset_id",
  background: "background_asset_id",
  sound: "sound_asset_id"
};

const slotPlacements: Record<FestivalStudioSlot, FestivalAssetPlacement> = {
  clientLoginHero: "client_login_desktop",
  employeeLoginHero: "employee_login_desktop",
  websiteHero: "homepage_hero",
  header: "header_decoration_rail",
  axo: "axo_theme_reference",
  background: "homepage_background",
  sound: "audio"
};

const assetIdColumns = Object.values(slotColumns);

function iso(value: Date | string | null) {
  return value ? new Date(value).toISOString() : null;
}

function mapAsset(row: AssetRow): FestivalStudioAssetSummary {
  return {
    id: row.id,
    libraryAssetId: row.library_asset_id,
    safeFileName: row.safe_file_name,
    mimeType: row.mime_type,
    role: row.asset_role,
    status: row.status,
    reviewStatus: row.review_status,
    qualityStatus: row.quality_status,
    lifecycleState: row.lifecycle_state,
    versionNumber: Number(row.version_number || 1),
    createdAt: new Date(row.created_at).toISOString()
  };
}

function slotEnabled(config: ConfigRow, slot: FestivalStudioSlot) {
  if (slot === "clientLoginHero") return config.client_login_enabled;
  if (slot === "employeeLoginHero") return config.employee_login_enabled;
  if (["websiteHero", "header", "background"].includes(slot)) {
    return config.website_enabled;
  }
  if (slot === "axo") return config.axo_enabled;
  return config.sound_enabled;
}

const sceneGroundRegions = [
  "footer_decoration",
  "section_dividers",
  "floating_edges"
] as const;

function sceneSurfaceState(
  studio: HolidayExperienceStudioConfig
) {
  const canonicalStudio = normalizeFestivalStudioScene(studio);
  const hasEnabledAssignment = (region: keyof typeof studio.regions) =>
    activeFestivalSceneAssignments(canonicalStudio, [region]).length > 0;
  const headerEnabled = hasEnabledAssignment("navigation_rail");
  const groundEnabled =
    sceneGroundRegions.some((region) => hasEnabledAssignment(region));
  const axoEnabled = hasEnabledAssignment("axo_area");
  const motionEnabled = canonicalStudio.activeMotions.some(
    (motion) => motion !== "static"
  );
  const websiteEnabled =
    headerEnabled ||
    groundEnabled ||
    axoEnabled ||
    motionEnabled;
  const motionLevel = motionEnabled
    ? canonicalStudio.activeMotions.filter((motion) => motion !== "static").length > 1
      ? "standard"
      : "subtle"
    : "none";

  return {
    headerEnabled,
    groundEnabled,
    axoEnabled,
    motionEnabled,
    motionLevel,
    websiteEnabled
  } as const;
}

function diagnosticFor({
  config,
  slot,
  asset
}: {
  config: ConfigRow;
  slot: FestivalStudioSlot;
  asset: FestivalStudioAssetSummary | null;
}): FestivalStudioDiagnostic {
  if (!slotEnabled(config, slot)) {
    return {
      slot,
      status: "normal_writex_website",
      explanation: "This slot is disabled, so the normal WriteX presentation is used.",
      fix: "enable"
    };
  }
  if (!asset) {
    return {
      slot,
      status: "normal_writex_website",
      explanation: "No festival asset is selected. The safe WriteX default remains active.",
      fix: "configure"
    };
  }
  if (!isFestivalStudioRoleCompatible(slot, asset.role, asset.mimeType)) {
    return {
      slot,
      status: "invalid_legacy_assignment",
      explanation: `Invalid legacy assignment: ${asset.role.replaceAll("_", " ")} cannot be used in this slot. The record remains in history and must be reset to the variant or WriteX default.`,
      fix: "replace"
    };
  }
  if (["trash", "deletion_pending", "deleted"].includes(asset.lifecycleState)) {
    return {
      slot,
      status: "blocked",
      explanation: "The selected asset is unavailable because it is in Trash or pending deletion.",
      fix: "replace"
    };
  }
  if (["archived", "rejected"].includes(asset.status)) {
    return {
      slot,
      status: "blocked",
      explanation: "The selected asset is archived or rejected and cannot be rendered.",
      fix: "replace"
    };
  }
  if (
    asset.reviewStatus !== "approved" ||
    !["approved", "approved_with_size_restrictions"].includes(asset.qualityStatus)
  ) {
    return {
      slot,
      status: "draft",
      explanation: "The upload is assigned and visible in private preview. Final visual approval happens once during activation.",
      fix: "activate"
    };
  }
  if (config.activation_status === "active") {
    return {
      slot,
      status: "active",
      explanation: "The approved asset is assigned to the active festival configuration.",
      fix: null
    };
  }
  return {
    slot,
    status: "assigned",
    explanation:
      config.activation_status === "scheduled"
        ? "The asset is assigned and will appear during the scheduled window."
        : "The asset is assigned, but this festival configuration is not active.",
    fix: "activate"
  };
}

async function configurationRows() {
  const result = await dbQuery<ConfigRow>(`
    select configuration.*,
      theme.experience_config->'protectedLoginBrand' as protected_brand_config,
      theme.experience_config->'studio' as studio_config,
      actor.name as updated_by_name
    from festival_studio_configurations configuration
    left join holiday_themes theme on theme.id = configuration.theme_id
    left join admin_users actor on actor.id = configuration.updated_by
    order by lower(configuration.festival_name), configuration.festival_name
  `);
  return result.rows;
}

async function assetRows(configs: ConfigRow[]) {
  const ids = [
    ...new Set(
      configs.flatMap((config) =>
        assetIdColumns
          .map((column) => config[column as keyof ConfigRow])
          .filter((value): value is string => typeof value === "string")
      )
    )
  ];
  if (ids.length === 0) return new Map<string, FestivalStudioAssetSummary>();
  const result = await dbQuery<AssetRow>(`
    select
      asset.id, asset.library_asset_id, asset.safe_file_name, asset.mime_type,
      asset.asset_role, asset.status, asset.review_status, asset.quality_status,
      coalesce(library.lifecycle_state, 'active') as lifecycle_state,
      asset.version_number, asset.created_at
    from holiday_theme_assets asset
    left join festival_asset_library library on library.id = asset.library_asset_id
    where asset.id = any($1::uuid[])
  `, [ids]);
  return new Map(result.rows.map((row) => [row.id, mapAsset(row)]));
}

function mapConfiguration(
  row: ConfigRow,
  assetsById: Map<string, FestivalStudioAssetSummary>
): FestivalStudioConfiguration {
  const assets = Object.fromEntries(
    Object.entries(slotColumns).map(([slot, column]) => {
      const id = row[column as keyof ConfigRow];
      return [
        slot,
        typeof id === "string" ? assetsById.get(id) || null : null
      ];
    })
  ) as FestivalStudioConfiguration["assets"];
  const diagnostics = Object.keys(slotColumns).map((slot) =>
    diagnosticFor({
      config: row,
      slot: slot as FestivalStudioSlot,
      asset: assets[slot as FestivalStudioSlot]
    })
  );
  return {
    id: row.id,
    festivalGroupId: row.festival_group_id,
    festivalSlug: row.festival_slug,
    festivalName: row.festival_name,
    themeId: row.theme_id,
    selectedVariantPackId: row.selected_variant_pack_id,
    selectedVariantSlug: row.selected_variant_slug,
    assets,
    motionConfig: {
      enabled: Boolean(row.motion_config?.enabled),
      level: ["none", "subtle", "standard"].includes(
        String(row.motion_config?.level)
      )
        ? (row.motion_config?.level as "none" | "subtle" | "standard")
        : "subtle"
    },
    protectedLoginBrand: {
      placement: ["safe_auto", "upper_left", "compact_top"].includes(
        String(row.protected_brand_config?.placement)
      )
        ? row.protected_brand_config!.placement
        : "safe_auto",
      size: ["compact", "standard"].includes(
        String(row.protected_brand_config?.size)
      )
        ? row.protected_brand_config!.size
        : "standard",
      lightContrast: ["soft_glass", "text_shadow"].includes(
        String(row.protected_brand_config?.lightContrast)
      )
        ? row.protected_brand_config!.lightContrast
        : "soft_glass",
      darkContrast: ["soft_glass", "text_shadow"].includes(
        String(row.protected_brand_config?.darkContrast)
      )
        ? row.protected_brand_config!.darkContrast
        : "soft_glass"
    },
    studioConfig: row.studio_config || DEFAULT_EXPERIENCE_PACK.studio,
    clientLoginEnabled: row.client_login_enabled,
    employeeLoginEnabled: row.employee_login_enabled,
    websiteEnabled: row.website_enabled,
    axoEnabled: row.axo_enabled,
    soundEnabled: row.sound_enabled,
    startAt: iso(row.start_at),
    endAt: iso(row.end_at),
    repeatYearly: row.repeat_yearly,
    activationStatus: row.activation_status,
    version: Number(row.version || 1),
    updatedBy: row.updated_by_name,
    updatedAt: new Date(row.updated_at).toISOString(),
    diagnostics
  };
}

async function historyRows() {
  const result = await dbQuery<HistoryRow>(`
    select version.*, actor.name as changed_by_name
    from festival_studio_configuration_versions version
    left join admin_users actor on actor.id = version.changed_by
    order by version.created_at desc
    limit 160
  `);
  return result.rows.map(
    (row): FestivalStudioHistory => ({
      id: row.id,
      configurationId: row.configuration_id,
      version: Number(row.version),
      state: row.version_state,
      action: row.action,
      changedBy: row.changed_by_name,
      createdAt: new Date(row.created_at).toISOString()
    })
  );
}

export async function saveFestivalStudioScene({
  configurationId,
  studio,
  expectedVersion,
  actorId
}: {
  configurationId: string;
  studio: HolidayExperienceStudioConfig;
  expectedVersion: number;
  actorId: string;
}) {
  await withDbTransaction(async (query) => {
    const configuration = await configurationForUpdate(query, configurationId);
    if (Number(configuration.version) !== expectedVersion) {
      throw badRequest("The draft changed in another session; refresh and retry.");
    }
    if (!configuration.theme_id) {
      throw badRequest("Choose a festival variant before editing its scene.");
    }
    const canonicalStudio = await validateCanonicalScene(
      studio,
      configuration.festival_slug,
      false,
      query
    );
    await ensureGovernedSceneAssignments({
      studio: canonicalStudio,
      themeId: configuration.theme_id,
      actorId,
      query
    });
    const surfaceState = sceneSurfaceState(canonicalStudio);
    await query(`
      update holiday_themes
      set experience_config = jsonb_set(
            coalesce(experience_config, '{}'::jsonb),
            '{studio}', $2::jsonb, true
          ),
          updated_by = $3,
          updated_at = now()
      where id = $1
    `, [
      configuration.theme_id,
      JSON.stringify(canonicalStudio),
      actorId
    ]);
    await query(`
      update festival_studio_configurations
      set website_enabled = $2,
          axo_enabled = $3,
          motion_config = $4::jsonb,
          version = version + 1,
          updated_by = $5,
          updated_at = now()
      where id = $1
    `, [
      configurationId,
      surfaceState.websiteEnabled,
      surfaceState.axoEnabled,
      JSON.stringify({
        enabled: surfaceState.motionEnabled,
        level: surfaceState.motionLevel
      }),
      actorId
    ]);
    configuration.website_enabled = surfaceState.websiteEnabled;
    configuration.axo_enabled = surfaceState.axoEnabled;
    configuration.motion_config = {
      enabled: surfaceState.motionEnabled,
      level: surfaceState.motionLevel
    };
    configuration.version = Number(configuration.version) + 1;
    if (!configuration.selected_variant_pack_id) {
      throw badRequest("Choose a festival variant before editing its scene.");
    }
    const pack = await canonicalPackForUpdate(
      query,
      configuration.selected_variant_pack_id
    );
    await assertCanonicalPackOwnership(query, configuration, pack);
    await upsertCanonicalManifestAndDraft({
      query,
      configuration,
      pack,
      actorId
    });
    await writeVersion(query, configurationId, actorId, "visual_scene_saved");
  });
}

type ActiveSnapshotRow = {
  id: string;
  preview_snapshot_id: string | null;
  configuration_id: string;
  festival_slug: string;
  festival_name: string;
  variant_pack_id: string;
  variant_slug: string;
  variant_name: string;
  variant_version: number | string;
  target_surfaces: string[];
  snapshot_payload: {
    surfaceState?: FestivalSnapshotSummary["surfaceVariants"];
    surfaceAssets?: Partial<Record<FestivalHeroSurface, CanonicalPackFile[]>>;
    sceneState?: ReturnType<typeof sceneSurfaceState>;
    behaviorSettings?: {
      websiteEnabled?: boolean;
      clientLoginEnabled?: boolean;
      employeeLoginEnabled?: boolean;
      axoEnabled?: boolean;
      soundEnabled?: boolean;
    };
    customOverrides?: {
      sceneConfiguration?: HolidayExperienceStudioConfig;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  configuration_hash: string;
  previous_snapshot_id: string | null;
  activated_at: Date | string;
};

type PreviewSnapshotRow = {
  id: string;
  configuration_id: string;
  festival_slug: string;
  variant_pack_id: string;
  variant_slug: string;
  variant_name: string;
  variant_version: number | string;
  target_surfaces: string[];
  configuration_hash: string;
  created_at: Date | string;
  expires_at: Date | string;
};

function safeHeroSurfaces(values: string[]): FestivalHeroSurface[] {
  return values.filter((value): value is FestivalHeroSurface =>
    FESTIVAL_HERO_SURFACES.includes(value as FestivalHeroSurface)
  );
}

async function snapshotRows() {
  const [active, previews] = await Promise.all([
    dbQuery<ActiveSnapshotRow>(`
      select id, preview_snapshot_id, configuration_id, festival_slug,
        festival_name, variant_pack_id, variant_slug, variant_name,
        variant_version, target_surfaces, snapshot_payload, configuration_hash,
        previous_snapshot_id, activated_at
      from active_festival_snapshots
      where state = 'active'
      order by activated_at desc
      limit 1
    `),
    dbQuery<PreviewSnapshotRow>(`
      select distinct on (configuration_id)
        id, configuration_id, festival_slug, variant_pack_id, variant_slug,
        variant_name, variant_version, target_surfaces, configuration_hash,
        created_at, expires_at
      from festival_preview_snapshots
      order by configuration_id, created_at desc
    `)
  ]);
  const activeRow = active.rows[0];
  const mapSnapshot = (row: ActiveSnapshotRow): FestivalSnapshotSummary => ({
    id: row.id,
    previewSnapshotId: row.preview_snapshot_id,
    configurationId: row.configuration_id,
    festivalSlug: row.festival_slug,
    festivalName: row.festival_name,
    variantPackId: row.variant_pack_id,
    variantSlug: row.variant_slug,
    variantName: row.variant_name,
    variantVersion: Number(row.variant_version),
    targetSurfaces: safeHeroSurfaces(row.target_surfaces || []),
    surfaceVariants: row.snapshot_payload?.surfaceState || {},
    configurationHash: row.configuration_hash,
    previousSnapshotId: row.previous_snapshot_id,
    activatedAt: new Date(row.activated_at).toISOString()
  });
  const activeSnapshot: FestivalSnapshotSummary | null = activeRow
    ? {
        ...mapSnapshot(activeRow)
      }
    : null;
  const previous = activeRow
    ? await dbQuery<ActiveSnapshotRow>(`
        select id, preview_snapshot_id, configuration_id, festival_slug,
          festival_name, variant_pack_id, variant_slug, variant_name,
          variant_version, target_surfaces, snapshot_payload, configuration_hash,
          previous_snapshot_id, activated_at
        from active_festival_snapshots
        where id <> $1
          and state in ('previous','disabled','rolled_back')
          and activated_at < $2
        order by case when id = $3 then 0 else 1 end, activated_at desc
        limit 1
      `, [activeRow.id, activeRow.activated_at, activeRow.previous_snapshot_id])
    : null;
  const previousPublicSnapshot = previous?.rows[0]
    ? mapSnapshot(previous.rows[0])
    : null;
  const latestPreviewSnapshots: FestivalPreviewSnapshotSummary[] = previews.rows.map(
    (row) => ({
      id: row.id,
      configurationId: row.configuration_id,
      festivalSlug: row.festival_slug,
      variantPackId: row.variant_pack_id,
      variantSlug: row.variant_slug,
      variantName: row.variant_name,
      variantVersion: Number(row.variant_version),
      targetSurfaces: safeHeroSurfaces(row.target_surfaces || []),
      configurationHash: row.configuration_hash,
      createdAt: new Date(row.created_at).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString()
    })
  );
  return { activeSnapshot, previousPublicSnapshot, latestPreviewSnapshots };
}

async function reconcileCanonicalSnapshotState() {
  await withDbTransaction(async (query) => {
    const activeConfigurations = await query<{ id: string }>(`
      select id
      from festival_studio_configurations
      where activation_status = 'active'
      limit 1
    `);
    if (activeConfigurations.length > 0) return;
    const staleSnapshots = await query<{ id: string }>(`
      update active_festival_snapshots
      set state = 'disabled', deactivated_at = now(),
          deactivation_reason = 'Reconciled with the default WriteX experience.'
      where state = 'active'
      returning id
    `);
    if (staleSnapshots.length === 0) return;
    await query(`
      update holiday_themes
      set active_festival_pack_id = null,
          experience_config = coalesce(experience_config, '{}'::jsonb) - 'activeSurfacePackIds',
          updated_at = now()
      where active_festival_pack_id is not null
         or experience_config ? 'activeSurfacePackIds'
    `);
  });
}

export async function getFestivalStudioSnapshot({
  canEdit,
  canActivate,
  readOnly,
  adminUserId
}: {
  canEdit: boolean;
  canActivate: boolean;
  readOnly: boolean;
  adminUserId?: string;
}): Promise<FestivalStudioSnapshot> {
  await reconcileCanonicalSnapshotState();
  const [configs, packLibrary, assetLibrary, history, snapshots] = await Promise.all([
    configurationRows(),
    getFestivalPackSnapshot(),
    getFestivalAssetLibrarySnapshot(),
    historyRows(),
    snapshotRows()
  ]);
  const assetsById = await assetRows(configs);
  const configurations = configs.map((row) =>
    mapConfiguration(row, assetsById)
  );
  const notice = adminUserId ? await dbQuery<{ dismissed_at: string }>(
    "select dismissed_at from admin_feature_notice_state where admin_user_id=$1 and notice_key='festival-studio-simplified-v2'",
    [adminUserId]
  ).catch(() => ({ rows: [] })) : { rows: [] };
  return {
    simplifiedNoticeDismissed: Boolean(notice.rows[0]),
    configurations,
    activeConfiguration:
      configurations.find((item) => item.activationStatus === "active") || null,
    upcomingConfigurations: configurations
      .filter((item) => item.activationStatus === "scheduled")
      .sort((left, right) =>
        String(left.startAt || "").localeCompare(String(right.startAt || ""))
      ),
    packLibrary,
    assetLibrary,
    history,
    activeSnapshot: snapshots.activeSnapshot,
    previousPublicSnapshot: snapshots.previousPublicSnapshot,
    latestPreviewSnapshots: snapshots.latestPreviewSnapshots,
    permissions: { canEdit, canActivate, readOnly }
  };
}

async function configurationForUpdate(
  query: Parameters<Parameters<typeof withDbTransaction>[0]>[0],
  configurationId: string
) {
  const rows = await query<ConfigRow>(
    "select *, null::text as updated_by_name from festival_studio_configurations where id = $1 for update",
    [configurationId]
  );
  if (!rows[0]) throw badRequest("The festival configuration was not found.");
  return rows[0];
}

async function writeVersion(
  query: Parameters<Parameters<typeof withDbTransaction>[0]>[0],
  configurationId: string,
  actorId: string,
  action: string
) {
  await query(`
    insert into festival_studio_configuration_versions (
      configuration_id, version, version_state,
      configuration_snapshot, action, changed_by
    )
    select
      id, version,
      case activation_status
        when 'incomplete' then 'draft'
        else activation_status
      end,
      to_jsonb(festival_studio_configurations),
      $3,
      $2
    from festival_studio_configurations
    where id = $1
    on conflict (configuration_id, version) do update set
      version_state = excluded.version_state,
      configuration_snapshot = excluded.configuration_snapshot,
      action = excluded.action,
      changed_by = excluded.changed_by,
      created_at = now()
  `, [configurationId, actorId, action]);
}

async function assertCanonicalPackOwnership(
  query: Parameters<Parameters<typeof withDbTransaction>[0]>[0],
  configuration: ConfigRow,
  pack: CanonicalPack
) {
  const groups = await query<{ id: string; festival_name: string }>(`
    select id, festival_name from festival_hero_groups
    where festival_slug = $1 limit 1
  `, [pack.festivalSlug]);
  const owner = groups[0];
  if (!owner || !configuration.festival_group_id || owner.id !== configuration.festival_group_id) {
    throw badRequest(
      owner
        ? `Expected ${configuration.festival_name}; selected design belongs to ${owner.festival_name}.`
        : "The selected design has no canonical festival ownership."
    );
  }
}

type TransactionQuery = Parameters<Parameters<typeof withDbTransaction>[0]>[0];

function governedScenePlacement(
  region: keyof HolidayExperienceStudioConfig["regions"]
): FestivalAssetPlacement | null {
  if (region === "navigation_rail") return "header_decoration_rail";
  if (region === "axo_area") return "axo_theme_reference";
  if (region === "footer_decoration" || region === "section_dividers") {
    return "footer_accent";
  }
  if (region === "floating_edges") return "inner_page_accent";
  return null;
}

async function ensureGovernedSceneAssignments({
  studio,
  themeId,
  actorId,
  query
}: {
  studio: HolidayExperienceStudioConfig;
  themeId: string;
  actorId: string;
  query: TransactionQuery;
}) {
  for (const assignment of studio.motifAssignments) {
    if (
      !assignment.enabled ||
      !studio.regions[assignment.region]?.enabled ||
      !assignment.assetVersionId ||
      !assignment.libraryAssetId
    ) {
      continue;
    }
    const placement = governedScenePlacement(assignment.region);
    if (!placement) continue;

    const activated = await query<{ id: string }>(`
      update festival_asset_assignments
      set state='active',removed_by=null,removed_at=null,
          removal_reason=null,updated_at=now()
      where library_asset_id=$1 and asset_version_id=$2 and theme_id=$3
        and placement=$4 and state='pending_approval'
      returning id
    `, [
      assignment.libraryAssetId,
      assignment.assetVersionId,
      themeId,
      placement
    ]);
    const inserted = activated[0]
      ? []
      : await query<{ id: string }>(`
          insert into festival_asset_assignments (
            library_asset_id,asset_version_id,theme_id,placement,
            state,assigned_by,assigned_at
          )
          select asset.library_asset_id,asset.id,$3,$4,'active',$5,now()
          from holiday_theme_assets asset
          join festival_asset_library library on library.id=asset.library_asset_id
          where asset.id=$2 and asset.library_asset_id=$1
            and asset.review_status='approved'
            and asset.quality_status in ('approved','approved_with_size_restrictions')
            and library.approval_state='approved'
            and library.lifecycle_state='active'
            and not exists (
              select 1 from festival_asset_assignments existing
              where existing.library_asset_id=$1 and existing.asset_version_id=$2
                and existing.theme_id=$3 and existing.placement=$4
                and existing.state='active'
            )
          returning id
        `, [
          assignment.libraryAssetId,
          assignment.assetVersionId,
          themeId,
          placement,
          actorId
        ]);
    const assignmentId = activated[0]?.id || inserted[0]?.id;
    if (assignmentId) {
      await query(`
        insert into festival_asset_audit (
          library_asset_id,asset_version_id,assignment_id,
          actor_admin_user_id,action,safe_metadata
        ) values ($1,$2,$3,$4,'scene_assignment_enabled',$5::jsonb)
      `, [
        assignment.libraryAssetId,
        assignment.assetVersionId,
        assignmentId,
        actorId,
        JSON.stringify({
          themeId,
          placement,
          region: assignment.region,
          publicActivation: false
        })
      ]);
    }
  }
}

type CanonicalPackFile = {
  fileId: string;
  assetId: string;
  libraryAssetId: string | null;
  safeFileName: string;
  mimeType: string;
  versionNumber: number;
  checksumSha256: string | null;
  responsiveVariant: string;
  packAssetKey: string | null;
  approvedMappings: Array<{ location: string; variant: string }>;
};

type CanonicalPack = {
  id: string;
  themeId: string;
  festivalSlug: string;
  festivalName: string;
  variantSlug: string;
  variantName: string;
  variantVersion: number;
  state: string;
  packageMode: string;
  sourceManifest: Record<string, unknown>;
  files: CanonicalPackFile[];
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function configurationHash(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

const scenePresentations: Partial<Record<keyof HolidayExperienceStudioConfig["regions"], string[]>> = {
  navigation_rail: ["garland", "toran", "border", "corner", "cluster"],
  footer_decoration: ["border", "cluster", "scene", "single", "corner"],
  section_dividers: ["border", "garland", "toran", "cluster", "single", "corner"],
  floating_edges: ["single", "cluster", "corner", "overlay", "scene"],
  axo_area: ["axo"]
};

async function validateCanonicalScene(
  value: unknown,
  festivalSlug: string,
  religiousArtworkConfirmed = false,
  query: TransactionQuery
): Promise<HolidayExperienceStudioConfig> {
  const parsed = studioSchema.safeParse(value);
  if (!parsed.success) {
    throw badRequest("The festival scene is invalid. Save the Recommended Setup and preview again.");
  }
  const studio = normalizeFestivalStudioScene(
    parsed.data as HolidayExperienceStudioConfig
  );
  const governedVersionIds = [
    ...new Set(
      studio.motifAssignments.flatMap((assignment) =>
        assignment.assetVersionId ? [assignment.assetVersionId] : []
      )
    )
  ];
  const governedRows = governedVersionIds.length > 0
    ? await query<{
        id: string;
        library_asset_id: string;
        theme_id: string;
        review_status: string;
        quality_status: string;
        intended_festival: string | null;
        asset_category: string | null;
        asset_metadata: Record<string, unknown> | null;
        library_approval_state: string;
        library_lifecycle_state: string;
      }>(`
        select asset.id,asset.library_asset_id,asset.theme_id,
          asset.review_status,asset.quality_status,asset.intended_festival,
          asset.asset_category,asset.asset_metadata,
          library.approval_state library_approval_state,
          library.lifecycle_state library_lifecycle_state
        from holiday_theme_assets asset
        join festival_asset_library library on library.id=asset.library_asset_id
        where asset.id=any($1::uuid[])
        group by asset.id,asset.library_asset_id,asset.theme_id,
          asset.review_status,asset.quality_status,asset.intended_festival,
          asset.asset_category,asset.asset_metadata,
          library.approval_state,library.lifecycle_state
      `, [governedVersionIds])
    : [];
  const governedByVersion = new Map(
    governedRows.map((row) => [row.id, row])
  );
  for (const assignment of studio.motifAssignments) {
    if (!assignment.enabled || !studio.regions[assignment.region]?.enabled) continue;
    const syntheticAxo = assignment.assetId === `festival-axo-${festivalSlug}`;
    const motif = FESTIVAL_MOTIF_LIBRARY.find(
      (candidate) => candidate.id === assignment.assetId
    );
    const governed = assignment.assetVersionId
      ? governedByVersion.get(assignment.assetVersionId)
      : null;
    if (assignment.decorationPackId) {
      const completePack = decorationPackById(
        assignment.decorationPackId,
        assignment.decorationPackVersion
      );
      if (
        !completePack ||
        completePack.approvalState !== "approved" ||
        !decorationPackSupportsFestival(completePack, festivalSlug) ||
        !isDecorationPackComponentValid(completePack, assignment)
      ) {
        throw badRequest(
          `The complete decoration pack for ${assignment.region.replaceAll("_", " ")} is invalid or belongs to another festival.`
        );
      }
    }
    if (!motif && !syntheticAxo && !governed) {
      throw badRequest(`The ${assignment.region.replaceAll("_", " ")} asset is no longer approved. Choose another asset and preview again.`);
    }
    if (governed) {
      if (
        assignment.libraryAssetId !== governed.library_asset_id ||
        assignment.assetId !== `governed-${governed.id.replaceAll("-", "")}` ||
        governed.review_status !== "approved" ||
        !["approved", "approved_with_size_restrictions"].includes(governed.quality_status) ||
        governed.library_approval_state !== "approved" ||
        governed.library_lifecycle_state !== "active" ||
        ![festivalSlug, "shared"].includes(governed.intended_festival || "")
      ) {
        throw badRequest("The governed asset version is not approved for this festival draft.");
      }
      const compatibleCategories: Partial<Record<keyof HolidayExperienceStudioConfig["regions"], string[]>> = {
        navigation_rail: ["header"],
        footer_decoration: ["ground"],
        section_dividers: ["ground"],
        page_ambience: ["ambient"],
        floating_edges: ["feature", "ground", "header"],
        axo_area: ["axo"]
      };
      const categories = compatibleCategories[assignment.region];
      if (categories && !categories.includes(governed.asset_category || "")) {
        throw badRequest("The governed asset category is incompatible with the selected website region.");
      }
      const supportedMotions = Array.isArray(governed.asset_metadata?.supportedMotions)
        ? governed.asset_metadata.supportedMotions.filter(
            (motion): motion is string => typeof motion === "string"
          )
        : governed.asset_category === "axo"
          ? ["static", "axo_interaction"]
          : ["static", "gentle_wind"];
      if (!supportedMotions.includes(assignment.motion)) {
        throw badRequest("The governed asset does not support the selected motion.");
      }
      if (governed.asset_category === "axo") {
        const reviewMetadata = governed.asset_metadata?.reviewMetadata;
        if (reviewMetadata && typeof reviewMetadata === "object") {
          const axoPlacement = (reviewMetadata as Record<string, unknown>).axoPlacement;
          if (axoPlacement && typeof axoPlacement === "object") {
            assignment.axoPlacement = axoPlacement as HolidayStudioMotifAssignment["axoPlacement"];
          }
        }
      }
      continue;
    }
    if (!motif) continue;
    if (!['approved', 'approved_with_size_restrictions'].includes(motif.qualityStatus)) {
      throw badRequest(`${motif.name} is no longer approved. Choose another asset and preview again.`);
    }
    if (!decorationAssetFestivalSlugs(festivalSlug).some((slug) =>
      motif.intendedFestivals.includes(slug)
    )) {
      throw badRequest(`${motif.name} is not approved for ${festivalSlug.replaceAll("-", " ")}.`);
    }
    const allowedPresentations = scenePresentations[assignment.region];
    if (allowedPresentations && !allowedPresentations.includes(motif.presentation)) {
      throw badRequest(`${motif.name} is incompatible with the ${assignment.region.replaceAll("_", " ")} region.`);
    }
    if (
      motif.religiousApprovalRequired &&
      !religiousArtworkConfirmed &&
      (!studio.religiousArtworkApproved || !assignment.religiousArtworkApproved)
    ) {
      throw badRequest(`${motif.name} requires religious-artwork approval before activation.`);
    }
    if (
      assignment.motion !== "static" &&
      !motif.supportedMotions.includes(assignment.motion)
    ) {
      throw badRequest(`${motif.name} does not support the selected motion. Choose a compatible effect and preview again.`);
    }
  }
  return studio;
}

function mappingMatchesSurface(
  mapping: { location: string; variant: string },
  surface: FestivalHeroSurface
) {
  if (surface === "websiteHero") return mapping.location === "homepage_hero";
  if (surface === "clientLoginHero") {
    return ["client_login_hero", "client_login_background"].includes(
      mapping.location
    );
  }
  return ["employee_login_hero", "employee_login_background"].includes(
    mapping.location
  );
}

function packAssetsBySurface(pack: CanonicalPack) {
  return Object.fromEntries(
    FESTIVAL_HERO_SURFACES.map((surface) => [
      surface,
      pack.files.filter((file) =>
        file.approvedMappings.some((mapping) =>
          mappingMatchesSurface(mapping, surface)
        )
      )
    ])
  ) as Record<FestivalHeroSurface, CanonicalPackFile[]>;
}

const responsivePreference = [
  "desktop",
  "wide",
  "ultrawide",
  "four_three",
  "default",
  "tablet",
  "mobile"
];

function primaryAssetForSurface(files: CanonicalPackFile[]) {
  return [...files].sort((left, right) => {
    const leftRank = responsivePreference.indexOf(left.responsiveVariant);
    const rightRank = responsivePreference.indexOf(right.responsiveVariant);
    return (leftRank < 0 ? 99 : leftRank) - (rightRank < 0 ? 99 : rightRank);
  })[0] || null;
}

async function canonicalPackForUpdate(query: TransactionQuery, packId: string) {
  const rows = await query<{
    id: string;
    theme_id: string;
    state: string;
    package_mode: string;
    package_version: number | string;
    manifest_json: Record<string, unknown> | null;
    theme_slug: string;
    theme_name: string;
    files: Array<{
      fileId: string;
      assetId: string;
      libraryAssetId: string | null;
      safeFileName: string;
      mimeType: string;
      versionNumber: number | string;
      checksumSha256: string | null;
      responsiveVariant: string;
      packAssetKey: string | null;
      approvedMappings: Array<{ location: string; variant: string }>;
    }>;
  }>(`
    select pack.id, pack.theme_id, pack.state, pack.package_mode,
      pack.package_version, pack.manifest_json, theme.slug as theme_slug,
      theme.name as theme_name,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'fileId', file.id,
          'assetId', asset.id,
          'libraryAssetId', asset.library_asset_id,
          'safeFileName', asset.safe_file_name,
          'mimeType', asset.mime_type,
          'versionNumber', asset.version_number,
          'checksumSha256', asset.checksum_sha256,
          'responsiveVariant', file.responsive_variant,
          'packAssetKey', asset.asset_metadata->>'packAssetKey',
          'approvedMappings', file.approved_mappings
        ) order by file.archive_path)
        from festival_pack_files file
        join holiday_theme_assets asset on asset.id = file.asset_version_id
        left join festival_asset_library library on library.id = asset.library_asset_id
        where file.pack_id = pack.id
          and file.inspection_status = 'validated'
          and file.file_kind = 'image'
          and jsonb_array_length(file.approved_mappings) > 0
          and asset.review_status = 'approved'
          and asset.quality_status in ('approved','approved_with_size_restrictions')
          and asset.status not in ('archived')
          and coalesce(library.lifecycle_state, 'active') not in
            ('trash','deletion_pending','deleted')
          and coalesce(library.approval_state, 'approved') = 'approved'
          and coalesce(asset.asset_metadata->>'embeddedUiState','no_embedded_ui')
            <> 'contains_embedded_ui'
      ), '[]'::jsonb) as files
    from festival_pack_imports pack
    join holiday_themes theme on theme.id = pack.theme_id
    where pack.id = $1
    for update of pack
  `, [packId]);
  const row = rows[0];
  if (!row || !["approved", "active", "previous", "scheduled"].includes(row.state)) {
    throw badRequest("Choose an approved festival design before preview or activation.");
  }
  const manifest = row.manifest_json || {};
  // Legacy designer packs predate manifest festival metadata. Their immutable
  // holiday_themes relationship is the canonical, safe fallback mapping.
  const festivalSlug = String(manifest.festivalSlug || row.theme_slug).trim();
  const variantSlug = String(manifest.variantSlug || "default").trim();
  const variantName = String(manifest.variantName || "Default Variant").trim();
  if (!festivalSlug) throw badRequest("The selected pack has no festival mapping.");
  return {
    id: row.id,
    themeId: row.theme_id,
    festivalSlug,
    festivalName: String(manifest.festivalName || row.theme_name).trim(),
    variantSlug,
    variantName,
    variantVersion: Number(row.package_version),
    state: row.state,
    packageMode: row.package_mode,
    sourceManifest: manifest,
    files: (row.files || []).map((file) => ({
      ...file,
      versionNumber: Number(file.versionNumber),
      approvedMappings: file.approvedMappings || []
    }))
  } satisfies CanonicalPack;
}

function canonicalDraftPayload({
  configuration,
  pack,
  assetsBySurface,
  studio
}: {
  configuration: ConfigRow;
  pack: CanonicalPack;
  assetsBySurface: Record<FestivalHeroSurface, CanonicalPackFile[]>;
  studio: HolidayExperienceStudioConfig;
}) {
  const canonicalStudio = normalizeFestivalStudioScene(studio);
  const assetAssignments = canonicalStudio.motifAssignments.map(
    (assignment) => ({
      assignmentId: assignment.id,
      assetId: assignment.assetId,
      assetVersionId: assignment.assetVersionId || null,
      libraryAssetId: assignment.libraryAssetId || null,
      sourceMode: assignment.sourceMode,
      region: assignment.region,
      enabled: assignment.enabled,
      publicWebsite: assignment.enabled,
      visibility: assignment.visibility,
      motion: assignment.motion,
      layer: assignment.layer,
      decorationPackId: assignment.decorationPackId || null,
      decorationPackVersion: assignment.decorationPackVersion || null,
      decorationComponentId: assignment.decorationComponentId || null,
      decorationComponentVersion: assignment.decorationComponentVersion || null,
      decorationType: assignment.decorationType || null,
      componentSlot: assignment.componentSlot || null,
      axoPlacement: assignment.axoPlacement || null
    })
  );
  const legacyAssignments = Object.fromEntries(
    Object.entries(slotColumns).map(([slot, column]) => [
      slot,
      {
        assetId: configuration[column as keyof ConfigRow] || null,
        state: "legacy_inactive",
        runtimePriority: false
      }
    ])
  );
  return {
    festivalSlug: configuration.festival_slug,
    festivalName: configuration.festival_name,
    selectedVariantPackId: pack.id,
    selectedVariantSlug: pack.variantSlug,
    selectedVariantVersion: pack.variantVersion,
    targetSurfaces: {
      websiteHero: configuration.website_enabled,
      clientLoginHero: configuration.client_login_enabled,
      employeeLoginHero: configuration.employee_login_enabled,
      header: configuration.website_enabled,
      axo: configuration.axo_enabled,
      sound: configuration.sound_enabled
    },
    packDefaults: assetsBySurface,
    assetAssignments,
    customOverrides: {
      sceneConfiguration: canonicalStudio,
      legacyAssignments
    },
    behaviorSettings: {
      websiteEnabled: configuration.website_enabled,
      clientLoginEnabled: configuration.client_login_enabled,
      employeeLoginEnabled: configuration.employee_login_enabled,
      axoEnabled: configuration.axo_enabled,
      soundEnabled: configuration.sound_enabled
    },
    motionSettings: configuration.motion_config || {},
    scheduleSettings: {
      startAt: iso(configuration.start_at),
      endAt: iso(configuration.end_at),
      repeatYearly: configuration.repeat_yearly
    },
    appearanceSettings: {
      fullCanvasArtwork: true,
      uniformPageOverlay: true,
      artworkBlur: false,
      realLoginForms: 1
    },
    mobileSettings: {
      artDirected: true,
      safeFallback: "default_writex"
    }
  };
}

export async function dismissFestivalStudioSimplifiedNotice(adminUserId: string) {
  await dbQuery(
    `insert into admin_feature_notice_state (admin_user_id,notice_key,dismissed_at)
     values ($1,'festival-studio-simplified-v2',now())
     on conflict (admin_user_id,notice_key) do update set dismissed_at=excluded.dismissed_at`,
    [adminUserId]
  );
}

async function upsertCanonicalManifestAndDraft({
  query,
  configuration,
  pack,
  actorId
}: {
  query: TransactionQuery;
  configuration: ConfigRow;
  pack: CanonicalPack;
  actorId: string;
}) {
  const assetsBySurface = packAssetsBySurface(pack);
  const studioRows = await query<{ studio: HolidayExperienceStudioConfig | null }>(`
    select experience_config->'studio' as studio
    from holiday_themes where id = $1
  `, [configuration.theme_id]);
  const studio = studioRows[0]?.studio || DEFAULT_EXPERIENCE_PACK.studio;
  const assetManifest = {
    surfaces: assetsBySurface,
    supportedAssetTypes: [
      "client_login_canvas",
      "employee_login_canvas",
      "shared_login_canvas",
      "client_login_mobile_canvas",
      "employee_login_mobile_canvas",
      "form_decorative_overlay",
      "website_hero",
      "website_background",
      "header_decoration",
      "footer_decoration",
      "announcement_banner",
      "inner_page_motif",
      "axo_character",
      "axo_costume",
      "axo_prop",
      "axo_motion",
      "garland",
      "bell",
      "diya",
      "lantern",
      "flower",
      "mandala",
      "cultural_symbol",
      "decorative_pattern",
      "sound",
      "motion_preset",
      "desktop_fallback",
      "tablet_fallback",
      "mobile_fallback",
      "light_variant",
      "dark_variant",
      "reduced_motion_variant"
    ]
  };
  const manifestHash = configurationHash({
    festivalSlug: pack.festivalSlug,
    variantSlug: pack.variantSlug,
    variantVersion: pack.variantVersion,
    assetManifest
  });
  await query(`
    insert into festival_variant_manifests (
      pack_id, festival_slug, variant_slug, variant_name, variant_version,
      approval_status, source_type, asset_manifest, source_manifest,
      configuration_hash
    ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10)
    on conflict (pack_id) do update set
      festival_slug = excluded.festival_slug,
      variant_slug = excluded.variant_slug,
      variant_name = excluded.variant_name,
      variant_version = excluded.variant_version,
      approval_status = excluded.approval_status,
      source_type = excluded.source_type,
      asset_manifest = excluded.asset_manifest,
      source_manifest = excluded.source_manifest,
      configuration_hash = excluded.configuration_hash,
      updated_at = now()
  `, [
    pack.id,
    pack.festivalSlug,
    pack.variantSlug,
    pack.variantName,
    pack.variantVersion,
    pack.state === "active" ? "active" : pack.state === "previous" ? "previous" : pack.state === "scheduled" ? "scheduled" : "approved",
    pack.packageMode,
    JSON.stringify(assetManifest),
    JSON.stringify(pack.sourceManifest),
    manifestHash
  ]);
  const draftPayload = canonicalDraftPayload({
    configuration,
    pack,
    assetsBySurface,
    studio
  });
  const draftHash = configurationHash(draftPayload);
  const rows = await query<{ id: string; draft_version: number | string }>(`
    insert into festival_draft_configurations (
      configuration_id, festival_slug, selected_variant_pack_id,
      selected_variant_slug, selected_variant_version, target_surfaces,
      asset_assignments, pack_defaults, custom_overrides, behavior_settings,
      login_settings, axo_settings, sound_settings, motion_settings,
      schedule_settings, appearance_settings, mobile_settings, draft_version,
      configuration_hash, updated_by
    ) values (
      $1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,
      $11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,
      $17::jsonb,$18,$19,$20
    )
    on conflict (configuration_id) do update set
      festival_slug = excluded.festival_slug,
      selected_variant_pack_id = excluded.selected_variant_pack_id,
      selected_variant_slug = excluded.selected_variant_slug,
      selected_variant_version = excluded.selected_variant_version,
      target_surfaces = excluded.target_surfaces,
      asset_assignments = excluded.asset_assignments,
      pack_defaults = excluded.pack_defaults,
      custom_overrides = excluded.custom_overrides,
      behavior_settings = excluded.behavior_settings,
      login_settings = excluded.login_settings,
      axo_settings = excluded.axo_settings,
      sound_settings = excluded.sound_settings,
      motion_settings = excluded.motion_settings,
      schedule_settings = excluded.schedule_settings,
      appearance_settings = excluded.appearance_settings,
      mobile_settings = excluded.mobile_settings,
      draft_version = festival_draft_configurations.draft_version + 1,
      configuration_hash = excluded.configuration_hash,
      updated_by = excluded.updated_by,
      updated_at = now()
    returning id, draft_version
  `, [
    configuration.id,
    configuration.festival_slug,
    pack.id,
    pack.variantSlug,
    pack.variantVersion,
    JSON.stringify(draftPayload.targetSurfaces),
    JSON.stringify(draftPayload.assetAssignments),
    JSON.stringify(draftPayload.packDefaults),
    JSON.stringify(draftPayload.customOverrides),
    JSON.stringify(draftPayload.behaviorSettings),
    JSON.stringify({
      fullCanvasArtwork: true,
      clientLoginEnabled: configuration.client_login_enabled,
      employeeLoginEnabled: configuration.employee_login_enabled
    }),
    JSON.stringify({ enabled: configuration.axo_enabled }),
    JSON.stringify({ enabled: configuration.sound_enabled }),
    JSON.stringify(draftPayload.motionSettings),
    JSON.stringify(draftPayload.scheduleSettings),
    JSON.stringify(draftPayload.appearanceSettings),
    JSON.stringify(draftPayload.mobileSettings),
    Math.max(1, Number(configuration.version)),
    draftHash,
    actorId
  ]);
  return {
    draftId: rows[0].id,
    draftVersion: Number(rows[0].draft_version),
    draftHash,
    assetsBySurface,
    draftPayload
  };
}

async function refreshCanonicalDraftRecord(
  configurationId: string,
  actorId: string
) {
  return withDbTransaction(async (query) => {
    const configuration = await configurationForUpdate(query, configurationId);
    if (!configuration.selected_variant_pack_id) return null;
    const pack = await canonicalPackForUpdate(
      query,
      configuration.selected_variant_pack_id
    );
    return upsertCanonicalManifestAndDraft({
      query,
      configuration,
      pack,
      actorId
    });
  });
}

function validateHeroSurfaces(values: FestivalHeroSurface[]) {
  const surfaces = [...new Set(values)].filter((value) =>
    FESTIVAL_HERO_SURFACES.includes(value)
  );
  if (surfaces.length === 0) throw badRequest("Choose at least one Hero surface.");
  return surfaces;
}

export async function createFestivalStudioPreviewSnapshot({
  configurationId,
  selectedVariantPackId,
  targetSurfaces,
  actorId
}: {
  configurationId: string;
  selectedVariantPackId: string;
  targetSurfaces: FestivalHeroSurface[];
  actorId: string;
}) {
  const surfaces = validateHeroSurfaces(targetSurfaces);
  return withDbTransaction(async (query) => {
    const configuration = await configurationForUpdate(query, configurationId);
    const pack = await canonicalPackForUpdate(query, selectedVariantPackId);
    await assertCanonicalPackOwnership(query, configuration, pack);
    const assetsBySurface = packAssetsBySurface(pack);
    for (const surface of surfaces) {
      if (assetsBySurface[surface].length === 0) {
        throw badRequest(
          `${pack.variantName} has no approved ${surface.replaceAll(/([A-Z])/g, " $1").toLowerCase()} asset. Choose another surface or map a compatible asset first.`
        );
      }
    }
    const changed =
      configuration.selected_variant_pack_id !== pack.id ||
      configuration.theme_id !== pack.themeId ||
      configuration.selected_variant_slug !== pack.variantSlug;
    if (changed) {
      await query(`
        update festival_studio_configurations
        set theme_id = $2, selected_variant_pack_id = $3,
            selected_variant_slug = $4, activation_status = case
              when activation_status in ('active','scheduled') then activation_status
              else 'ready'
            end,
            version = version + 1, updated_by = $5, updated_at = now()
        where id = $1
      `, [configurationId, pack.themeId, pack.id, pack.variantSlug, actorId]);
      configuration.theme_id = pack.themeId;
      configuration.selected_variant_pack_id = pack.id;
      configuration.selected_variant_slug = pack.variantSlug;
      configuration.version = Number(configuration.version) + 1;
    }
    const canonical = await upsertCanonicalManifestAndDraft({
      query,
      configuration,
      pack,
      actorId
    });
    const sceneConfiguration = await validateCanonicalScene(
      canonical.draftPayload.customOverrides.sceneConfiguration,
      configuration.festival_slug,
      false,
      query
    );
    const canonicalSceneState = sceneSurfaceState(sceneConfiguration);
    const surfaceAssets = Object.fromEntries(
      surfaces.map((surface) => [surface, assetsBySurface[surface]])
    );
    const snapshotPayload = {
      schemaVersion: 2,
      festivalId: configuration.festival_group_id,
      festivalSlug: configuration.festival_slug,
      festivalName: configuration.festival_name,
      variantId: pack.variantSlug,
      variantName: pack.variantName,
      variantVersion: pack.variantVersion,
      sourcePackId: pack.id,
      draftId: canonical.draftId,
      draftVersion: canonical.draftVersion,
      draftHash: canonical.draftHash,
      targetSurfaces: surfaces,
      surfaceAssets,
      surfaceState: Object.fromEntries(
        surfaces.map((surface) => [surface, {
          packId: pack.id,
          variantSlug: pack.variantSlug,
          variantName: pack.variantName,
          variantVersion: pack.variantVersion
        }])
      ),
      customOverrides: {
        ...canonical.draftPayload.customOverrides,
        sceneConfiguration
      },
      sceneState: canonicalSceneState,
      behaviorSettings: canonical.draftPayload.behaviorSettings,
      motionSettings: canonical.draftPayload.motionSettings,
      scheduleSettings: canonical.draftPayload.scheduleSettings,
      appearanceSettings: canonical.draftPayload.appearanceSettings,
      mobileSettings: canonical.draftPayload.mobileSettings
    };
    const snapshotHash = configurationHash(snapshotPayload);
    const assetVersions = Object.fromEntries(
      surfaces.map((surface) => [
        surface,
        assetsBySurface[surface].map((asset) => ({
          assetId: asset.assetId,
          versionNumber: asset.versionNumber,
          checksumSha256: asset.checksumSha256,
          responsiveVariant: asset.responsiveVariant,
          packAssetKey: asset.packAssetKey
        }))
      ])
    );
    const snapshots = await query<{ id: string; created_at: Date | string; expires_at: Date | string }>(`
      insert into festival_preview_snapshots (
        configuration_id, draft_id, festival_slug, variant_pack_id,
        variant_slug, variant_name, variant_version, target_surfaces,
        asset_versions, snapshot_payload, configuration_hash, created_by,
        expires_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8::text[],$9::jsonb,$10::jsonb,$11,$12,
        now() + interval '60 minutes'
      )
      returning id, created_at, expires_at
    `, [
      configurationId,
      canonical.draftId,
      configuration.festival_slug,
      pack.id,
      pack.variantSlug,
      pack.variantName,
      pack.variantVersion,
      surfaces,
      JSON.stringify(assetVersions),
      JSON.stringify(snapshotPayload),
      snapshotHash,
      actorId
    ]);
    await writeVersion(query, configurationId, actorId, "exact_preview_created");
    const row = snapshots[0];
    return {
      themeId: pack.themeId,
      packId: pack.id,
      snapshotId: row.id,
      configurationHash: snapshotHash,
      festivalSlug: configuration.festival_slug,
      festivalName: configuration.festival_name,
      variantSlug: pack.variantSlug,
      variantName: pack.variantName,
      variantVersion: pack.variantVersion,
      targetSurfaces: surfaces,
      createdAt: new Date(row.created_at).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString()
    };
  });
}

export async function activateFestivalPreviewSnapshot({
  previewSnapshotId,
  targetSurfaces,
  actorId,
  allowExpiredSnapshot = false,
  religiousArtworkConfirmed = false
}: {
  previewSnapshotId: string;
  targetSurfaces: FestivalHeroSurface[];
  actorId: string;
  allowExpiredSnapshot?: boolean;
  religiousArtworkConfirmed?: boolean;
}) {
  const requestedSurfaces = validateHeroSurfaces(targetSurfaces);
  return withDbTransaction(async (query) => {
    const previewRows = await query<{
      id: string;
      configuration_id: string;
      festival_slug: string;
      variant_pack_id: string;
      variant_slug: string;
      variant_name: string;
      variant_version: number | string;
      target_surfaces: string[];
      snapshot_payload: {
        festivalName: string;
        draftId: string;
        draftVersion: number;
        draftHash: string;
        surfaceAssets: Partial<Record<FestivalHeroSurface, CanonicalPackFile[]>>;
        customOverrides: {
          sceneConfiguration?: HolidayExperienceStudioConfig;
          [key: string]: unknown;
        };
        behaviorSettings?: {
          soundEnabled?: boolean;
        };
      };
      configuration_hash: string;
      expires_at: Date | string;
    }>(`
      select * from festival_preview_snapshots where id = $1 for update
    `, [previewSnapshotId]);
    const preview = previewRows[0];
    if (
      !preview ||
      (!allowExpiredSnapshot && new Date(preview.expires_at) <= new Date())
    ) {
      throw badRequest("The exact preview has expired. Refresh Preview before activation.");
    }
    const previewSurfaces = safeHeroSurfaces(preview.target_surfaces || []);
    if (requestedSurfaces.some((surface) => !previewSurfaces.includes(surface))) {
      throw badRequest("Activation surfaces must match the reviewed Preview Snapshot.");
    }
    const configuration = await configurationForUpdate(
      query,
      preview.configuration_id
    );
    if (
      configuration.selected_variant_pack_id !== preview.variant_pack_id ||
      configuration.selected_variant_slug !== preview.variant_slug
    ) {
      throw badRequest("The selected design changed after preview. Refresh Preview before activation.");
    }
    if (!configuration.theme_id) {
      throw badRequest("The selected festival configuration has no active theme mapping.");
    }
    const draftRows = await query<{
      id: string;
      draft_version: number | string;
      configuration_hash: string;
    }>(`
      select id, draft_version, configuration_hash
      from festival_draft_configurations
      where configuration_id = $1
      for update
    `, [preview.configuration_id]);
    const currentDraft = draftRows[0];
    if (
      !currentDraft ||
      currentDraft.id !== preview.snapshot_payload.draftId ||
      Number(currentDraft.draft_version) !== Number(preview.snapshot_payload.draftVersion) ||
      currentDraft.configuration_hash !== preview.snapshot_payload.draftHash
    ) {
      throw badRequest("The draft changed after preview. Refresh Preview before activation.");
    }
    const reviewedScene = await validateCanonicalScene(
      preview.snapshot_payload.customOverrides?.sceneConfiguration,
      preview.festival_slug,
      religiousArtworkConfirmed,
      query
    );
    const activeScene = religiousArtworkConfirmed
      ? {
          ...reviewedScene,
          religiousArtworkApproved: true,
          motifAssignments: reviewedScene.motifAssignments.map((assignment) => ({
            ...assignment,
            religiousArtworkApproved: true
          }))
        }
      : reviewedScene;
    const canonicalSceneState = sceneSurfaceState(activeScene);
    const pack = await canonicalPackForUpdate(query, preview.variant_pack_id);
    const currentRows = await query<{
      id: string;
      festival_slug: string;
      snapshot_payload: {
        surfaceState?: FestivalSnapshotSummary["surfaceVariants"];
        surfaceAssets?: Partial<Record<FestivalHeroSurface, CanonicalPackFile[]>>;
      };
    }>(`
      select id, festival_slug, snapshot_payload
      from active_festival_snapshots where state = 'active' for update
    `);
    const current = currentRows[0] || null;
    const preservedSurfaceState =
      current?.festival_slug === preview.festival_slug
        ? { ...(current.snapshot_payload?.surfaceState || {}) }
        : {};
    const preservedSurfaceAssets =
      current?.festival_slug === preview.festival_slug
        ? { ...(current.snapshot_payload?.surfaceAssets || {}) }
        : {};
    for (const surface of requestedSurfaces) {
      preservedSurfaceState[surface] = {
        packId: pack.id,
        variantSlug: pack.variantSlug,
        variantName: pack.variantName,
        variantVersion: pack.variantVersion
      };
      preservedSurfaceAssets[surface] =
        preview.snapshot_payload.surfaceAssets[surface] || [];
    }
    const allSurfaces = Object.keys(
      preservedSurfaceState
    ) as FestivalHeroSurface[];
    const activePayload = {
      ...preview.snapshot_payload,
      customOverrides: {
        ...preview.snapshot_payload.customOverrides,
        sceneConfiguration: activeScene
      },
      sceneState: canonicalSceneState,
      sourcePreviewSnapshotId: preview.id,
      surfaceState: preservedSurfaceState,
      surfaceAssets: preservedSurfaceAssets,
      targetSurfaces: allSurfaces
    };
    const activeHash = configurationHash(activePayload);
    if (current) {
      await query(`
        update active_festival_snapshots
        set state = 'previous', deactivated_at = now(),
            deactivation_reason = 'Replaced by exact preview activation.'
        where id = $1
      `, [current.id]);
    }
    const activeRows = await query<{ id: string }>(`
      insert into active_festival_snapshots (
        preview_snapshot_id, configuration_id, festival_slug, festival_name,
        variant_pack_id, variant_slug, variant_name, variant_version,
        target_surfaces, snapshot_payload, configuration_hash,
        previous_snapshot_id, activated_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::text[],$10::jsonb,$11,$12,$13)
      returning id
    `, [
      preview.id,
      preview.configuration_id,
      preview.festival_slug,
      preview.snapshot_payload.festivalName || configuration.festival_name,
      preview.variant_pack_id,
      preview.variant_slug,
      preview.variant_name,
      Number(preview.variant_version),
      allSurfaces,
      JSON.stringify(activePayload),
      activeHash,
      current?.id || null,
      actorId
    ]);
    const surfacePackIds = Object.fromEntries(
      Object.entries(preservedSurfaceState).map(([surface, value]) => [
        surface,
        value?.packId || null
      ])
    );
    await query(`
      update holiday_themes
      set status = 'paused', updated_at = now()
      where status = 'active' and id <> $1
    `, [pack.themeId]);
    const websiteActive =
      canonicalSceneState.websiteEnabled || allSurfaces.includes("websiteHero");
    const clientLoginActive = allSurfaces.includes("clientLoginHero");
    const employeeLoginActive = allSurfaces.includes("employeeLoginHero");
    await query(`
      update holiday_themes
      set status = 'active', mode = 'manual', is_enabled = true,
          scope = case when $2 then 'entire_public' else 'login_screens' end,
          apply_to_homepage = $2,
          apply_to_header = $3,
          apply_to_footer = $4,
          apply_axo_theme = $5,
          apply_to_login_screens = $6 or $7,
          apply_to_client_login = $6,
          apply_to_employee_login = $7,
          animation_level = $8,
          active_festival_pack_id = case when $9 then $10::uuid else null end,
          experience_config = jsonb_set(
            jsonb_set(
              jsonb_set(
                coalesce(experience_config, '{}'::jsonb),
                '{activeSurfacePackIds}', $11::jsonb, true
              ),
              '{studio}', $12::jsonb, true
            ),
            '{sound,enabled}', to_jsonb($13::boolean), true
          ),
          activated_by = $14, updated_by = $14, updated_at = now()
      where id = $1
    `, [
      pack.themeId,
      websiteActive,
      canonicalSceneState.headerEnabled,
      canonicalSceneState.groundEnabled,
      canonicalSceneState.axoEnabled,
      clientLoginActive,
      employeeLoginActive,
      canonicalSceneState.motionLevel,
      allSurfaces.includes("websiteHero"),
      pack.id,
      JSON.stringify(surfacePackIds),
      JSON.stringify(activeScene),
      Boolean(preview.snapshot_payload.behaviorSettings?.soundEnabled),
      actorId
    ]);
    for (const [surface, channel] of [
      ["clientLoginHero", "client"],
      ["employeeLoginHero", "employee"]
    ] as const) {
      if (!requestedSurfaces.includes(surface)) continue;
      await query(`
        update holiday_login_theme_settings
        set mode = 'holiday', state = 'theme_active', theme_id = $2,
            enabled = true, composition_config = $3::jsonb,
            version_number = version_number + 1,
            approval_state = 'approved', approved_at = now(),
            approved_by = $4, last_failure_code = null,
            last_changed_by = $4, updated_at = now()
        where channel = $1
      `, [
        channel,
        pack.themeId,
        JSON.stringify(festivalPackFullCanvasComposition(pack.id)),
        actorId
      ]);
    }
    const columnUpdates: Array<[FestivalHeroSurface, string]> = [
      ["clientLoginHero", "client_login_hero_asset_id"],
      ["employeeLoginHero", "employee_login_hero_asset_id"],
      ["websiteHero", "website_hero_asset_id"]
    ];
    for (const [surface, column] of columnUpdates) {
      if (!requestedSurfaces.includes(surface)) continue;
      const primary = primaryAssetForSurface(
        preview.snapshot_payload.surfaceAssets[surface] || []
      );
      if (!primary) throw badRequest(`The exact preview is missing ${surface}.`);
      await query(`
        update festival_studio_configurations
        set ${column} = $2, theme_id = $3, selected_variant_pack_id = $4,
            selected_variant_slug = $5, activation_status = 'active',
            version = version + 1, activated_at = now(), activated_by = $6,
            updated_by = $6, updated_at = now()
        where id = $1
      `, [
        preview.configuration_id,
        primary.assetId,
        pack.themeId,
        pack.id,
        pack.variantSlug,
        actorId
      ]);
    }
    await query(`
      update festival_studio_configurations
      set activation_status = 'paused', updated_at = now()
      where activation_status = 'active' and id <> $1
    `, [preview.configuration_id]);
    await query(`
      update website_experience_settings
      set holiday_mode_enabled = true, emergency_disabled = false,
          active_theme_id = $1, manual_override_theme_id = $1,
          last_resolved_theme_id = $1, last_switched_at = now(),
          last_switched_by = $2, updated_at = now()
      where singleton_key = 'global'
    `, [pack.themeId, actorId]);
    if (requestedSurfaces.includes("websiteHero")) {
      await query(`
        update festival_pack_imports
        set state = 'previous', updated_at = now()
        where theme_id = $1 and state = 'active' and id <> $2
      `, [pack.themeId, pack.id]);
      await query(`
        update festival_pack_imports
        set state = 'active', activated_by = $2, activated_at = now(),
            updated_at = now()
        where id = $1
      `, [pack.id, actorId]);
    }
    await writeVersion(
      query,
      preview.configuration_id,
      actorId,
      `exact_preview_activated_${requestedSurfaces.join("_")}`
    );
    return {
      activeSnapshotId: activeRows[0].id,
      previousSnapshotId: current?.id || null,
      festivalName: preview.snapshot_payload.festivalName || configuration.festival_name,
      variantName: preview.variant_name,
      targetSurfaces: requestedSurfaces,
      configurationHash: activeHash
    };
  });
}

export async function restorePreviousFestivalHero({
  surface,
  actorId
}: {
  surface: FestivalHeroSurface;
  actorId: string;
}) {
  const result = await dbQuery<{
    preview_snapshot_id: string | null;
  }>(`
    select previous.preview_snapshot_id
    from active_festival_snapshots current
    join active_festival_snapshots previous
      on previous.id = current.previous_snapshot_id
    where current.state = 'active'
    limit 1
  `);
  const previewSnapshotId = result.rows[0]?.preview_snapshot_id;
  if (!previewSnapshotId) {
    throw badRequest("No exact previous Hero snapshot is available to restore.");
  }
  return activateFestivalPreviewSnapshot({
    previewSnapshotId,
    targetSurfaces: [surface],
    actorId,
    allowExpiredSnapshot: true,
    religiousArtworkConfirmed: true
  });
}

export async function restorePreviousPublicFestivalSnapshot(actorId: string) {
  return withDbTransaction(async (query) => {
    const currentRows = await query<ActiveSnapshotRow>(`
      select id, preview_snapshot_id, configuration_id, festival_slug,
        festival_name, variant_pack_id, variant_slug, variant_name,
        variant_version, target_surfaces, snapshot_payload, configuration_hash,
        previous_snapshot_id, activated_at
      from active_festival_snapshots
      where state = 'active'
      order by activated_at desc
      limit 1
      for update
    `);
    const current = currentRows[0];
    if (!current) {
      throw badRequest("No active festival is available to replace with its previous public theme.");
    }
    const previousRows = await query<ActiveSnapshotRow>(`
      select id, preview_snapshot_id, configuration_id, festival_slug,
        festival_name, variant_pack_id, variant_slug, variant_name,
        variant_version, target_surfaces, snapshot_payload, configuration_hash,
        previous_snapshot_id, activated_at
      from active_festival_snapshots
      where id <> $1
        and state in ('previous','disabled','rolled_back')
        and activated_at < $2
      order by case when id = $3::uuid then 0 else 1 end, activated_at desc
      limit 1
      for update
    `, [current.id, current.activated_at, current.previous_snapshot_id]);
    const previous = previousRows[0];
    if (!previous) {
      throw badRequest("No previous public festival snapshot is available to restore.");
    }
    const storedScene = studioSchema.safeParse(
      previous.snapshot_payload?.customOverrides?.sceneConfiguration
    );
    if (!storedScene.success) {
      throw badRequest("The previous public theme contains an invalid scene and cannot be restored safely.");
    }
    await validateCanonicalScene(
      storedScene.data as HolidayExperienceStudioConfig,
      previous.festival_slug,
      true,
      query
    );
    const pack = await canonicalPackForUpdate(query, previous.variant_pack_id);
    if (pack.festivalSlug !== previous.festival_slug) {
      throw badRequest("The previous public theme no longer matches its approved festival pack.");
    }
    const availableAssetIds = new Set(pack.files.map((file) => file.assetId));
    const storedAssetIds = Object.values(
      previous.snapshot_payload.surfaceAssets || {}
    ).flatMap((files) => (files || []).map((file) => file.assetId));
    if (storedAssetIds.some((assetId) => !availableAssetIds.has(assetId))) {
      throw badRequest("The previous public theme references an unavailable governed asset version.");
    }

    const sceneState = previous.snapshot_payload.sceneState ||
      sceneSurfaceState(storedScene.data as HolidayExperienceStudioConfig);
    const surfaceState = previous.snapshot_payload.surfaceState || {};
    const targetSurfaces = safeHeroSurfaces(previous.target_surfaces || []);
    const websiteActive = sceneState.websiteEnabled || Boolean(surfaceState.websiteHero);
    const clientLoginActive = Boolean(surfaceState.clientLoginHero);
    const employeeLoginActive = Boolean(surfaceState.employeeLoginHero);
    const soundEnabled = Boolean(
      previous.snapshot_payload.behaviorSettings?.soundEnabled
    );
    const surfacePackIds = Object.fromEntries(
      Object.entries(surfaceState).map(([surface, value]) => [
        surface,
        value?.packId || null
      ])
    );

    await query(`
      update active_festival_snapshots
      set state = 'previous', deactivated_at = now(),
          deactivation_reason = 'Replaced by exact previous public theme restoration.'
      where id = $1
    `, [current.id]);
    const restoredRows = await query<{ id: string }>(`
      insert into active_festival_snapshots (
        preview_snapshot_id, configuration_id, festival_slug, festival_name,
        variant_pack_id, variant_slug, variant_name, variant_version,
        target_surfaces, snapshot_payload, configuration_hash,
        previous_snapshot_id, activated_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::text[],$10::jsonb,$11,$12,$13)
      returning id
    `, [
      previous.preview_snapshot_id,
      previous.configuration_id,
      previous.festival_slug,
      previous.festival_name,
      previous.variant_pack_id,
      previous.variant_slug,
      previous.variant_name,
      Number(previous.variant_version),
      targetSurfaces,
      JSON.stringify(previous.snapshot_payload),
      previous.configuration_hash,
      current.id,
      actorId
    ]);

    await query(`
      update holiday_themes
      set status = 'paused', updated_at = now()
      where status = 'active' and id <> $1
    `, [pack.themeId]);
    await query(`
      update holiday_themes
      set status = 'active', mode = 'manual', is_enabled = true,
          scope = case when $2 then 'entire_public' else 'login_screens' end,
          apply_to_homepage = $2, apply_to_header = $3, apply_to_footer = $4,
          apply_axo_theme = $5, apply_to_login_screens = $6 or $7,
          apply_to_client_login = $6, apply_to_employee_login = $7,
          animation_level = $8,
          active_festival_pack_id = case when $9 then $10::uuid else null end,
          experience_config = jsonb_set(
            jsonb_set(
              jsonb_set(
                coalesce(experience_config, '{}'::jsonb),
                '{activeSurfacePackIds}', $11::jsonb, true
              ),
              '{studio}', $12::jsonb, true
            ),
            '{sound,enabled}', to_jsonb($13::boolean), true
          ),
          activated_by = $14, updated_by = $14, updated_at = now()
      where id = $1
    `, [
      pack.themeId,
      websiteActive,
      sceneState.headerEnabled,
      sceneState.groundEnabled,
      sceneState.axoEnabled,
      clientLoginActive,
      employeeLoginActive,
      sceneState.motionLevel,
      Boolean(surfaceState.websiteHero),
      pack.id,
      JSON.stringify(surfacePackIds),
      JSON.stringify(storedScene.data),
      soundEnabled,
      actorId
    ]);

    const defaultLoginComposition = defaultHolidayLoginComposition();
    for (const [channel, active] of [
      ["client", clientLoginActive],
      ["employee", employeeLoginActive]
    ] as const) {
      await query(`
        update holiday_login_theme_settings
        set mode = $2, state = $3, theme_id = $4,
            enabled = true, composition_config = $5::jsonb,
            version_number = version_number + 1,
            approval_state = 'approved', approved_at = now(), approved_by = $6,
            last_failure_code = null, last_changed_by = $6, updated_at = now()
        where channel = $1
      `, [
        channel,
        active ? "holiday" : "default",
        active ? "theme_active" : "default_active",
        active ? pack.themeId : null,
        JSON.stringify(
          active ? festivalPackFullCanvasComposition(pack.id) : defaultLoginComposition
        ),
        actorId
      ]);
    }

    await query(`
      update festival_pack_imports
      set state = 'previous', updated_at = now()
      where state = 'active' and id <> $1
    `, [pack.id]);
    await query(`
      update festival_pack_imports
      set state = 'active', activated_by = $2, activated_at = now(), updated_at = now()
      where id = $1
    `, [pack.id, actorId]);
    await query(`
      update festival_studio_configurations
      set activation_status = 'paused', updated_at = now()
      where activation_status = 'active' and id <> $1
    `, [previous.configuration_id]);
    await query(`
      update festival_studio_configurations
      set selected_variant_pack_id = $2, selected_variant_slug = $3,
          activation_status = 'active', client_login_enabled = $4,
          employee_login_enabled = $5, website_enabled = $6,
          axo_enabled = $7, sound_enabled = $8,
          motion_config = jsonb_build_object('enabled', $9::boolean, 'level', $10::text),
          version = version + 1, activated_at = now(), activated_by = $11,
          updated_by = $11, updated_at = now()
      where id = $1
    `, [
      previous.configuration_id,
      pack.id,
      previous.variant_slug,
      clientLoginActive,
      employeeLoginActive,
      websiteActive,
      sceneState.axoEnabled,
      soundEnabled,
      sceneState.motionEnabled,
      sceneState.motionLevel,
      actorId
    ]);
    await query(`
      update website_experience_settings
      set holiday_mode_enabled = true, emergency_disabled = false,
          active_theme_id = $1, manual_override_theme_id = $1,
          last_resolved_theme_id = $1, last_switched_at = now(),
          last_switched_by = $2, updated_at = now()
      where singleton_key = 'global'
    `, [pack.themeId, actorId]);
    await writeVersion(
      query,
      previous.configuration_id,
      actorId,
      "previous_public_snapshot_restored"
    );
    return {
      activeSnapshotId: restoredRows[0].id,
      restoredFromSnapshotId: previous.id,
      replacedSnapshotId: current.id,
      festivalName: previous.festival_name,
      variantName: previous.variant_name,
      configurationHash: previous.configuration_hash
    };
  });
}

export async function saveFestivalStudioConfiguration({
  configurationId,
  selectedVariantPackId,
  clientLoginEnabled,
  employeeLoginEnabled,
  websiteEnabled,
  axoEnabled,
  soundEnabled,
  motionEnabled,
  motionLevel,
  protectedLoginBrand,
  startAt,
  endAt,
  repeatYearly,
  actorId
}: {
  configurationId: string;
  selectedVariantPackId: string | null;
  clientLoginEnabled: boolean;
  employeeLoginEnabled: boolean;
  websiteEnabled: boolean;
  axoEnabled: boolean;
  soundEnabled: boolean;
  motionEnabled: boolean;
  motionLevel: "none" | "subtle" | "standard";
  protectedLoginBrand: FestivalStudioConfiguration["protectedLoginBrand"];
  startAt: string | null;
  endAt: string | null;
  repeatYearly: boolean;
  actorId: string;
}) {
  await withDbTransaction(async (query) => {
    const configuration = await configurationForUpdate(query, configurationId);
    let themeId = configuration.theme_id;
    let variantSlug = configuration.selected_variant_slug;
    if (selectedVariantPackId) {
      const packs = await query<{
        id: string;
        theme_id: string;
        state: string;
        festival_slug: string | null;
        variant_slug: string | null;
      }>(`
        select id, theme_id, state,
          manifest_json->>'festivalSlug' as festival_slug,
          manifest_json->>'variantSlug' as variant_slug
        from festival_pack_imports
        where id = $1 and state not in ('archived','rejected')
        for update
      `, [selectedVariantPackId]);
      const pack = packs[0];
      if (!pack) {
        throw badRequest("Choose a variant from the selected festival.");
      }
      const canonicalPack = await canonicalPackForUpdate(query, selectedVariantPackId);
      await assertCanonicalPackOwnership(query, configuration, canonicalPack);
      themeId = pack.theme_id;
      variantSlug = pack.variant_slug;
    }
    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      throw badRequest("Choose an end time after the start time.");
    }
    await query(`
      update festival_studio_configurations
      set theme_id = $2,
          selected_variant_pack_id = $3,
          selected_variant_slug = $4,
          client_login_enabled = $5,
          employee_login_enabled = $6,
          website_enabled = $7,
          axo_enabled = $8,
          sound_enabled = $9,
          motion_config = $10::jsonb,
          start_at = $11,
          end_at = $12,
          repeat_yearly = $13,
          activation_status = case
            when activation_status in ('active','scheduled') then activation_status
            when $2::uuid is null then 'incomplete'
            else 'ready'
          end,
          version = version + 1,
          updated_by = $14,
          updated_at = now()
      where id = $1
    `, [
      configurationId,
      themeId,
      selectedVariantPackId,
      variantSlug,
      clientLoginEnabled,
      employeeLoginEnabled,
      websiteEnabled,
      axoEnabled,
      soundEnabled,
      JSON.stringify({ enabled: motionEnabled, level: motionLevel }),
      startAt,
      endAt,
      repeatYearly,
      actorId
    ]);
    if (selectedVariantPackId) {
      await query(`
        update festival_pack_imports
        set client_login_enabled = $2,
            employee_login_enabled = $3,
            homepage_enabled = $4,
            updated_at = now()
        where id = $1
      `, [
        selectedVariantPackId,
        clientLoginEnabled,
        employeeLoginEnabled,
        websiteEnabled
      ]);
    }
    if (themeId) {
      await query(`
        update holiday_themes
        set apply_to_homepage = $2,
            apply_to_login_screens = $3 or $4,
            apply_to_client_login = $3,
            apply_to_employee_login = $4,
            apply_axo_theme = $5,
            animation_level = $6,
            experience_config = jsonb_set(
              jsonb_set(
                jsonb_set(
                  coalesce(experience_config, '{}'::jsonb),
                  '{sound,available}', to_jsonb($7::boolean), true
                ),
                '{sound,enabled}', to_jsonb($7::boolean), true
              ),
              '{protectedLoginBrand}', $8::jsonb, true
            ),
            updated_by = $9,
            updated_at = now()
        where id = $1
      `, [
        themeId,
        websiteEnabled,
        clientLoginEnabled,
        employeeLoginEnabled,
        axoEnabled,
        motionEnabled ? motionLevel : "none",
        soundEnabled,
        JSON.stringify(protectedLoginBrand),
        actorId
      ]);
    }
    if (themeId && themeId !== configuration.theme_id) {
      for (const slot of Object.keys(slotColumns) as FestivalStudioSlot[]) {
        const assetId = configuration[
          slotColumns[slot] as keyof ConfigRow
        ];
        if (typeof assetId !== "string") continue;
        if (configuration.theme_id) {
          await query(`
            update festival_asset_assignments
            set state = 'replaced', removed_by = $4, removed_at = now(),
                removal_reason = 'Festival Studio variant changed.', updated_at = now()
            where theme_id = $1 and asset_version_id = $2
              and placement = $3 and state = 'active'
          `, [configuration.theme_id, assetId, slotPlacements[slot], actorId]);
        }
        await query(`
          insert into festival_asset_assignments (
            library_asset_id, asset_version_id, theme_id, placement,
            state, assigned_by, assigned_at
          )
          select asset.library_asset_id, asset.id, $2, $3, 'active', $4, now()
          from holiday_theme_assets asset
          where asset.id = $1 and asset.library_asset_id is not null
            and not exists (
              select 1 from festival_asset_assignments assignment
              where assignment.asset_version_id = asset.id
                and assignment.theme_id = $2
                and assignment.placement = $3
                and assignment.state = 'active'
            )
        `, [assetId, themeId, slotPlacements[slot], actorId]);
      }
    }
    await writeVersion(query, configurationId, actorId, "configuration_saved");
  });
  if (selectedVariantPackId) {
    await refreshCanonicalDraftRecord(configurationId, actorId);
  }
}

export async function assignFestivalStudioAsset({
  configurationId,
  slot,
  assetId,
  actorId
}: {
  configurationId: string;
  slot: FestivalStudioSlot;
  assetId: string | null;
  actorId: string;
}) {
  const column = slotColumns[slot];
  const placement = slotPlacements[slot];
  if (!column || !placement) throw badRequest("Choose a supported festival slot.");
  await withDbTransaction(async (query) => {
    const configuration = await configurationForUpdate(query, configurationId);
    if (!configuration.theme_id) {
      throw badRequest("Choose a festival variant before assigning assets.");
    }
    if (!assetId) {
      await query(`
        update festival_studio_configurations
        set ${column} = null, version = version + 1,
            updated_by = $2, updated_at = now()
        where id = $1
      `, [configurationId, actorId]);
      await query(`
        update festival_asset_assignments assignment
        set state = 'replaced', removed_by = $3, removed_at = now(),
            removal_reason = 'Festival Studio slot restored to default.',
            updated_at = now()
        where assignment.theme_id = $1
          and assignment.placement = $2
          and assignment.state = 'active'
      `, [configuration.theme_id, placement, actorId]);
      await writeVersion(query, configurationId, actorId, `${slot}_default_restored`);
      return;
    }
    const assets = await query<{
      id: string;
      library_asset_id: string | null;
      mime_type: string;
      asset_role: string;
      purpose: string | null;
      status: string;
      lifecycle_state: string;
      embedded_ui_state: string | null;
      asset_festival_slug: string | null;
      owner_theme_id: string | null;
    }>(`
      select asset.id, asset.library_asset_id, asset.mime_type, asset.asset_role,
        library.purpose, asset.status,
        coalesce(library.lifecycle_state, 'active') as lifecycle_state,
        asset.asset_metadata->>'embeddedUiState' as embedded_ui_state,
        coalesce(pack.manifest_json->>'festivalSlug', owner_theme.slug) as asset_festival_slug,
        owner_theme.id as owner_theme_id
      from holiday_theme_assets asset
      left join festival_asset_library library on library.id = asset.library_asset_id
      left join festival_pack_imports pack
        on pack.id::text = asset.asset_metadata->>'festivalPackId'
      left join holiday_themes owner_theme on owner_theme.id = library.owner_theme_id
      where asset.id = $1
      for update of asset
    `, [assetId]);
    const asset = assets[0];
    if (
      !asset ||
      !asset.library_asset_id ||
      ["archived", "rejected"].includes(asset.status) ||
      ["trash", "deletion_pending", "deleted"].includes(asset.lifecycle_state)
    ) {
      throw badRequest("The selected asset is unavailable.");
    }
    if (!isFestivalStudioRoleCompatible(slot, asset.asset_role, asset.mime_type)) {
      throw badRequest(
        `${asset.asset_role.replaceAll("_", " ")} is not compatible with ${slot.replaceAll(/([A-Z])/g, " $1").toLowerCase()}. Choose a correctly typed asset or restore the variant default.`
      );
    }
    if (
      asset.owner_theme_id !== configuration.theme_id &&
      asset.asset_festival_slug &&
      asset.asset_festival_slug !== configuration.festival_slug
    ) {
      throw badRequest("This asset belongs to another festival. Add it as an explicit approved override before assignment.");
    }
    if (
      ["clientLoginHero", "employeeLoginHero"].includes(slot) &&
      asset.embedded_ui_state === "contains_embedded_ui"
    ) {
      throw badRequest("Flat mockups with a baked login form cannot be assigned as a login hero.");
    }
    await query(`
      update festival_asset_assignments
      set state = 'replaced', removed_by = $4, removed_at = now(),
          removal_reason = 'Replaced from the canonical Festival Studio slot.',
          updated_at = now()
      where theme_id = $1 and placement = $2 and state = 'active'
        and asset_version_id <> $3
    `, [configuration.theme_id, placement, assetId, actorId]);
    await query(`
      update festival_asset_assignments
      set state = 'active', removed_by = null, removed_at = null,
          removal_reason = null, updated_at = now()
      where asset_version_id = $1 and theme_id = $2
        and placement = $3 and state = 'pending_approval'
    `, [assetId, configuration.theme_id, placement]);
    await query(`
      insert into festival_asset_assignments (
        library_asset_id, asset_version_id, theme_id, placement,
        state, assigned_by, assigned_at
      )
      select $1, $2, $3, $4, 'active', $5, now()
      where not exists (
        select 1 from festival_asset_assignments
        where asset_version_id = $2 and theme_id = $3
          and placement = $4 and state = 'active'
      )
    `, [asset.library_asset_id, assetId, configuration.theme_id, placement, actorId]);
    await query(`
      update holiday_theme_assets
      set asset_metadata = coalesce(asset_metadata, '{}'::jsonb) || $2::jsonb,
          updated_at = now()
      where id = $1
    `, [
      assetId,
      JSON.stringify({
        festivalStudioConfigurationId: configurationId,
        festivalStudioSlot: slot
      })
    ]);
    await query(`
      update festival_studio_configurations
      set ${column} = $2,
          activation_status = case
            when activation_status in ('active','scheduled') then activation_status
            else 'ready'
          end,
          version = version + 1,
          updated_by = $3,
          updated_at = now()
      where id = $1
    `, [configurationId, assetId, actorId]);
    await writeVersion(query, configurationId, actorId, `${slot}_assigned`);
  });
  await refreshCanonicalDraftRecord(configurationId, actorId);
}

export async function restorePreviousFestivalStudioSlot({
  configurationId,
  slot,
  actorId
}: {
  configurationId: string;
  slot: FestivalStudioSlot;
  actorId: string;
}) {
  const column = slotColumns[slot];
  if (!column) throw badRequest("Choose a supported festival slot.");
  const result = await dbQuery<{ asset_id: string }>(`
    select version.configuration_snapshot->>$2 as asset_id
    from festival_studio_configuration_versions version
    join festival_studio_configurations configuration
      on configuration.id = version.configuration_id
    join holiday_theme_assets asset
      on asset.id = (version.configuration_snapshot->>$2)::uuid
    left join festival_asset_library library on library.id = asset.library_asset_id
    where version.configuration_id = $1
      and version.configuration_snapshot->>$2 is not null
      and version.configuration_snapshot->>$2 is distinct from configuration.${column}::text
      and asset.status not in ('archived','rejected')
      and coalesce(library.lifecycle_state, 'active') not in ('trash','deletion_pending','deleted')
    order by version.version desc
    limit 1
  `, [configurationId, column]);
  const assetId = result.rows[0]?.asset_id;
  if (!assetId) {
    throw badRequest("No safe previous asset is available for this slot.");
  }
  await assignFestivalStudioAsset({ configurationId, slot, assetId, actorId });
  return { assetId };
}

async function prepareFestivalStudioApproval({
  configurationId,
  actorId,
  religiousArtworkConfirmed
}: {
  configurationId: string;
  actorId: string;
  religiousArtworkConfirmed: boolean;
}) {
  return withDbTransaction(async (query) => {
    const configuration = await configurationForUpdate(query, configurationId);
    if (!configuration.theme_id) throw badRequest("Choose a festival variant first.");
    const themes = await query<{ festival_type: string }>(
      "select festival_type from holiday_themes where id = $1 for update",
      [configuration.theme_id]
    );
    if (!themes[0]) throw badRequest("The selected festival theme is unavailable.");
    if (
      themes[0].festival_type === "religious_festival" &&
      !religiousArtworkConfirmed
    ) {
      throw badRequest("Confirm the religious artwork review before activation.");
    }
    const selectedAssetIds = assetIdColumns
      .map((column) => configuration[column as keyof ConfigRow])
      .filter((value): value is string => typeof value === "string");
    if (selectedAssetIds.length > 0) {
      const unsafe = await query<{ count: number | string }>(`
        select count(*) as count
        from holiday_theme_assets asset
        left join festival_asset_library library on library.id = asset.library_asset_id
        where asset.id = any($1::uuid[])
          and (
            asset.status in ('archived')
            or asset.review_status in ('rejected')
            or coalesce(library.lifecycle_state, 'active') in ('trash','deletion_pending','deleted')
            or coalesce(asset.asset_metadata->>'embeddedUiState','no_embedded_ui') = 'contains_embedded_ui'
          )
      `, [selectedAssetIds]);
      if (Number(unsafe[0]?.count || 0) > 0) {
        throw badRequest("Replace blocked, deleted or embedded-form assets before activation.");
      }
      await query(`
        update holiday_theme_assets asset
        set status = 'active', review_status = 'approved',
            quality_status = case
              when quality_status = 'approved_with_size_restrictions'
                then quality_status
              else 'approved'
            end,
            approved_at = now(), approved_by = $2,
            clarity_confirmation_at = now(), clarity_confirmation_by = $2,
            updated_at = now()
        where asset.id = any($1::uuid[])
      `, [selectedAssetIds, actorId]);
      await query(`
        update festival_asset_library library
        set approval_state = 'approved', lifecycle_state = 'active',
            archived_at = null, updated_by = $2, updated_at = now()
        where library.current_version_asset_id = any($1::uuid[])
           or library.id in (
             select library_asset_id from holiday_theme_assets where id = any($1::uuid[])
           )
      `, [selectedAssetIds, actorId]);
      await query(`
        update festival_asset_assignments
        set state = 'active', removed_at = null, removed_by = null,
            removal_reason = null, updated_at = now()
        where theme_id = $1 and asset_version_id = any($2::uuid[])
      `, [configuration.theme_id, selectedAssetIds]);
    }
    await query(`
      update holiday_themes
      set apply_to_homepage = $2,
          apply_to_login_screens = $3 or $4,
          apply_to_client_login = $3,
          apply_to_employee_login = $4,
          apply_axo_theme = $5,
          palette_detection_status = case
            when palette_detection_status in ('pending_review','needs_review','failed')
              then 'approved'
            else palette_detection_status
          end,
          experience_config = jsonb_set(
            coalesce(experience_config, '{}'::jsonb),
            '{approvalStatus}',
            '"approved"'::jsonb,
            true
          ),
          updated_by = $6,
          updated_at = now()
      where id = $1
    `, [
      configuration.theme_id,
      configuration.website_enabled,
      configuration.client_login_enabled,
      configuration.employee_login_enabled,
      configuration.axo_enabled,
      actorId
    ]);
    await query(`
      update festival_studio_configurations
      set visual_approval_confirmed_at = now(),
          visual_approval_confirmed_by = $2,
          updated_by = $2,
          updated_at = now()
      where id = $1
    `, [configurationId, actorId]);
    return configuration;
  });
}

async function markConfigurationState({
  configurationId,
  actorId,
  state,
  action
}: {
  configurationId: string;
  actorId: string;
  state: "active" | "scheduled" | "paused";
  action: string;
}) {
  await withDbTransaction(async (query) => {
    if (state === "active") {
      await query(`
        update festival_studio_configurations
        set activation_status = 'paused', updated_at = now()
        where activation_status = 'active' and id <> $1
      `, [configurationId]);
    }
    await query(`
      update festival_studio_configurations
      set activation_status = $2,
          activated_at = case when $2 = 'active' then now() else activated_at end,
          activated_by = case when $2 = 'active' then $3 else activated_by end,
          version = version + 1,
          updated_by = $3,
          updated_at = now()
      where id = $1
    `, [configurationId, state, actorId]);
    await writeVersion(query, configurationId, actorId, action);
  });
}

export async function activateFestivalStudioConfiguration({
  configurationId,
  actorId,
  visualApprovalConfirmed,
  religiousArtworkConfirmed,
  schedule
}: {
  configurationId: string;
  actorId: string;
  visualApprovalConfirmed: boolean;
  religiousArtworkConfirmed: boolean;
  schedule?: { startAt: string; endAt: string; repeatYearly: boolean } | null;
}) {
  if (!visualApprovalConfirmed) {
    throw badRequest("Confirm the final visual preview before activation.");
  }
  const configuration = await prepareFestivalStudioApproval({
    configurationId,
    actorId,
    religiousArtworkConfirmed
  });
  if (configuration.selected_variant_pack_id) {
    await activateFestivalPack({
      packId: configuration.selected_variant_pack_id,
      actorId,
      schedule: schedule || null,
      targets: {
        clientLoginEnabled: configuration.client_login_enabled,
        employeeLoginEnabled: configuration.employee_login_enabled
      },
      studioConfigurationId: configurationId
    });
  } else if (schedule) {
    await withDbTransaction(async (query) => {
      await query(`
        update holiday_themes
        set status = 'scheduled', mode = 'automatic', start_at = $2,
            end_at = $3, repeat_yearly = $4, is_enabled = true,
            updated_by = $5, updated_at = now()
        where id = $1
      `, [
        configuration.theme_id,
        schedule.startAt,
        schedule.endAt,
        schedule.repeatYearly,
        actorId
      ]);
    });
  } else {
    await applyHolidayAdminAction(
      { action: "activate", themeId: configuration.theme_id as string },
      actorId
    );
  }
  await markConfigurationState({
    configurationId,
    actorId,
    state: schedule ? "scheduled" : "active",
    action: schedule ? "configuration_scheduled" : "configuration_activated"
  });
}

export async function endFestivalStudioConfiguration({
  configurationId,
  actorId
}: {
  configurationId: string;
  actorId: string;
}) {
  const rows = await dbQuery<{ theme_id: string | null }>(
    "select theme_id from festival_studio_configurations where id = $1",
    [configurationId]
  );
  const themeId = rows.rows[0]?.theme_id;
  if (!themeId) throw badRequest("The festival theme is unavailable.");
  await applyHolidayAdminAction({ action: "end_early", themeId }, actorId);
  await applyHolidayAdminAction({ action: "restore_login_defaults" }, actorId);
  await withDbTransaction(async (query) => {
    await query(`
      update active_festival_snapshots
      set state = 'disabled', deactivated_at = now(),
          deactivation_reason = 'Festival ended and WriteX defaults restored.'
      where state = 'active'
    `);
    await query(`
      update holiday_themes
      set active_festival_pack_id = null,
          experience_config = coalesce(experience_config, '{}'::jsonb) - 'activeSurfacePackIds',
          updated_at = now()
      where active_festival_pack_id is not null
         or experience_config ? 'activeSurfacePackIds'
    `);
  });
  await markConfigurationState({
    configurationId,
    actorId,
    state: "paused",
    action: "configuration_ended"
  });
}

export async function restoreDefaultFestivalStudio(actorId: string) {
  await applyHolidayAdminAction({ action: "restore_default" }, actorId);
  await applyHolidayAdminAction({ action: "restore_login_defaults" }, actorId);
  await withDbTransaction(async (query) => {
    await query(`
      update active_festival_snapshots
      set state = 'disabled', deactivated_at = now(),
          deactivation_reason = 'Normal WriteX website restored.'
      where state = 'active'
    `);
    await query(`
      update holiday_themes
      set active_festival_pack_id = null,
          experience_config = coalesce(experience_config, '{}'::jsonb) - 'activeSurfacePackIds',
          updated_at = now()
      where active_festival_pack_id is not null
         or experience_config ? 'activeSurfacePackIds'
    `);
    const active = await query<{ id: string }>(`
      update festival_studio_configurations
      set activation_status = case
            when activation_status in ('active','scheduled') then 'paused'
            else activation_status
          end,
          updated_by = $1,
          updated_at = now()
      where activation_status in ('active','scheduled')
      returning id
    `, [actorId]);
    for (const configuration of active) {
      await query(
        "update festival_studio_configurations set version = version + 1 where id = $1",
        [configuration.id]
      );
      await writeVersion(
        query,
        configuration.id,
        actorId,
        "default_website_restored"
      );
    }
  });
}

export async function fullResetFestivalStudio(actorId: string) {
  const defaultComposition = defaultHolidayLoginComposition();
  await withDbTransaction(async (query) => {
    await query(`
      update website_experience_settings
      set holiday_mode_enabled = false, auto_schedule_enabled = false,
          emergency_disabled = false, active_theme_id = null,
          manual_override_theme_id = null, last_resolved_theme_id = null,
          last_switched_at = now(), last_switched_by = $1, updated_at = now()
      where singleton_key = 'global'
    `, [actorId]);
    await query(`
      update active_festival_snapshots
      set state = 'disabled', deactivated_at = now(),
          deactivation_reason = 'Full Festival Reset restored WriteX defaults.'
      where state = 'active'
    `);
    await query(`
      update holiday_themes
      set status = case when slug = 'default' then status else 'paused' end,
          is_enabled = case when slug = 'default' then is_enabled else false end,
          active_festival_pack_id = null,
          experience_config = coalesce(experience_config, '{}'::jsonb) - 'activeSurfacePackIds',
          updated_by = $1, updated_at = now()
      where slug <> 'default'
         or active_festival_pack_id is not null
         or experience_config ? 'activeSurfacePackIds'
    `, [actorId]);
    await query(`
      update holiday_login_theme_settings
      set mode = 'default', state = 'default_active', theme_id = null,
          previous_approved_config = case
            when approval_state = 'approved' then composition_config
            else previous_approved_config
          end,
          composition_config = $2::jsonb, version_number = version_number + 1,
          approval_state = 'approved', start_at = null, end_at = null,
          last_failure_code = null,
          enabled = case when channel = 'admin' then false else true end,
          last_changed_by = $1, approved_at = now(), approved_by = $1,
          updated_at = now()
    `, [actorId, JSON.stringify(defaultComposition)]);
    await query(`
      update festival_pack_imports
      set state = case when state = 'active' then 'previous' else 'approved' end,
          updated_at = now()
      where state in ('active','scheduled')
    `);
    const configurations = await query<{ id: string }>(`
      update festival_studio_configurations
      set activation_status = 'paused', client_login_enabled = false,
          employee_login_enabled = false, website_enabled = false,
          axo_enabled = false, sound_enabled = false,
          motion_config = jsonb_set(
            coalesce(motion_config, '{}'::jsonb), '{enabled}', 'false'::jsonb, true
          ),
          version = version + 1, updated_by = $1, updated_at = now()
      where activation_status <> 'paused'
         or client_login_enabled or employee_login_enabled or website_enabled
         or axo_enabled or sound_enabled
         or coalesce((motion_config->>'enabled')::boolean, false)
      returning id
    `, [actorId]);
    for (const configuration of configurations) {
      await writeVersion(query, configuration.id, actorId, "full_festival_reset");
    }
  });
}

export async function getFestivalStudioPreviewTarget(configurationId: string) {
  const result = await dbQuery<{
    theme_id: string | null;
    selected_variant_pack_id: string | null;
  }>(`
    select theme_id, selected_variant_pack_id
    from festival_studio_configurations
    where id = $1
  `, [configurationId]);
  const configuration = result.rows[0];
  if (!configuration?.theme_id) {
    throw badRequest("Choose a festival variant before opening preview.");
  }
  await getHolidayExperienceSnapshot({
    previewThemeId: configuration.theme_id,
    reconcile: false
  });
  return {
    themeId: configuration.theme_id,
    packId: configuration.selected_variant_pack_id
  };
}
