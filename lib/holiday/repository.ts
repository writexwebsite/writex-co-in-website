import "server-only";

import { ApiError, badRequest } from "@/lib/api/response";
import { dbQuery, withDbTransaction } from "@/lib/db";
import { BUILT_IN_HOLIDAY_THEMES, DEFAULT_HOLIDAY_THEME_SLUG } from "./themes";
import {
  findNextScheduledTheme,
  isLoginRoute,
  normalizeHolidayRoute,
  resolveHolidayTheme
} from "./resolver";
import {
  assetAvailabilityForPack,
  resolveExperiencePack
} from "./packs";
import {
  safeNeutralExtractedPalette,
  toApprovedHolidayPalette
} from "./palette";
import {
  defaultHolidayLoginComposition,
  loginCompositionActivationErrors,
  resolveHolidayLoginComposition
} from "./login-theme";
import type {
  HolidayAnimationLevel,
  HolidayAuditEvent,
  HolidayExtractedPalette,
  HolidayExperienceLevel,
  HolidayExperienceSettings,
  HolidayExperienceSnapshot,
  HolidayLoginControl,
  HolidayLoginChannel,
  HolidayTheme,
  HolidayThemeAsset
} from "./types";
import {
  PUBLIC_FESTIVAL_ASSET_PLACEMENTS,
  type FestivalAssetPlacement,
  type FestivalAssetPurpose
} from "./asset-governance-types";
import type { z } from "zod";
import type { holidayAdminActionSchema } from "./validation";

type HolidayAdminAction = z.infer<typeof holidayAdminActionSchema>;

type SettingsRow = {
  holiday_mode_enabled: boolean;
  auto_schedule_enabled: boolean;
  emergency_disabled: boolean;
  active_theme_id: string | null;
  manual_override_theme_id: string | null;
  last_resolved_theme_id: string | null;
  last_switched_at: Date | string | null;
  last_switched_by: string | null;
  last_switched_by_name: string | null;
  default_theme_slug: string;
  updated_at: Date | string;
};

type ThemeRow = {
  id: string;
  slug: string;
  name: string;
  festival_type: HolidayTheme["festivalType"];
  description: string;
  status: HolidayTheme["status"];
  mode: HolidayTheme["mode"];
  start_at: Date | string | null;
  end_at: Date | string | null;
  timezone: string;
  repeat_yearly: boolean;
  priority: number;
  is_enabled: boolean;
  scope: HolidayTheme["scope"];
  apply_to_header: boolean;
  apply_to_footer: boolean;
  apply_to_homepage: boolean;
  apply_to_login_screens: boolean;
  apply_to_client_login: boolean;
  apply_to_employee_login: boolean;
  apply_to_admin_login: boolean;
  apply_matching_website_palette: boolean;
  apply_axo_theme: boolean;
  apply_to_selected_routes: boolean;
  selected_routes: string[];
  palette: HolidayTheme["palette"];
  detected_palette: HolidayTheme["detectedPalette"];
  palette_detection_status: HolidayTheme["paletteDetectionStatus"];
  palette_detection_message: string | null;
  palette_match_mode: HolidayTheme["paletteMatchMode"];
  palette_source_asset_id: string | null;
  palette_approved_at: Date | string | null;
  experience_level: HolidayTheme["experienceLevel"];
  animation_level: HolidayTheme["animationLevel"];
  experience_config: Partial<HolidayTheme["experienceConfig"]> | null;
  announcement_bar_enabled: boolean;
  announcement_bar_text: string | null;
  announcement_bar_cta_label: string | null;
  announcement_bar_cta_href: string | null;
  motif: string;
  axo_accessory: string;
  built_in: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  active_festival_pack_id: string | null;
  assets: Array<{
    id: string;
    libraryAssetId: string | null;
    role: HolidayThemeAsset["role"];
    variant: string;
    safeFileName: string;
    mimeType: string;
    fileSize: number | string;
    checksumSha256: string | null;
    durationSeconds: number | string | null;
    status: HolidayThemeAsset["status"];
    reviewStatus: HolidayThemeAsset["reviewStatus"];
    qualityStatus: HolidayThemeAsset["qualityStatus"];
    versionNumber: number | string;
    previousAssetId: string | null;
    intendedObject: string | null;
    intendedFestival: string | null;
    assetCategory: string | null;
    visualStyle: string | null;
    sizeRestrictions: string | null;
    usageLocations: string[];
    placements: string[];
    lifecycleState: HolidayThemeAsset["lifecycleState"];
    libraryApprovalState: string;
    isFallback: boolean;
    approvedAt: string | null;
    createdAt: string;
    assetMetadata: Record<string, unknown>;
  }> | null;
};

type LoginControlRow = {
  channel: HolidayLoginChannel;
  mode: HolidayLoginControl["mode"];
  state: HolidayLoginControl["state"];
  theme_id: string | null;
  start_at: Date | string | null;
  end_at: Date | string | null;
  timezone: string;
  enabled: boolean;
  last_failure_code: string | null;
  composition_config: Partial<HolidayLoginControl["compositionConfig"]> | null;
  version_number: number | string;
  approval_state: HolidayLoginControl["approvalState"];
  previous_approved_config:
    | Partial<HolidayLoginControl["compositionConfig"]>
    | null;
  last_changed_by_name: string | null;
  updated_at: Date | string;
};

type AuditRow = {
  id: string;
  action: string;
  theme_name: string | null;
  actor_name: string | null;
  affected_scope: string | null;
  safe_metadata: Record<string, unknown>;
  created_at: Date | string;
};

const toIso = (value: Date | string | null) =>
  value ? new Date(value).toISOString() : null;

function mapSettings(row: SettingsRow): HolidayExperienceSettings {
  return {
    holidayModeEnabled: row.holiday_mode_enabled,
    autoScheduleEnabled: row.auto_schedule_enabled,
    emergencyDisabled: row.emergency_disabled,
    activeThemeId: row.active_theme_id,
    manualOverrideThemeId: row.manual_override_theme_id,
    lastResolvedThemeId: row.last_resolved_theme_id,
    lastSwitchedAt: toIso(row.last_switched_at),
    lastSwitchedBy: row.last_switched_by_name,
    defaultThemeSlug: row.default_theme_slug,
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapTheme(row: ThemeRow): HolidayTheme {
  const rawSurfacePackIds = (
    row.experience_config as
      | { activeSurfacePackIds?: Record<string, unknown> }
      | null
  )?.activeSurfacePackIds;
  const activeSurfacePackIds = rawSurfacePackIds
    ? Object.fromEntries(
        Object.entries(rawSurfacePackIds).filter(
          ([, value]) => typeof value === "string" && value.length > 0
        )
      )
    : {};
  const experienceConfig = resolveExperiencePack(
    row.slug,
    row.experience_config
  );
  const assets: HolidayThemeAsset[] = (row.assets || []).map((asset) => ({
    ...asset,
    libraryAssetId: asset.libraryAssetId || null,
    fileSize: Number(asset.fileSize),
    versionNumber: Number(asset.versionNumber || 1),
    qualityStatus: asset.qualityStatus || "needs_visual_review",
    previousAssetId: asset.previousAssetId || null,
    intendedObject: asset.intendedObject || null,
    intendedFestival: asset.intendedFestival || null,
    assetCategory: asset.assetCategory || null,
    visualStyle: asset.visualStyle || null,
    sizeRestrictions: asset.sizeRestrictions || null,
    usageLocations: asset.usageLocations || [],
    placements: asset.placements || [],
    lifecycleState: asset.lifecycleState || "active",
    libraryApprovalState: asset.libraryApprovalState || "approved",
    checksumSha256: asset.checksumSha256 || null,
    durationSeconds:
      asset.durationSeconds === null ? null : Number(asset.durationSeconds),
    approvedAt: asset.approvedAt ? new Date(asset.approvedAt).toISOString() : null
    ,assetMetadata: asset.assetMetadata || {}
  }));
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    festivalType: row.festival_type,
    description: row.description,
    status: row.status,
    mode: row.mode,
    startAt: toIso(row.start_at),
    endAt: toIso(row.end_at),
    timezone: row.timezone,
    repeatYearly: row.repeat_yearly,
    priority: row.priority,
    isEnabled: row.is_enabled,
    scope: row.scope,
    applyToHeader: row.apply_to_header,
    applyToFooter: row.apply_to_footer,
    applyToHomepage: row.apply_to_homepage,
    applyToLoginScreens: row.apply_to_login_screens,
    applyToClientLogin: row.apply_to_client_login,
    applyToEmployeeLogin: row.apply_to_employee_login,
    applyToAdminLogin: row.apply_to_admin_login,
    applyMatchingWebsitePalette: row.apply_matching_website_palette,
    applyAxoTheme: row.apply_axo_theme,
    applyToSelectedRoutes: row.apply_to_selected_routes,
    selectedRoutes: row.selected_routes || [],
    palette: row.palette,
    detectedPalette: row.detected_palette,
    paletteDetectionStatus: row.palette_detection_status,
    paletteDetectionMessage: row.palette_detection_message,
    paletteMatchMode: row.palette_match_mode,
    paletteSourceAssetId: row.palette_source_asset_id,
    paletteApprovedAt: toIso(row.palette_approved_at),
    experienceLevel: row.experience_level,
    animationLevel: row.animation_level,
    experienceConfig,
    assetAvailability: assetAvailabilityForPack({
      assets,
      level: row.experience_level,
      soundAvailable: experienceConfig.sound.available
    }),
    announcementBarEnabled: row.announcement_bar_enabled,
    announcementBarText: row.announcement_bar_text,
    announcementBarCtaLabel: row.announcement_bar_cta_label,
    announcementBarCtaHref: row.announcement_bar_cta_href,
    motif: row.motif,
    axoAccessory: row.axo_accessory,
    builtIn: row.built_in,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    assets
    ,activeFestivalPackId: row.active_festival_pack_id || null,
    activeSurfacePackIds
  };
}

function mapLoginControl(row: LoginControlRow): HolidayLoginControl {
  return {
    channel: row.channel,
    mode: row.mode,
    state: row.state,
    themeId: row.theme_id,
    startAt: toIso(row.start_at),
    endAt: toIso(row.end_at),
    timezone: row.timezone,
    enabled: row.enabled,
    lastFailureCode: row.last_failure_code,
    compositionConfig: resolveHolidayLoginComposition(
      row.composition_config
    ),
    versionNumber: Number(row.version_number || 1),
    approvalState: row.approval_state || "approved",
    previousApprovedConfig: row.previous_approved_config
      ? resolveHolidayLoginComposition(row.previous_approved_config)
      : null,
    lastChangedBy: row.last_changed_by_name,
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

let seedPromise: Promise<void> | null = null;

export function ensureBuiltInHolidayThemes() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    for (const builtIn of BUILT_IN_HOLIDAY_THEMES) {
      await dbQuery(
        `
          insert into holiday_themes (
            slug, name, festival_type, description, status, mode, is_enabled,
            scope, palette, experience_level, animation_level, announcement_bar_enabled,
            announcement_bar_text, motif, axo_accessory, experience_config, built_in,
            apply_to_login_screens, apply_to_client_login,
            apply_to_employee_login, apply_to_admin_login,
            apply_matching_website_palette, apply_axo_theme
          )
          values (
            $1, $2, $3, $4, 'draft', 'manual', true,
            $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13::jsonb, true,
            $14, $14, $14, false, $14, $14
          )
          on conflict (slug) do nothing
        `,
        [
          builtIn.slug,
          builtIn.name,
          builtIn.festivalType,
          builtIn.description,
          builtIn.scope,
          JSON.stringify(builtIn.palette),
          builtIn.experienceLevel,
          builtIn.animationLevel,
          Boolean(builtIn.announcement),
          builtIn.announcement,
          builtIn.motif,
          builtIn.axoAccessory,
          JSON.stringify(builtIn.experienceConfig),
          builtIn.slug !== DEFAULT_HOLIDAY_THEME_SLUG
        ]
      );
    }
  })().catch((error) => {
    seedPromise = null;
    throw error;
  });
  return seedPromise;
}

async function listThemes() {
  const result = await dbQuery<ThemeRow>(
    `
      select
        t.*,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', a.id,
              'libraryAssetId', a.library_asset_id,
              'role', a.asset_role,
              'variant', a.variant,
              'safeFileName', a.safe_file_name,
              'mimeType', a.mime_type,
              'fileSize', a.file_size,
              'checksumSha256', a.checksum_sha256,
              'durationSeconds', a.duration_seconds,
              'status', a.status,
              'reviewStatus', a.review_status,
              'qualityStatus', a.quality_status,
              'versionNumber', a.version_number,
              'previousAssetId', a.previous_asset_id,
              'intendedObject', a.intended_object,
              'intendedFestival', a.intended_festival,
              'assetCategory', a.asset_category,
              'visualStyle', a.visual_style,
              'sizeRestrictions', a.size_restrictions,
              'usageLocations', a.usage_locations,
              'placements', coalesce(
                (
                  select jsonb_agg(assignment.placement order by assignment.placement)
                  from festival_asset_assignments assignment
                  where assignment.asset_version_id = a.id
                    and assignment.theme_id = t.id
                    and assignment.state = 'active'
                ),
                '[]'::jsonb
              ),
              'lifecycleState', coalesce(library.lifecycle_state, 'active'),
              'libraryApprovalState', coalesce(library.approval_state, 'approved'),
              'isFallback', a.is_fallback,
              'approvedAt', a.approved_at,
              'createdAt', a.created_at
              ,'assetMetadata', a.asset_metadata
            )
            order by a.created_at desc
          ) filter (where a.id is not null),
          '[]'::jsonb
        ) as assets
      from holiday_themes t
      left join lateral (
        select distinct on (asset.id) asset.*
        from holiday_theme_assets asset
        left join festival_asset_assignments assigned
          on assigned.asset_version_id = asset.id
          and assigned.theme_id = t.id
          and assigned.state = 'active'
        where asset.theme_id = t.id
           or assigned.id is not null
        order by asset.id, asset.created_at desc
      ) a on true
      left join festival_asset_library library on library.id = a.library_asset_id
      group by t.id
      order by lower(t.name), t.name
    `
  );
  return result.rows.map(mapTheme);
}

async function getSettings() {
  const result = await dbQuery<SettingsRow>(
    `
      select s.*, u.name as last_switched_by_name
      from website_experience_settings s
      left join admin_users u on u.id = s.last_switched_by
      where singleton_key = 'global'
      limit 1
    `
  );
  if (!result.rows[0]) {
    throw new ApiError(503, "NOT_CONFIGURED", "Website Experience is not configured.");
  }
  return mapSettings(result.rows[0]);
}

async function getLoginControls() {
  const result = await dbQuery<LoginControlRow>(
    `
      select
        control.channel, control.mode, control.state, control.theme_id,
        control.start_at, control.end_at, control.timezone,
        control.enabled, control.last_failure_code,
        control.composition_config, control.version_number,
        control.approval_state, control.previous_approved_config,
        actor.name as last_changed_by_name, control.updated_at
      from holiday_login_theme_settings control
      left join admin_users actor on actor.id = control.last_changed_by
      order by case channel
        when 'client' then 1
        when 'employee' then 2
        else 3
      end
    `
  );
  return result.rows.map(mapLoginControl);
}

function loginChannelForRoute(route: string): HolidayLoginChannel | null {
  const normalized = normalizeHolidayRoute(route);
  if (normalized === "/client-login") return "client";
  if (normalized === "/employee-login") return "employee";
  if (normalized === "/admin/login") return "admin";
  return null;
}

function resolveLoginTheme({
  route,
  controls,
  themes,
  now = new Date()
}: {
  route: string;
  controls: HolidayLoginControl[];
  themes: HolidayTheme[];
  now?: Date;
}) {
  const channel = loginChannelForRoute(route);
  if (!channel) return null;
  const control = controls.find((item) => item.channel === channel);
  if (
    !control ||
    !control.enabled ||
    control.mode !== "holiday" ||
    !control.themeId ||
    ["default_active", "theme_paused", "fallback_active", "asset_failed"].includes(
      control.state
    )
  ) {
    return null;
  }
  if (control.state === "theme_scheduled") {
    const start = control.startAt ? new Date(control.startAt) : null;
    const end = control.endAt ? new Date(control.endAt) : null;
    if (!start || !end || now < start || now >= end) return null;
  }
  const theme = themes.find(
    (item) =>
      item.id === control.themeId &&
      item.status !== "archived" &&
      item.isEnabled &&
      item.experienceConfig.approvalStatus === "approved"
  );
  if (!theme) return null;
  if (
    channel === "client" &&
    (!theme.applyToLoginScreens || !theme.applyToClientLogin)
  ) {
    return null;
  }
  if (
    channel === "employee" &&
    (!theme.applyToLoginScreens || !theme.applyToEmployeeLogin)
  ) {
    return null;
  }
  if (
    channel === "admin" &&
    (!theme.applyToLoginScreens || !theme.applyToAdminLogin)
  ) {
    return null;
  }
  return theme;
}

async function listAudits(limit = 24) {
  const result = await dbQuery<AuditRow>(
    `
      select
        a.id,
        a.action,
        t.name as theme_name,
        u.name as actor_name,
        a.affected_scope,
        a.safe_metadata,
        a.created_at
      from holiday_theme_audit a
      left join holiday_themes t on t.id = a.theme_id
      left join admin_users u on u.id = a.actor_admin_user_id
      order by a.created_at desc
      limit $1
    `,
    [limit]
  );
  return result.rows.map(
    (row): HolidayAuditEvent => ({
      id: row.id,
      action: row.action,
      themeName: row.theme_name,
      actorName: row.actor_name,
      affectedScope: row.affected_scope,
      safeMetadata: row.safe_metadata || {},
      createdAt: new Date(row.created_at).toISOString()
    })
  );
}

function assetWarnings(themes: HolidayTheme[]) {
  return themes.flatMap((theme) => {
    if (theme.status === "archived" || theme.slug === DEFAULT_HOLIDAY_THEME_SLUG) {
      return [];
    }
    const activeAssets = theme.assets.filter(
      (asset) => asset.status === "active"
    );
    const warnings: string[] = [];
    if (
      theme.applyToLoginScreens &&
      !activeAssets.some((asset) =>
        ["login_desktop", "login_background"].includes(asset.role)
      )
    ) {
      warnings.push(
        `${theme.name}: desktop login artwork is missing; the palette fallback will be used.`
      );
    }
    if (
      theme.applyToLoginScreens &&
      !activeAssets.some((asset) =>
        ["login_mobile", "login_background"].includes(asset.role)
      )
    ) {
      warnings.push(
        `${theme.name}: mobile login artwork is missing; the responsive fallback will be used.`
      );
    }
    if (
      ["pending_review", "needs_review", "failed"].includes(
        theme.paletteDetectionStatus
      )
    ) {
      warnings.push(
        `${theme.name}: the detected palette requires Super Admin review before activation.`
      );
    }
    if (
      theme.applyAxoTheme &&
      !activeAssets.some((asset) => asset.role === "axo")
    ) {
      warnings.push(
        `${theme.name}: Axo uses the lightweight built-in accessory fallback.`
      );
    }
    return warnings;
  });
}

async function reconcileResolvedTheme(
  settings: HolidayExperienceSettings,
  activeTheme: HolidayTheme | null
) {
  if (settings.lastResolvedThemeId === (activeTheme?.id || null)) return;
  const action = activeTheme
    ? "auto_activation_triggered"
    : "auto_restoration_triggered";
  await withDbTransaction(async (query) => {
    await query(
      `
        update website_experience_settings
        set
          active_theme_id = $1,
          last_resolved_theme_id = $1,
          last_switched_at = now(),
          last_switched_by = null,
          updated_at = now()
        where singleton_key = 'global'
      `,
      [activeTheme?.id || null]
    );
    await query(
      `
        insert into holiday_theme_audit (
          theme_id, actor_type, action, affected_scope, safe_metadata
        )
        values ($1, 'system', $2, $3, $4::jsonb)
      `,
      [
        activeTheme?.id || null,
        action,
        activeTheme?.scope || "default",
        JSON.stringify({ resolver: "calendar", safeFallback: !activeTheme })
      ]
    );
    return null;
  });
}

export async function getResolvedHolidayTheme({
  previewThemeId,
  reconcile = true,
  route = "/"
}: {
  previewThemeId?: string | null;
  reconcile?: boolean;
  route?: string;
} = {}) {
  await ensureBuiltInHolidayThemes();
  const [settings, themes, loginControls] = await Promise.all([
    getSettings(),
    listThemes(),
    getLoginControls()
  ]);
  const loginRoute = isLoginRoute(route);
  const activeTheme = previewThemeId
    ? resolveHolidayTheme({ settings, themes, previewThemeId })
    : loginRoute
      ? resolveLoginTheme({ route, controls: loginControls, themes })
      : resolveHolidayTheme({ settings, themes });
  if (reconcile && !previewThemeId && !loginRoute) {
    await reconcileResolvedTheme(settings, activeTheme);
  }
  return { settings, themes, activeTheme, loginControls };
}

export async function getHolidayExperienceSnapshot({
  previewThemeId,
  reconcile = true
}: {
  previewThemeId?: string | null;
  reconcile?: boolean;
} = {}): Promise<HolidayExperienceSnapshot> {
  const [{ settings, themes, activeTheme, loginControls }, audits] = await Promise.all([
    getResolvedHolidayTheme({ previewThemeId, reconcile }),
    listAudits()
  ]);

  return {
    settings: reconcile
      ? {
          ...settings,
          activeThemeId: activeTheme?.id || null,
          lastResolvedThemeId: activeTheme?.id || null
        }
      : settings,
    themes,
    activeTheme,
    nextScheduledTheme: findNextScheduledTheme(themes),
    audits,
    assetWarnings: assetWarnings(themes),
    loginControls
  };
}

function safeActionMetadata(action: HolidayAdminAction) {
  if (action.action === "create") {
    return {
      action: action.action,
      category: action.festivalType,
      experienceLevel: action.experienceLevel
    };
  }
  if (action.action !== "update") return { action: action.action };
  const headerOrnaments = action.experienceConfig.headerOrnaments;
  return {
    action: action.action,
    category: action.festivalType,
    experienceLevel: action.experienceLevel,
    status: action.status,
    mode: action.mode,
    scope: action.scope,
    repeatYearly: action.repeatYearly,
    priority: action.priority,
    paletteMatchMode: action.paletteMatchMode,
    applyToClientLogin: action.applyToClientLogin,
    applyToEmployeeLogin: action.applyToEmployeeLogin,
    applyToAdminLogin: action.applyToAdminLogin,
    applyMatchingWebsitePalette: action.applyMatchingWebsitePalette,
    applyAxoTheme: action.applyAxoTheme,
    headerDecoration: {
      enabled: action.applyToHeader && headerOrnaments.enabled,
      railEnabled: headerOrnaments.railEnabled,
      mode: headerOrnaments.mode,
      density: headerOrnaments.density,
      motionLevel: headerOrnaments.motionLevel,
      mobileSimplified: headerOrnaments.mobileSimplified,
      horizontalPlacement: headerOrnaments.horizontalPlacement,
      verticalPlacement: headerOrnaments.verticalPlacement,
      hangingLengthPreset: headerOrnaments.hangingLengthPreset,
      ornamentCount: headerOrnaments.ornamentCount
    }
  };
}

function animationForExperienceLevel(
  level: HolidayExperienceLevel
): HolidayAnimationLevel {
  if (level === "accent_only") return "none";
  if (level === "enhanced") return "standard";
  return "subtle";
}

function safeThemeSlug(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 56) || "custom-event"
  );
}

export async function applyHolidayAdminAction(
  action: HolidayAdminAction,
  actorId: string
) {
  await ensureBuiltInHolidayThemes();
  let affectedThemeId = "themeId" in action ? action.themeId : null;

  await withDbTransaction(async (query) => {
    if (action.action === "create") {
      const generic =
        BUILT_IN_HOLIDAY_THEMES.find((theme) => theme.slug === "custom-event") ||
        BUILT_IN_HOLIDAY_THEMES.find(
          (theme) => theme.slug === DEFAULT_HOLIDAY_THEME_SLUG
        );
      if (!generic) {
        throw new ApiError(
          500,
          "SERVER_ERROR",
          "The safe theme template is unavailable."
        );
      }
      const suffix = Date.now().toString(36);
      const created = await query<{ id: string }>(
        `
          insert into holiday_themes (
            slug, name, festival_type, description, status, mode, timezone,
            priority, is_enabled, scope, apply_to_header, apply_to_footer,
            apply_to_homepage, apply_to_login_screens,
            apply_to_client_login, apply_to_employee_login, apply_to_admin_login,
            apply_matching_website_palette, apply_axo_theme,
            apply_to_selected_routes,
            selected_routes, palette, experience_level, animation_level,
            experience_config, announcement_bar_enabled, motif, axo_accessory, built_in,
            created_by, updated_by
          )
          values (
            $1, $2, $3, $4, 'draft', 'manual', 'Asia/Kolkata',
            50, true, 'entire_public', true, true,
            true, true, true, true, false, true, true, false, '{}',
            $5::jsonb, $6, $7, $8::jsonb, false, $9, $10, false, $11, $11
          )
          returning id
        `,
        [
          `${safeThemeSlug(action.name)}-${suffix}`,
          action.name,
          action.festivalType,
          action.description,
          JSON.stringify(generic.palette),
          action.experienceLevel,
          animationForExperienceLevel(action.experienceLevel),
          JSON.stringify({
            ...generic.experienceConfig,
            approvalStatus: "draft"
          }),
          generic.motif,
          generic.axoAccessory,
          actorId
        ]
      );
      affectedThemeId = created[0]?.id || null;
    } else if (action.action === "update_login_composition") {
      const config = resolveHolidayLoginComposition(action.compositionConfig);
      const activationErrors = loginCompositionActivationErrors(config);
      if (
        ["validate", "approve", "activate"].includes(action.intent) &&
        activationErrors.length > 0
      ) {
        throw badRequest(activationErrors[0]);
      }
      if (action.intent === "activate" && !action.themeId) {
        throw badRequest("Choose an approved theme before activation.");
      }
      if (action.themeId) {
        const theme = await query<{
          id: string;
          palette_detection_status: HolidayTheme["paletteDetectionStatus"];
          experience_config: Partial<HolidayTheme["experienceConfig"]> | null;
        }>(
          `
            select id, palette_detection_status, experience_config
            from holiday_themes
            where id = $1 and status <> 'archived' and is_enabled = true
            limit 1
          `,
          [action.themeId]
        );
        if (!theme[0]) throw badRequest("The login theme is unavailable.");
        if (
          action.intent === "activate" &&
          ["pending_review", "needs_review", "failed"].includes(
            theme[0].palette_detection_status
          )
        ) {
          throw badRequest("Approve the theme palette before login activation.");
        }
        if (
          action.intent === "activate" &&
          resolveExperiencePack(
            "custom",
            theme[0].experience_config
          ).approvalStatus !== "approved"
        ) {
          throw badRequest(
            "Approve the complete festival pack before login activation."
          );
        }
      }
      const current = await query<{
        theme_id: string | null;
        version_number: number | string;
        composition_config: HolidayLoginControl["compositionConfig"];
        previous_approved_config:
          | HolidayLoginControl["compositionConfig"]
          | null;
        approval_state: HolidayLoginControl["approvalState"];
      }>(
        `
          select theme_id, version_number, composition_config,
                 previous_approved_config, approval_state
          from holiday_login_theme_settings
          where channel = $1
          for update
        `,
        [action.channel]
      );
      if (!current[0]) throw badRequest("The login channel is unavailable.");
      const nextVersion = Number(current[0].version_number || 1) + 1;
      const approvalState =
        action.intent === "save_draft"
          ? "draft"
          : action.intent === "validate"
            ? "validated"
            : "approved";
      const previousApproved =
        current[0].approval_state === "approved"
          ? current[0].composition_config
          : current[0].previous_approved_config;
      await query(
        `
          update holiday_login_theme_settings
          set composition_config = $2::jsonb,
              version_number = $3,
              approval_state = $4,
              previous_approved_config = $5::jsonb,
              last_validated_at = case
                when $6 in ('validate', 'approve', 'activate') then now()
                else last_validated_at
              end,
              approved_at = case
                when $6 in ('approve', 'activate') then now()
                else approved_at
              end,
              approved_by = case
                when $6 in ('approve', 'activate') then $7
                else approved_by
              end,
              theme_id = case when $6 = 'activate' then $8 else theme_id end,
              mode = case when $6 = 'activate' then 'holiday' else mode end,
              state = case when $6 = 'activate' then 'theme_active' else state end,
              enabled = case when $6 = 'activate' then true else enabled end,
              last_failure_code = null,
              last_changed_by = $7,
              updated_at = now()
          where channel = $1
        `,
        [
          action.channel,
          JSON.stringify(config),
          nextVersion,
          approvalState,
          previousApproved ? JSON.stringify(previousApproved) : null,
          action.intent,
          actorId,
          action.themeId
        ]
      );
      await query(
        `
          insert into holiday_login_theme_versions (
            channel, theme_id, version_number, composition_config,
            version_state, changed_by, change_reason
          )
          values ($1, $2, $3, $4::jsonb, $5, $6, $7)
        `,
        [
          action.channel,
          action.themeId || current[0].theme_id,
          nextVersion,
          JSON.stringify(config),
          action.intent === "activate" ? "active" : approvalState,
          actorId,
          action.intent
        ]
      );
      affectedThemeId = action.themeId || current[0].theme_id;
    } else if (action.action === "copy_login_composition") {
      const source = await query<{
        composition_config: HolidayLoginControl["compositionConfig"];
        theme_id: string | null;
      }>(
        `
          select composition_config, theme_id
          from holiday_login_theme_settings
          where channel = $1
          limit 1
        `,
        [action.from]
      );
      if (!source[0]) throw badRequest("The source login channel is unavailable.");
      const target = await query<{ version_number: number | string }>(
        `
          update holiday_login_theme_settings
          set previous_approved_config = case
                when approval_state = 'approved' then composition_config
                else previous_approved_config
              end,
              composition_config = $2::jsonb,
              version_number = version_number + 1,
              approval_state = 'draft',
              last_changed_by = $3,
              updated_at = now()
          where channel = $1
          returning version_number
        `,
        [action.to, JSON.stringify(source[0].composition_config), actorId]
      );
      if (!target[0]) throw badRequest("The target login channel is unavailable.");
      await query(
        `
          insert into holiday_login_theme_versions (
            channel, theme_id, version_number, composition_config,
            version_state, changed_by, change_reason
          )
          values ($1, $2, $3, $4::jsonb, 'draft', $5, $6)
        `,
        [
          action.to,
          source[0].theme_id,
          Number(target[0].version_number),
          JSON.stringify(source[0].composition_config),
          actorId,
          `copied_from_${action.from}`
        ]
      );
      affectedThemeId = source[0].theme_id;
    } else if (action.action === "restore_login_channel_default") {
      const defaults = defaultHolidayLoginComposition();
      const restored = await query<{
        version_number: number | string;
        theme_id: string | null;
      }>(
        `
          update holiday_login_theme_settings
          set previous_approved_config = case
                when approval_state = 'approved' then composition_config
                else previous_approved_config
              end,
              composition_config = $2::jsonb,
              version_number = version_number + 1,
              approval_state = 'approved',
              mode = 'default',
              state = 'default_active',
              theme_id = null,
              start_at = null,
              end_at = null,
              last_failure_code = null,
              last_changed_by = $3,
              approved_at = now(),
              approved_by = $3,
              updated_at = now()
          where channel = $1
          returning version_number, theme_id
        `,
        [action.channel, JSON.stringify(defaults), actorId]
      );
      if (!restored[0]) throw badRequest("The login channel is unavailable.");
      await query(
        `
          insert into holiday_login_theme_versions (
            channel, theme_id, version_number, composition_config,
            version_state, changed_by, change_reason
          )
          values ($1, null, $2, $3::jsonb, 'restored', $4, 'restore_default')
        `,
        [
          action.channel,
          Number(restored[0].version_number),
          JSON.stringify(defaults),
          actorId
        ]
      );
      affectedThemeId = restored[0].theme_id;
    } else if (action.action === "set_login_channel") {
      if (action.mode === "holiday" && !action.themeId) {
        throw badRequest("Choose an approved holiday theme for this login screen.");
      }
      if (action.themeId) {
        const theme = await query<{
          id: string;
          palette_detection_status: HolidayTheme["paletteDetectionStatus"];
          experience_config: Partial<HolidayTheme["experienceConfig"]> | null;
        }>(
          `
            select id, palette_detection_status, experience_config
            from holiday_themes
            where id = $1 and status <> 'archived' and is_enabled = true
            limit 1
          `,
          [action.themeId]
        );
        if (!theme[0]) throw badRequest("The login theme is unavailable.");
        if (
          ["pending_review", "needs_review", "failed"].includes(
            theme[0].palette_detection_status
          )
        ) {
          throw badRequest("Approve the theme palette before login activation.");
        }
        if (
          resolveExperiencePack(
            "custom",
            theme[0].experience_config
          ).approvalStatus !== "approved"
        ) {
          throw badRequest(
            "Approve the complete festival pack before login activation."
          );
        }
      }
      await query(
        `
          update holiday_login_theme_settings
          set mode = $2,
              state = case when $2 = 'default' then 'default_active' else $3 end,
              theme_id = case when $2 = 'default' then null else $4 end,
              start_at = null,
              end_at = null,
              last_failure_code = null,
              last_changed_by = $5,
              updated_at = now()
          where channel = $1
        `,
        [
          action.channel,
          action.mode,
          action.state,
          action.themeId,
          actorId
        ]
      );
      affectedThemeId = action.themeId;
    } else if (action.action === "apply_login_theme_both") {
      const theme = await query<{
        id: string;
        palette_detection_status: HolidayTheme["paletteDetectionStatus"];
        experience_config: Partial<HolidayTheme["experienceConfig"]> | null;
      }>(
        `
          select id, palette_detection_status, experience_config
          from holiday_themes
          where id = $1 and status <> 'archived' and is_enabled = true
          limit 1
        `,
        [action.themeId]
      );
      if (!theme[0]) throw badRequest("The login theme is unavailable.");
      if (
        ["pending_review", "needs_review", "failed"].includes(
          theme[0].palette_detection_status
        )
      ) {
        throw badRequest("Approve the theme palette before login activation.");
      }
      if (
        resolveExperiencePack(
          "custom",
          theme[0].experience_config
        ).approvalStatus !== "approved"
      ) {
        throw badRequest(
          "Approve the complete festival pack before login activation."
        );
      }
      await query(
        `
          update holiday_login_theme_settings
          set mode = 'holiday',
              state = 'theme_active',
              theme_id = $1,
              start_at = null,
              end_at = null,
              enabled = true,
              last_failure_code = null,
              last_changed_by = $2,
              updated_at = now()
          where channel in ('client', 'employee')
        `,
        [action.themeId, actorId]
      );
      affectedThemeId = action.themeId;
    } else if (action.action === "schedule_login_theme") {
      const theme = await query<{
        id: string;
        experience_config: Partial<HolidayTheme["experienceConfig"]> | null;
      }>(
        `
          select id, experience_config from holiday_themes
          where id = $1 and status <> 'archived' and is_enabled = true
          limit 1
        `,
        [action.themeId]
      );
      if (!theme[0]) throw badRequest("The scheduled login theme is unavailable.");
      if (
        resolveExperiencePack(
          "custom",
          theme[0].experience_config
        ).approvalStatus !== "approved"
      ) {
        throw badRequest(
          "Approve the complete festival pack before scheduling it."
        );
      }
      const channels =
        action.channel === "both"
          ? ["client", "employee"]
          : [action.channel];
      await query(
        `
          update holiday_login_theme_settings
          set mode = 'holiday',
              state = 'theme_scheduled',
              theme_id = $1,
              start_at = $2,
              end_at = $3,
              enabled = true,
              last_failure_code = null,
              last_changed_by = $5,
              updated_at = now()
          where channel = any($4::text[])
        `,
        [action.themeId, action.startAt, action.endAt, channels, actorId]
      );
      affectedThemeId = action.themeId;
    } else if (action.action === "disable_login_theme") {
      await query(
        `
          update holiday_login_theme_settings
          set state = case when mode = 'holiday' then 'theme_paused' else 'default_active' end,
              last_changed_by = $1,
              updated_at = now()
          where channel in ('client', 'employee', 'admin')
        `,
        [actorId]
      );
    } else if (
      action.action === "restore_login_defaults" ||
      action.action === "emergency_reset_logins"
    ) {
      const defaultComposition = defaultHolidayLoginComposition();
      await query(
        `
          update holiday_login_theme_settings
          set mode = 'default',
              state = 'default_active',
              theme_id = null,
              previous_approved_config = case
                when approval_state = 'approved' then composition_config
                else previous_approved_config
              end,
              composition_config = $2::jsonb,
              version_number = version_number + 1,
              approval_state = 'approved',
              start_at = null,
              end_at = null,
              last_failure_code = null,
              enabled = case when channel = 'admin' then false else true end,
              last_changed_by = $1,
              approved_at = now(),
              approved_by = $1,
              updated_at = now()
        `,
        [actorId, JSON.stringify(defaultComposition)]
      );
    } else if (action.action === "set_master") {
      await query(
        `
          update website_experience_settings
          set holiday_mode_enabled = $1,
              emergency_disabled = case when $1 then false else emergency_disabled end,
              updated_at = now()
          where singleton_key = 'global'
        `,
        [action.enabled]
      );
    } else if (action.action === "set_auto") {
      await query(
        `
          update website_experience_settings
          set auto_schedule_enabled = $1, updated_at = now()
          where singleton_key = 'global'
        `,
        [action.enabled]
      );
    } else if (action.action === "emergency_disable") {
      await query(
        `
          update website_experience_settings
          set holiday_mode_enabled = false,
              emergency_disabled = true,
              active_theme_id = null,
              manual_override_theme_id = null,
              last_resolved_theme_id = null,
              last_switched_at = now(),
              last_switched_by = $1,
              updated_at = now()
          where singleton_key = 'global'
        `,
        [actorId]
      );
      await query(
        "update holiday_themes set status = 'paused', updated_at = now() where status = 'active'"
      );
    } else if (action.action === "restore_default") {
      await query(
        `
          update website_experience_settings
          set holiday_mode_enabled = false,
              emergency_disabled = false,
              active_theme_id = null,
              manual_override_theme_id = null,
              last_resolved_theme_id = null,
              last_switched_at = now(),
              last_switched_by = $1,
              updated_at = now()
          where singleton_key = 'global'
        `,
        [actorId]
      );
      await query(
        "update holiday_themes set status = 'paused', updated_at = now() where status = 'active'"
      );
    } else if (action.action === "activate") {
      const themes = await query<{
        id: string;
        slug: string;
        palette_detection_status: HolidayTheme["paletteDetectionStatus"];
        experience_config: Partial<HolidayTheme["experienceConfig"]> | null;
      }>(
        "select id, slug, palette_detection_status, experience_config from holiday_themes where id = $1 and status <> 'archived' for update",
        [action.themeId]
      );
      if (!themes[0] || themes[0].slug === DEFAULT_HOLIDAY_THEME_SLUG) {
        throw badRequest("Choose an available holiday theme.");
      }
      if (
        ["pending_review", "needs_review", "failed"].includes(
          themes[0].palette_detection_status
        )
      ) {
        throw badRequest(
          "Review and approve the detected palette before activation."
        );
      }
      if (
        resolveExperiencePack(
          themes[0].slug,
          themes[0].experience_config
        ).approvalStatus !== "approved"
      ) {
        throw badRequest("Approve the complete festival pack before activation.");
      }
      const unsafeAssets = await query<{ count: number | string }>(
        `
          select count(*) as count
          from holiday_theme_assets
          where theme_id = $1
            and status in ('active', 'staged')
            and (
              review_status <> 'approved'
              or quality_status not in (
                'approved',
                'approved_with_size_restrictions'
              )
            )
        `,
        [action.themeId]
      );
      if (Number(unsafeAssets[0]?.count || 0) > 0) {
        throw badRequest(
          "Review or remove every ambiguous, pending or replacement-needed asset before activation."
        );
      }
      await query(
        "update holiday_themes set status = 'paused', updated_at = now() where status = 'active' and id <> $1",
        [action.themeId]
      );
      await query(
        `
          update holiday_themes
          set status = 'active', mode = 'manual', is_enabled = true,
              activated_by = $2, updated_by = $2, updated_at = now()
          where id = $1
        `,
        [action.themeId, actorId]
      );
      await query(
        `
          update website_experience_settings
          set holiday_mode_enabled = true,
              emergency_disabled = false,
              active_theme_id = $1,
              manual_override_theme_id = $1,
              last_resolved_theme_id = $1,
              last_switched_at = now(),
              last_switched_by = $2,
              updated_at = now()
          where singleton_key = 'global'
        `,
        [action.themeId, actorId]
      );
    } else if (action.action === "deactivate" || action.action === "end_early") {
      await query(
        "update holiday_themes set status = 'paused', updated_by = $2, updated_at = now() where id = $1",
        [action.themeId, actorId]
      );
      await query(
        `
          update website_experience_settings
          set active_theme_id = case when active_theme_id = $1 then null else active_theme_id end,
              manual_override_theme_id = case when manual_override_theme_id = $1 then null else manual_override_theme_id end,
              last_resolved_theme_id = case when last_resolved_theme_id = $1 then null else last_resolved_theme_id end,
              last_switched_at = now(),
              last_switched_by = $2,
              updated_at = now()
          where singleton_key = 'global'
        `,
        [action.themeId, actorId]
      );
    } else if (action.action === "pause") {
      await query(
        "update holiday_themes set status = 'paused', updated_by = $2, updated_at = now() where id = $1 and status <> 'archived'",
        [action.themeId, actorId]
      );
    } else if (action.action === "resume") {
      await query(
        `
          update holiday_themes
          set status = case when start_at is not null and end_at is not null then 'scheduled' else 'draft' end,
              is_enabled = true, updated_by = $2, updated_at = now()
          where id = $1 and status = 'paused'
        `,
        [action.themeId, actorId]
      );
    } else if (action.action === "archive") {
      const themes = await query<{ slug: string }>(
        "select slug from holiday_themes where id = $1 for update",
        [action.themeId]
      );
      if (!themes[0] || themes[0].slug === DEFAULT_HOLIDAY_THEME_SLUG) {
        throw badRequest("The default theme cannot be archived.");
      }
      await query(
        `
          update holiday_themes
          set status = 'archived', is_enabled = false, archived_at = now(),
              updated_by = $2, updated_at = now()
          where id = $1
        `,
        [action.themeId, actorId]
      );
      await query(
        `
          update website_experience_settings
          set active_theme_id = case when active_theme_id = $1 then null else active_theme_id end,
              manual_override_theme_id = case when manual_override_theme_id = $1 then null else manual_override_theme_id end,
              updated_at = now()
          where singleton_key = 'global'
        `,
        [action.themeId]
      );
    } else if (action.action === "duplicate") {
      const source = await query<ThemeRow>(
        "select *, '[]'::jsonb as assets from holiday_themes where id = $1 and status <> 'archived' limit 1",
        [action.themeId]
      );
      if (!source[0]) throw badRequest("Theme was not found.");
      const copy = source[0];
      const suffix = Date.now().toString(36);
      const duplicated = await query<{ id: string }>(
        `
          insert into holiday_themes (
            slug, name, festival_type, description, status, mode, timezone,
            priority, is_enabled, scope, apply_to_header, apply_to_footer,
            apply_to_homepage, apply_to_login_screens,
            apply_to_client_login, apply_to_employee_login, apply_to_admin_login,
            apply_matching_website_palette, apply_axo_theme,
            apply_to_selected_routes, selected_routes, palette,
            palette_match_mode, experience_level, animation_level, experience_config,
            announcement_bar_enabled,
            announcement_bar_text, announcement_bar_cta_label,
            announcement_bar_cta_href, motif, axo_accessory, built_in,
            created_by, updated_by
          )
          values (
            $1, $2, $3, $4, 'draft', 'manual', $5, $6, true, $7, $8, $9,
            $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb,
            $20, $21, $22, $23::jsonb, $24, $25, $26, $27, $28, $29, false, $30, $30
          )
          returning id
        `,
        [
          `${copy.slug}-copy-${suffix}`,
          `${copy.name} Copy`,
          copy.festival_type,
          copy.description,
          copy.timezone,
          copy.priority,
          copy.scope,
          copy.apply_to_header,
          copy.apply_to_footer,
          copy.apply_to_homepage,
          copy.apply_to_login_screens,
          copy.apply_to_client_login,
          copy.apply_to_employee_login,
          copy.apply_to_admin_login,
          copy.apply_matching_website_palette,
          copy.apply_axo_theme,
          copy.apply_to_selected_routes,
          copy.selected_routes,
          JSON.stringify(copy.palette),
          copy.palette_match_mode,
          copy.experience_level,
          copy.animation_level,
          JSON.stringify(copy.experience_config || {}),
          copy.announcement_bar_enabled,
          copy.announcement_bar_text,
          copy.announcement_bar_cta_label,
          copy.announcement_bar_cta_href,
          copy.motif,
          copy.axo_accessory,
          actorId
        ]
      );
      affectedThemeId = duplicated[0]?.id || null;
    } else if (action.action === "update") {
      if (action.festivalType === "system_default") {
        const target = await query<{ slug: string }>(
          "select slug from holiday_themes where id = $1 limit 1",
          [action.themeId]
        );
        if (target[0]?.slug !== DEFAULT_HOLIDAY_THEME_SLUG) {
          throw badRequest("System default is reserved for the default theme.");
        }
      }
      await query(
        `
          update holiday_themes
          set name = $2,
              description = $3,
              festival_type = $4,
              experience_level = $5,
              status = $6,
              mode = $7,
              start_at = $8,
              end_at = $9,
              timezone = $10,
              repeat_yearly = $11,
              priority = $12,
              is_enabled = $13,
              scope = $14,
              apply_to_header = $15,
              apply_to_footer = $16,
              apply_to_homepage = $17,
              apply_to_login_screens = $18,
              apply_to_client_login = $19,
              apply_to_employee_login = $20,
              apply_to_admin_login = $21,
              apply_matching_website_palette = $22,
              apply_axo_theme = $23,
              apply_to_selected_routes = $24,
              selected_routes = $25,
              palette = $26::jsonb,
              palette_match_mode = $27,
              animation_level = $28,
              experience_config = $29::jsonb,
              announcement_bar_enabled = $30,
              announcement_bar_text = $31,
              announcement_bar_cta_label = $32,
              announcement_bar_cta_href = $33,
              updated_by = $34,
              updated_at = now()
          where id = $1 and status <> 'archived'
        `,
        [
          action.themeId,
          action.name,
          action.description,
          action.festivalType,
          action.experienceLevel,
          action.status,
          action.mode,
          action.startAt,
          action.endAt,
          action.timezone,
          action.repeatYearly,
          action.priority,
          action.isEnabled,
          action.scope,
          action.applyToHeader,
          action.applyToFooter,
          action.applyToHomepage,
          action.applyToLoginScreens,
          action.applyToClientLogin,
          action.applyToEmployeeLogin,
          action.applyToAdminLogin,
          action.applyMatchingWebsitePalette,
          action.applyAxoTheme,
          action.applyToSelectedRoutes,
          action.selectedRoutes,
          JSON.stringify(action.palette),
          action.paletteMatchMode,
          animationForExperienceLevel(action.experienceLevel),
          JSON.stringify(action.experienceConfig),
          action.announcementBarEnabled,
          action.announcementBarText,
          action.announcementBarCtaLabel,
          action.announcementBarCtaHref,
          actorId
        ]
      );
    }

    await query(
      `
        insert into holiday_theme_audit (
          theme_id, actor_admin_user_id, actor_type, action,
          affected_scope, safe_metadata
        )
        values (
          $1, $2, 'admin', $3,
          (select scope from holiday_themes where id = $1),
          $4::jsonb
        )
      `,
      [
        affectedThemeId,
        actorId,
        action.action,
        JSON.stringify(safeActionMetadata(action))
      ]
    );
    return null;
  });

  return getHolidayExperienceSnapshot();
}

export async function getHolidayPaletteSourceAsset(themeId: string) {
  const result = await dbQuery<{
    id: string;
    theme_id: string;
    asset_role: HolidayThemeAsset["role"];
    s3_key: string;
    mime_type: string;
    safe_file_name: string;
  }>(
    `
      select id, theme_id, asset_role, s3_key, mime_type, safe_file_name
      from holiday_theme_assets
      where theme_id = $1
        and status in ('active', 'staged')
        and asset_role in (
          'reference_image',
          'hero_art',
          'login_desktop',
          'login_background',
          'login_mobile'
        )
      order by
        case asset_role
          when 'reference_image' then 1
          when 'hero_art' then 2
          when 'login_desktop' then 3
          when 'login_background' then 4
          else 5
        end,
        created_at desc
      limit 1
    `,
    [themeId]
  );
  return result.rows[0] || null;
}

export async function saveHolidayDetectedPalette({
  themeId,
  sourceAssetId,
  detectedPalette,
  status,
  message,
  actorId
}: {
  themeId: string;
  sourceAssetId: string;
  detectedPalette: HolidayExtractedPalette;
  status: "pending_review" | "needs_review";
  message: string | null;
  actorId: string;
}) {
  await withDbTransaction(async (query) => {
    const updated = await query<{ id: string; scope: string }>(
      `
        update holiday_themes
        set detected_palette = $2::jsonb,
            palette_detection_status = $3,
            palette_detection_message = $4,
            palette_source_asset_id = $5,
            palette_approved_at = null,
            palette_approved_by = null,
            updated_by = $6,
            updated_at = now()
        where id = $1 and status <> 'archived'
        returning id, scope
      `,
      [
        themeId,
        JSON.stringify(detectedPalette),
        status,
        message,
        sourceAssetId,
        actorId
      ]
    );
    if (!updated[0]) throw badRequest("Theme was not found.");
    await query(
      `
        insert into holiday_theme_audit (
          theme_id, actor_admin_user_id, action, affected_scope, safe_metadata
        )
        values ($1, $2, 'palette_detected', $3, $4::jsonb)
      `,
      [
        themeId,
        actorId,
        updated[0].scope,
        JSON.stringify({ status, sourceAssetId })
      ]
    );
    return null;
  });
  return getHolidayExperienceSnapshot();
}

export async function approveHolidayDetectedPalette({
  themeId,
  matchMode,
  actorId
}: {
  themeId: string;
  matchMode: HolidayTheme["paletteMatchMode"];
  actorId: string;
}) {
  await withDbTransaction(async (query) => {
    const themes = await query<{
      detected_palette: HolidayExtractedPalette | null;
      scope: string;
    }>(
      `
        select detected_palette, scope
        from holiday_themes
        where id = $1 and status <> 'archived'
        for update
      `,
      [themeId]
    );
    if (!themes[0]?.detected_palette) {
      throw badRequest("No detected palette is available for approval.");
    }
    const approved = toApprovedHolidayPalette(
      themes[0].detected_palette,
      matchMode
    );
    await query(
      `
        update holiday_themes
        set palette = $2::jsonb,
            palette_match_mode = $3,
            palette_detection_status = 'approved',
            palette_detection_message = null,
            palette_approved_at = now(),
            palette_approved_by = $4,
            updated_by = $4,
            updated_at = now()
        where id = $1
      `,
      [themeId, JSON.stringify(approved), matchMode, actorId]
    );
    await query(
      `
        insert into holiday_theme_audit (
          theme_id, actor_admin_user_id, action, affected_scope, safe_metadata
        )
        values ($1, $2, 'palette_approved', $3, $4::jsonb)
      `,
      [
        themeId,
        actorId,
        themes[0].scope,
        JSON.stringify({ matchMode, source: "detected" })
      ]
    );
    return null;
  });
  return getHolidayExperienceSnapshot();
}

export async function approveHolidayManualPalette({
  themeId,
  palette,
  matchMode,
  actorId
}: {
  themeId: string;
  palette: HolidayTheme["palette"];
  matchMode: HolidayTheme["paletteMatchMode"];
  actorId: string;
}) {
  await withDbTransaction(async (query) => {
    const updated = await query<{ scope: string }>(
      `
        update holiday_themes
        set palette = $2::jsonb,
            palette_match_mode = $3,
            palette_detection_status = 'approved',
            palette_detection_message = null,
            palette_approved_at = now(),
            palette_approved_by = $4,
            updated_by = $4,
            updated_at = now()
        where id = $1 and status <> 'archived'
        returning scope
      `,
      [themeId, JSON.stringify(palette), matchMode, actorId]
    );
    if (!updated[0]) throw badRequest("Theme was not found.");
    await query(
      `
        insert into holiday_theme_audit (
          theme_id, actor_admin_user_id, action, affected_scope, safe_metadata
        )
        values ($1, $2, 'palette_approved', $3, $4::jsonb)
      `,
      [
        themeId,
        actorId,
        updated[0].scope,
        JSON.stringify({ matchMode, source: "manual_adjustment" })
      ]
    );
    return null;
  });
  return getHolidayExperienceSnapshot();
}

export async function resetHolidaySafePalette({
  themeId,
  actorId
}: {
  themeId: string;
  actorId: string;
}) {
  const detected = safeNeutralExtractedPalette();
  const palette = toApprovedHolidayPalette(detected, "balanced_writex");
  await withDbTransaction(async (query) => {
    const updated = await query<{ scope: string }>(
      `
        update holiday_themes
        set detected_palette = $2::jsonb,
            palette = $3::jsonb,
            palette_match_mode = 'balanced_writex',
            palette_detection_status = 'approved',
            palette_detection_message = null,
            palette_approved_at = now(),
            palette_approved_by = $4,
            updated_by = $4,
            updated_at = now()
        where id = $1 and status <> 'archived'
        returning scope
      `,
      [themeId, JSON.stringify(detected), JSON.stringify(palette), actorId]
    );
    if (!updated[0]) throw badRequest("Theme was not found.");
    await query(
      `
        insert into holiday_theme_audit (
          theme_id, actor_admin_user_id, action, affected_scope, safe_metadata
        )
        values ($1, $2, 'palette_reset_safe', $3, $4::jsonb)
      `,
      [
        themeId,
        actorId,
        updated[0].scope,
        JSON.stringify({ matchMode: "balanced_writex" })
      ]
    );
    return null;
  });
  return getHolidayExperienceSnapshot();
}

export async function recordHolidayAssetFailure({
  themeId,
  role,
  route
}: {
  themeId: string;
  role: HolidayThemeAsset["role"];
  route: string;
}) {
  await dbQuery(
    `
      insert into holiday_theme_audit (
        theme_id, actor_type, action, affected_scope, safe_metadata
      )
      select id, 'system', 'asset_load_failed', scope, $2::jsonb
      from holiday_themes
      where id = $1 and status = 'active'
    `,
    [themeId, JSON.stringify({ role, route: route.slice(0, 160) })]
  );
  const channel = loginChannelForRoute(route);
  if (
    channel &&
    ["login_desktop", "login_mobile", "login_background"].includes(role)
  ) {
    await dbQuery(
      `
        update holiday_login_theme_settings
        set state = 'asset_failed',
            last_failure_code = 'login_asset_load_failed',
            updated_at = now()
        where channel = $1 and theme_id = $2 and mode = 'holiday'
      `,
      [channel, themeId]
    );
  }
}

export async function saveHolidayThemeAsset({
  themeId,
  role,
  variant,
  s3Key,
  safeFileName,
  mimeType,
  fileSize,
  checksumSha256,
  durationSeconds,
  actorId,
  detectedPalette,
  paletteDetectionStatus,
  paletteDetectionMessage,
  purpose = role === "audio" ? "audio" : "design_reference_only",
  placements = [],
  libraryAssetId = null,
  replacementMode = "keep_both",
  selectedAssignmentIds = [],
  sourceDimensions = null,
  embeddedUiState = "no_embedded_ui"
}: {
  themeId: string;
  role: HolidayThemeAsset["role"];
  variant: string;
  s3Key: string;
  safeFileName: string;
  mimeType: string;
  fileSize: number;
  checksumSha256: string;
  durationSeconds: number | null;
  actorId: string;
  detectedPalette?: HolidayExtractedPalette;
  paletteDetectionStatus?: HolidayTheme["paletteDetectionStatus"];
  paletteDetectionMessage?: string | null;
  purpose?: FestivalAssetPurpose;
  placements?: FestivalAssetPlacement[];
  libraryAssetId?: string | null;
  replacementMode?: "replace_everywhere" | "replace_selected" | "keep_both";
  selectedAssignmentIds?: string[];
  sourceDimensions?: {
    width: number | null;
    height: number | null;
    format: string | null;
  } | null;
  embeddedUiState?:
    | "needs_review"
    | "contains_embedded_ui"
    | "no_embedded_ui";
}) {
  return withDbTransaction(async (query) => {
    const theme = await query<{ id: string; scope: string }>(
      "select id, scope from holiday_themes where id = $1 and status <> 'archived' for update",
      [themeId]
    );
    if (!theme[0]) throw badRequest("Theme was not found.");
    const replacingExisting =
      Boolean(libraryAssetId) && replacementMode !== "keep_both";
    const existingLibrary = replacingExisting
      ? (
          await query<{
            id: string;
            current_version_asset_id: string | null;
            lifecycle_state: string;
          }>(
            `
              select id, current_version_asset_id, lifecycle_state
              from festival_asset_library
              where id = $1
              for update
            `,
            [libraryAssetId]
          )
        )[0]
      : null;
    if (
      replacingExisting &&
      (!existingLibrary ||
        !["active", "archived"].includes(existingLibrary.lifecycle_state))
    ) {
      throw badRequest("The asset selected for replacement was not found.");
    }
    const created = await query<{ id: string; version_number: number }>(
      `
        insert into holiday_theme_assets (
          theme_id, asset_role, variant, s3_key, safe_file_name,
          mime_type, file_size, checksum_sha256, duration_seconds,
          asset_metadata, status, review_status, quality_status,
          version_number, previous_asset_id, library_asset_id,
          version_state, uploaded_by
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          jsonb_build_object(
            'storage', 'private_s3',
            'playback', case when $2 = 'audio' then 'same_origin_opaque' else null end,
            'purpose', $11::text,
            'replacementMode', $12::text,
            'selectedAssignmentIds', $13::jsonb,
            'sourceDimensions', $16::jsonb,
            'embeddedUiState', $17::text,
            'responsivePipeline', case
              when $2 like 'login_%' then 'next_image_avif_webp_jpeg'
              else null
            end,
            'responsiveWidths', case
              when $2 like 'login_%'
                then '[480,768,960,1280,1536,1920,2560,3840,5120,7680]'::jsonb
              else '[]'::jsonb
            end
          ),
          'staged', 'pending_review', 'needs_visual_review',
          coalesce(
            (
              select max(version_number) + 1
              from holiday_theme_assets
              where library_asset_id = $14
            ),
            1
          ),
          $15,
          $14,
          case when $14 is null then 'current' else 'previous' end,
          $10
        )
        returning id, version_number
      `,
      [
        themeId,
        role,
        variant,
        s3Key,
        safeFileName,
        mimeType,
        fileSize,
        checksumSha256,
        durationSeconds,
        actorId,
        purpose,
        replacementMode,
        JSON.stringify(selectedAssignmentIds),
        replacingExisting ? libraryAssetId : null,
        replacingExisting ? existingLibrary?.current_version_asset_id : null,
        sourceDimensions ? JSON.stringify(sourceDimensions) : null,
        embeddedUiState
      ]
    );
    const createdVersion = created[0];
    if (!createdVersion) throw new ApiError(500, "SERVER_ERROR", "Asset record could not be created.");
    const stableLibraryId = replacingExisting
      ? (libraryAssetId as string)
      : createdVersion.id;
    if (!replacingExisting) {
      await query(
        `
          insert into festival_asset_library (
            id, owner_theme_id, display_name, default_purpose, asset_type,
            approval_state, lifecycle_state, current_version_asset_id,
            uploaded_by, updated_by
          )
          values (
            $1, $2, $3, $4, $5,
            'pending_review', 'active', $1,
            $6, $6
          )
        `,
        [
          stableLibraryId,
          themeId,
          safeFileName,
          purpose,
          role === "audio" ? "audio" : "image",
          actorId
        ]
      );
      await query(
        `
          update holiday_theme_assets
          set library_asset_id = $2
          where id = $1
        `,
        [createdVersion.id, stableLibraryId]
      );
    }
    const uniquePlacements = [...new Set(placements)];
    for (const placement of uniquePlacements) {
      if (!PUBLIC_FESTIVAL_ASSET_PLACEMENTS.has(placement)) {
        await query(
          `
            insert into festival_asset_assignments (
              library_asset_id, asset_version_id, theme_id, placement,
              state, assigned_by
            )
            values ($1, $2, $3, $4, 'active', $5)
          `,
          [stableLibraryId, createdVersion.id, themeId, placement, actorId]
        );
      } else {
        await query(
          `
            insert into festival_asset_assignments (
              library_asset_id, asset_version_id, theme_id, placement,
              state, assigned_by
            )
            values ($1, $2, $3, $4, 'pending_approval', $5)
          `,
          [stableLibraryId, createdVersion.id, themeId, placement, actorId]
        );
      }
    }
    await query(
      `
        insert into festival_asset_audit (
          library_asset_id, asset_version_id, actor_admin_user_id,
          action, safe_metadata
        )
        values ($1, $2, $3, 'version_uploaded', $4::jsonb)
      `,
      [
        stableLibraryId,
        createdVersion.id,
        actorId,
        JSON.stringify({
          purpose,
          placements: uniquePlacements,
          replacementMode,
          selectedAssignmentCount: selectedAssignmentIds.length
        })
      ]
    );
    if (detectedPalette && created[0]?.id) {
      await query(
        `
          update holiday_themes
          set detected_palette = $2::jsonb,
              palette_detection_status = $3,
              palette_detection_message = $4,
              palette_source_asset_id = $5,
              palette_approved_at = null,
              palette_approved_by = null,
              updated_by = $6,
              updated_at = now()
          where id = $1
        `,
        [
          themeId,
          JSON.stringify(detectedPalette),
          paletteDetectionStatus || "pending_review",
          paletteDetectionMessage || null,
          created[0].id,
          actorId
        ]
      );
    }
    await query(
      `
        insert into holiday_theme_audit (
          theme_id, actor_admin_user_id, action, affected_scope, safe_metadata
        )
        values ($1, $2, 'asset_uploaded', $3, $4::jsonb)
      `,
      [
        themeId,
        actorId,
        theme[0].scope,
        JSON.stringify({
          role,
          variant,
          mimeType,
          fileSize,
          checksumRecorded: true,
          durationRecorded: durationSeconds !== null,
          paletteDetectionStatus: detectedPalette
            ? paletteDetectionStatus || "pending_review"
            : "not_applicable",
          sourceDimensions,
          embeddedUiState,
          responsivePipeline:
            role.startsWith("login_")
              ? "next_image_avif_webp_jpeg"
              : "not_applicable"
        })
      ]
    );
    return {
      ...createdVersion,
      libraryAssetId: stableLibraryId
    };
  });
}

export async function reviewHolidayThemeAsset({
  assetId,
  decision,
  reason,
  isFallback,
  clarityConfirmed,
  actorId
}: {
  assetId: string;
  decision:
    | "approved"
    | "approved_with_size_restrictions"
    | "ambiguous"
    | "needs_replacement"
    | "rejected";
  reason: string | null;
  isFallback: boolean;
  clarityConfirmed: boolean;
  actorId: string;
}) {
  return withDbTransaction(async (query) => {
    const rows = await query<{
      id: string;
      theme_id: string;
      asset_role: HolidayThemeAsset["role"];
      variant: string;
      status: HolidayThemeAsset["status"];
      scope: string;
      library_asset_id: string | null;
      asset_metadata: Record<string, unknown> | null;
    }>(
      `
        select
          asset.id,
          asset.theme_id,
          asset.asset_role,
          asset.variant,
          asset.status,
          asset.library_asset_id,
          asset.asset_metadata,
          theme.scope
        from holiday_theme_assets asset
        join holiday_themes theme on theme.id = asset.theme_id
        where asset.id = $1
          and asset.status in ('staged', 'active', 'replaced')
          and theme.status <> 'archived'
        for update
      `,
      [assetId]
    );
    const asset = rows[0];
    if (!asset) throw badRequest("The reviewable holiday asset was not found.");

    const approvedDecision =
      decision === "approved" ||
      decision === "approved_with_size_restrictions";
    if (approvedDecision && !clarityConfirmed) {
      throw badRequest(
        "Confirm that the asset clearly represents the intended object before approval."
      );
    }

    if (approvedDecision) {
      if (isFallback) {
        await query(
          `
            update holiday_theme_assets
            set is_fallback = false,
                updated_at = now()
            where theme_id = $1 and asset_role = $2 and id <> $3
          `,
          [asset.theme_id, asset.asset_role, asset.id]
        );
      }
      await query(
        `
          update holiday_theme_assets
          set status = 'active',
              review_status = 'approved',
              quality_status = $4,
              is_fallback = $2,
              approved_at = now(),
              approved_by = $3,
              clarity_confirmation_at = now(),
              clarity_confirmation_by = $3,
              rejected_at = null,
              rejected_by = null,
              rejection_reason = null,
              updated_at = now()
          where id = $1
        `,
        [asset.id, isFallback, actorId, decision]
      );
      if (asset.library_asset_id) {
        const replacementMode =
          asset.asset_metadata?.replacementMode === "replace_everywhere" ||
          asset.asset_metadata?.replacementMode === "replace_selected"
            ? asset.asset_metadata.replacementMode
            : "keep_both";
        const selectedAssignmentIds = Array.isArray(
          asset.asset_metadata?.selectedAssignmentIds
        )
          ? asset.asset_metadata.selectedAssignmentIds.filter(
              (value): value is string => typeof value === "string"
            )
          : [];
        const library = (
          await query<{ current_version_asset_id: string | null }>(
            `
              select current_version_asset_id
              from festival_asset_library
              where id = $1
              for update
            `,
            [asset.library_asset_id]
          )
        )[0];
        const previousVersionId = library?.current_version_asset_id || null;

        if (replacementMode === "replace_everywhere") {
          await query(
            `
              update festival_asset_assignments
              set asset_version_id = $2,
                  updated_at = now()
              where library_asset_id = $1
                and state = 'active'
            `,
            [asset.library_asset_id, asset.id]
          );
        } else if (
          replacementMode === "replace_selected" &&
          selectedAssignmentIds.length > 0
        ) {
          await query(
            `
              update festival_asset_assignments
              set asset_version_id = $3,
                  updated_at = now()
              where library_asset_id = $1
                and id = any($2::uuid[])
                and state = 'active'
            `,
            [asset.library_asset_id, selectedAssignmentIds, asset.id]
          );
        }

        const pendingAssignments = await query<{
          id: string;
          theme_id: string;
          placement: FestivalAssetPlacement;
        }>(
          `
            select id, theme_id, placement
            from festival_asset_assignments
            where library_asset_id = $1
              and asset_version_id = $2
              and state = 'pending_approval'
            for update
          `,
          [asset.library_asset_id, asset.id]
        );
        for (const pending of pendingAssignments) {
          if (
            ![
              "private_reference",
              "palette_source",
              "motif_interpretation_source",
              "axo_theme_reference",
              "header_decoration_rail",
              "inner_page_accent"
            ].includes(pending.placement)
          ) {
            await query(
              `
                update festival_asset_assignments
                set state = 'replaced',
                    removed_by = $4,
                    removed_at = now(),
                    removal_reason = 'Replaced when a reviewed assignment was activated.',
                    updated_at = now()
                where theme_id = $1
                  and placement = $2
                  and state = 'active'
                  and id <> $3
              `,
              [pending.theme_id, pending.placement, pending.id, actorId]
            );
          }
          await query(
            `
              update festival_asset_assignments
              set state = 'active',
                  updated_at = now()
              where id = $1
            `,
            [pending.id]
          );
        }
        await query(
          `
            update holiday_theme_assets
            set version_state = case when id = $2 then 'current' else 'previous' end,
                updated_at = now()
            where library_asset_id = $1
          `,
          [asset.library_asset_id, asset.id]
        );
        await query(
          `
            update festival_asset_library
            set approval_state = 'approved',
                lifecycle_state = 'active',
                current_version_asset_id = $2,
                updated_by = $3,
                updated_at = now()
            where id = $1
          `,
          [asset.library_asset_id, asset.id, actorId]
        );
        if (previousVersionId && previousVersionId !== asset.id) {
          await query(
            `
              update holiday_theme_assets previous
              set status = case
                    when exists (
                      select 1
                      from festival_asset_assignments assignment
                      where assignment.asset_version_id = previous.id
                        and assignment.state = 'active'
                    ) then previous.status
                    else 'replaced'
                  end,
                  replaced_at = case
                    when exists (
                      select 1
                      from festival_asset_assignments assignment
                      where assignment.asset_version_id = previous.id
                        and assignment.state = 'active'
                    ) then previous.replaced_at
                    else now()
                  end,
                  updated_at = now()
              where previous.id = $1
            `,
            [previousVersionId]
          );
        }
        await query(
          `
            insert into festival_asset_audit (
              library_asset_id, asset_version_id, actor_admin_user_id,
              action, safe_metadata
            )
            values ($1, $2, $3, 'version_approved', $4::jsonb)
          `,
          [
            asset.library_asset_id,
            asset.id,
            actorId,
            JSON.stringify({
              replacementMode,
              activatedAssignments: pendingAssignments.length,
              selectedAssignmentCount: selectedAssignmentIds.length
            })
          ]
        );
      }
    } else if (decision === "rejected") {
      await query(
        `
          update holiday_theme_assets
          set status = 'archived',
              review_status = 'rejected',
              quality_status = 'rejected',
              rejected_at = now(),
              rejected_by = $2,
              rejection_reason = $3,
              archived_at = now(),
              updated_at = now()
          where id = $1
        `,
        [asset.id, actorId, reason || "Rejected during Super Admin review."]
      );
      if (asset.library_asset_id) {
        await query(
          `
            update holiday_theme_assets
            set version_state = 'rejected'
            where id = $1
          `,
          [asset.id]
        );
        await query(
          `
            update festival_asset_assignments
            set state = 'removed',
                removed_by = $2,
                removed_at = now(),
                removal_reason = 'Asset version was rejected during review.',
                updated_at = now()
            where asset_version_id = $1
              and state = 'pending_approval'
          `,
          [asset.id, actorId]
        );
      }
    } else {
      await query(
        `
          update holiday_theme_assets
          set status = 'staged',
              review_status = 'pending_review',
              quality_status = $2,
              is_fallback = false,
              approved_at = null,
              approved_by = null,
              clarity_confirmation_at = null,
              clarity_confirmation_by = null,
              rejection_reason = $3,
              updated_at = now()
          where id = $1
        `,
        [
          asset.id,
          decision,
          reason ||
            (decision === "ambiguous"
              ? "Marked ambiguous during Super Admin visual review."
              : "A replacement has been requested.")
        ]
      );
    }

    await query(
      `
        insert into holiday_theme_audit (
          theme_id, actor_admin_user_id, action, affected_scope, safe_metadata
        )
        values ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        asset.theme_id,
        actorId,
        approvedDecision
          ? "asset_approved"
          : decision === "rejected"
            ? "asset_rejected"
            : decision === "ambiguous"
              ? "asset_marked_ambiguous"
              : "asset_replacement_requested",
        asset.scope,
        JSON.stringify({
          assetId: asset.id,
          role: asset.asset_role,
          variant: asset.variant,
          isFallback: approvedDecision && isFallback,
          qualityStatus: decision,
          clarityConfirmed: approvedDecision,
          reasonProvided: Boolean(reason)
        })
      ]
    );
    return asset;
  });
}

export async function archiveHolidayThemeAsset({
  assetId,
  actorId
}: {
  assetId: string;
  actorId: string;
}) {
  return withDbTransaction(async (query) => {
    const archived = await query<{
      id: string;
      theme_id: string;
      asset_role: HolidayThemeAsset["role"];
      variant: string;
      scope: string;
    }>(
      `
        update holiday_theme_assets as asset
        set status = 'archived',
            review_status = 'archived',
            quality_status = 'archived',
            archived_at = now(),
            updated_at = now()
        from holiday_themes as theme
        where asset.id = $1
          and asset.theme_id = theme.id
          and asset.status in ('active', 'staged')
        returning
          asset.id,
          asset.theme_id,
          asset.asset_role,
          asset.variant,
          theme.scope
      `,
      [assetId]
    );
    if (!archived[0]) throw badRequest("The active holiday asset was not found.");
    await query(
      `
        update holiday_themes
        set palette_source_asset_id = null,
            palette_detection_status = case
              when palette_source_asset_id = $1 then 'needs_review'
              else palette_detection_status
            end,
            palette_detection_message = case
              when palette_source_asset_id = $1
                then 'The source artwork was removed. Choose another asset and regenerate the palette.'
              else palette_detection_message
            end,
            updated_by = $2,
            updated_at = now()
        where id = $3
      `,
      [assetId, actorId, archived[0].theme_id]
    );
    await query(
      `
        insert into holiday_theme_audit (
          theme_id, actor_admin_user_id, action, affected_scope, safe_metadata
        )
        values ($1, $2, 'asset_removed', $3, $4::jsonb)
      `,
      [
        archived[0].theme_id,
        actorId,
        archived[0].scope,
        JSON.stringify({
          role: archived[0].asset_role,
          variant: archived[0].variant
        })
      ]
    );
    return archived[0];
  });
}

export async function getHolidayAssetRecord(assetId: string) {
  const result = await dbQuery<{
    id: string;
    theme_id: string;
    asset_role: HolidayThemeAsset["role"];
    s3_key: string;
    mime_type: string;
    safe_file_name: string;
    file_size: number | string;
    checksum_sha256: string | null;
    duration_seconds: number | string | null;
    variant: string;
    status: HolidayThemeAsset["status"];
    review_status: HolidayThemeAsset["reviewStatus"];
    library_asset_id: string | null;
    lifecycle_state: string | null;
    library_approval_state: string | null;
    asset_metadata: Record<string, unknown> | null;
    placements: Array<{
      placement: FestivalAssetPlacement;
      state: string;
      themeId: string;
    }>;
  }>(
    `
      select
        asset.id, asset.theme_id, asset.asset_role, asset.variant,
        asset.s3_key, asset.mime_type, asset.safe_file_name,
        asset.file_size, asset.checksum_sha256, asset.duration_seconds,
        asset.status, asset.review_status, asset.library_asset_id,
        asset.asset_metadata, library.lifecycle_state,
        library.approval_state as library_approval_state,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'placement', assignment.placement,
                'state', assignment.state,
                'themeId', assignment.theme_id
              )
            )
            from festival_asset_assignments assignment
            where assignment.asset_version_id = asset.id
          ),
          '[]'::jsonb
        ) as placements
      from holiday_theme_assets asset
      left join festival_asset_library library
        on library.id = asset.library_asset_id
      where asset.id = $1
      limit 1
    `,
    [assetId]
  );
  return result.rows[0] || null;
}
