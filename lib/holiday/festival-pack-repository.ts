import "server-only";

import { badRequest } from "@/lib/api/response";
import { dbQuery, withDbTransaction } from "@/lib/db";
import { ensureBuiltInHolidayThemes } from "./repository";
import { defaultHolidayLoginComposition } from "./login-theme";
import {
  FESTIVAL_PACK_MAPPING_LOCATIONS,
  FESTIVAL_PACK_RESPONSIVE_VARIANTS,
  mappingToAssetContract,
  type FestivalPackFileRecord,
  type FestivalPackMapping,
  type FestivalPackMode,
  type FestivalPackRecord,
  type FestivalPackScanResult,
  type FestivalPackSnapshot,
  type FestivalHeroGroupRecord,
  type ScannedFestivalPackFile
} from "./festival-pack-types";
import { computeFestivalPackCompleteness } from "./festival-pack-scanner";
import type {
  HolidayExperienceLevel,
  HolidayThemeCategory
} from "./types";

export type FestivalPackUploadedFile = {
  archivePath: string;
  s3Key: string;
};

type PackRow = {
  id: string;
  theme_id: string;
  theme_name: string;
  package_name: string;
  package_mode: FestivalPackMode;
  package_version: number | string;
  manifest_json: Record<string, unknown> | null;
  state: FestivalPackRecord["state"];
  original_file_name: string;
  original_zip_size: number | string;
  completeness_flags: FestivalPackRecord["completenessFlags"];
  source_entry_count: number | string;
  safe_asset_count: number | string;
  blocked_entry_count: number | string;
  manual_mapping_count: number | string;
  client_login_enabled: boolean;
  employee_login_enabled: boolean;
  homepage_enabled: boolean;
  previous_pack_id: string | null;
  scheduled_start_at: Date | string | null;
  scheduled_end_at: Date | string | null;
  repeat_yearly: boolean;
  created_at: Date | string;
  approved_at: Date | string | null;
  activated_at: Date | string | null;
  files: Array<{
    id: string;
    archivePath: string;
    safeFileName: string;
    kind: FestivalPackFileRecord["kind"];
    mimeType: string | null;
    compressedSize: number | string;
    uncompressedSize: number | string;
    width: number | null;
    height: number | null;
    hasAlpha: boolean | null;
    responsiveVariant: FestivalPackFileRecord["responsiveVariant"];
    detectedClassification: string;
    confidence: number | string;
    reasons: string[];
    suggestedMappings: FestivalPackMapping[];
    approvedMappings: FestivalPackMapping[];
    inspectionStatus: FestivalPackFileRecord["inspectionStatus"];
    rejectionReason: string | null;
    checksumSha256: string | null;
    embeddedUiState: FestivalPackFileRecord["embeddedUiState"];
    extractedS3Key: string | null;
    libraryAssetId: string | null;
    assetVersionId: string | null;
  }>;
};

const publicMappings = new Set([
  "client_login_hero",
  "client_login_background",
  "client_login_form_skin",
  "employee_login_hero",
  "employee_login_background",
  "employee_login_form_skin",
  "homepage_hero",
  "website_background",
  "header_decoration",
  "footer_decoration",
  "axo_asset",
  "sound"
]);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 56) || "festival-pack";

const toIso = (value: Date | string | null) =>
  value ? new Date(value).toISOString() : null;

function mapPack(row: PackRow): FestivalPackRecord {
  return {
    id: row.id,
    themeId: row.theme_id,
    themeName: row.theme_name,
    packageName: row.package_name,
    packageMode: row.package_mode,
    packageVersion: Number(row.package_version),
    manifest: row.manifest_json || null,
    state: row.state,
    originalFileName: row.original_file_name,
    originalZipSize: Number(row.original_zip_size),
    completenessFlags: row.completeness_flags || [],
    sourceEntryCount: Number(row.source_entry_count),
    safeAssetCount: Number(row.safe_asset_count),
    blockedEntryCount: Number(row.blocked_entry_count),
    manualMappingCount: Number(row.manual_mapping_count),
    clientLoginEnabled: row.client_login_enabled,
    employeeLoginEnabled: row.employee_login_enabled,
    homepageEnabled: row.homepage_enabled,
    previousPackId: row.previous_pack_id,
    scheduledStartAt: toIso(row.scheduled_start_at),
    scheduledEndAt: toIso(row.scheduled_end_at),
    repeatYearly: row.repeat_yearly,
    importedAt: new Date(row.created_at).toISOString(),
    approvedAt: toIso(row.approved_at),
    activatedAt: toIso(row.activated_at),
    files: (row.files || []).map((file) => ({
      id: file.id,
      archivePath: file.archivePath,
      safeFileName: file.safeFileName,
      kind: file.kind,
      mimeType: file.mimeType,
      compressedSize: Number(file.compressedSize),
      uncompressedSize: Number(file.uncompressedSize),
      width: file.width,
      height: file.height,
      hasAlpha: file.hasAlpha,
      responsiveVariant: file.responsiveVariant,
      detectedClassification: file.detectedClassification,
      confidence: Number(file.confidence),
      reasons: file.reasons || [],
      suggestedMappings: file.suggestedMappings || [],
      approvedMappings: file.approvedMappings || [],
      inspectionStatus: file.inspectionStatus,
      rejectionReason: file.rejectionReason,
      checksumSha256: file.checksumSha256,
      embeddedUiState: file.embeddedUiState,
      extractedS3Key: file.extractedS3Key,
      libraryAssetId: file.libraryAssetId,
      assetVersionId: file.assetVersionId
    }))
  };
}

export async function getFestivalPackSnapshot(): Promise<FestivalPackSnapshot> {
  const [packs, heroGroups, themes] = await Promise.all([
    dbQuery<PackRow>(`
      select p.*, t.name as theme_name,
        coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', f.id,
            'archivePath', f.archive_path,
            'safeFileName', f.safe_file_name,
            'kind', f.file_kind,
            'mimeType', f.mime_type,
            'compressedSize', f.compressed_size,
            'uncompressedSize', f.uncompressed_size,
            'width', f.width,
            'height', f.height,
            'hasAlpha', f.has_alpha,
            'responsiveVariant', f.responsive_variant,
            'detectedClassification', f.detected_classification,
            'confidence', f.classification_confidence,
            'reasons', f.classification_reasons,
            'suggestedMappings', f.suggested_mappings,
            'approvedMappings', f.approved_mappings,
            'inspectionStatus', f.inspection_status,
            'rejectionReason', f.rejection_reason,
            'checksumSha256', f.checksum_sha256,
            'embeddedUiState', coalesce(a.asset_metadata->>'embeddedUiState', 'no_embedded_ui'),
            'extractedS3Key', case when f.extracted_s3_key is null then null else 'private' end,
            'libraryAssetId', f.library_asset_id,
            'assetVersionId', f.asset_version_id
          ) order by f.archive_path)
          from festival_pack_files f
          left join holiday_theme_assets a on a.id = f.asset_version_id
          where f.pack_id = p.id
        ), '[]'::jsonb) as files
      from festival_pack_imports p
      join holiday_themes t on t.id = p.theme_id
      order by p.created_at desc
    `),
    dbQuery<{
      id: string;
      festival_name: string;
      festival_slug: string;
      source_status: FestivalHeroGroupRecord["sourceStatus"];
      source_message: string | null;
      default_variant_slug: string | null;
      variant_count: number | string;
      created_at: Date | string;
      updated_at: Date | string;
    }>(`
      select g.*,
        count(p.id) filter (where p.state <> 'archived')::integer as variant_count
      from festival_hero_groups g
      left join festival_pack_imports p
        on p.manifest_json->>'festivalSlug' = g.festival_slug
       and p.manifest_json->>'variantSlug' is not null
      group by g.id
      order by g.festival_name
    `),
    dbQuery<{
      id: string;
      name: string;
      festival_type: HolidayThemeCategory;
      status: string;
    }>(`
      select id, name, festival_type, status
      from holiday_themes
      where status <> 'archived' and slug <> 'default'
      order by name
    `)
  ]);
  return {
    packs: packs.rows.map(mapPack),
    heroGroups: heroGroups.rows.map((group) => ({
      id: group.id,
      festivalName: group.festival_name,
      festivalSlug: group.festival_slug,
      sourceStatus: group.source_status,
      sourceMessage: group.source_message,
      defaultVariantSlug: group.default_variant_slug,
      variantCount: Number(group.variant_count),
      createdAt: new Date(group.created_at).toISOString(),
      updatedAt: new Date(group.updated_at).toISOString()
    })),
    themes: themes.rows.map((theme) => ({
      id: theme.id,
      name: theme.name,
      festivalType: theme.festival_type,
      status: theme.status
    })),
    generatedAt: new Date().toISOString()
  };
}

export async function getFestivalPackPreviewContext(packId: string) {
  const result = await dbQuery<{
    id: string;
    theme_id: string;
    state: FestivalPackRecord["state"];
  }>(`
    select id, theme_id, state
    from festival_pack_imports
    where id = $1
      and state <> 'archived'
    limit 1
  `, [packId]);
  const pack = result.rows[0];
  return pack
    ? { id: pack.id, themeId: pack.theme_id, state: pack.state }
    : null;
}

function initialMappings(file: ScannedFestivalPackFile) {
  return file.inspectionStatus === "manual_mapping_required"
    ? []
    : file.suggestedMappings;
}

function packAssetKey(file: ScannedFestivalPackFile, mappings: FestivalPackMapping[]) {
  const locations = new Set(mappings.map((mapping) => mapping.location));
  const variant = mappings[0]?.variant || file.responsiveVariant;
  if (locations.has("logo")) return "logo";
  if (locations.has("axo_asset")) return `axo_${variant}`;
  if (locations.has("sound")) return `audio_${variant}`;
  if (locations.has("header_decoration")) return `header_${variant}`;
  if (locations.has("footer_decoration")) return `footer_${variant}`;
  if (locations.has("homepage_hero")) return `homepage_hero_${variant}`;
  if (locations.has("website_background")) return `website_background_${variant}`;
  const background = [...locations].some((location) =>
    location.endsWith("_background")
  );
  const hero = [...locations].some((location) => location.endsWith("_hero"));
  if (background) {
    if (variant === "four_three") return "background_four_three";
    if (variant === "ultrawide") return "background_ultrawide";
    if (variant === "dark") return "background_dark";
    if (variant === "light") return "background_light";
    return "background_wide";
  }
  if (hero) {
    if (variant === "mobile") return "hero_mobile";
    if (variant === "tablet") return "hero_tablet";
    return "hero_desktop";
  }
  return `reference_${variant}`;
}

export async function createFestivalPackImport({
  packageName,
  category,
  experienceLevel,
  themeId,
  replacePackId,
  scan,
  originalFileName,
  originalZipS3Key,
  originalZipSize,
  originalZipChecksumSha256,
  uploadedFiles,
  clientLoginEnabled,
  employeeLoginEnabled,
  homepageEnabled,
  actorId
}: {
  packageName: string;
  category: HolidayThemeCategory;
  experienceLevel: HolidayExperienceLevel;
  themeId?: string | null;
  replacePackId?: string | null;
  scan: FestivalPackScanResult;
  originalFileName: string;
  originalZipS3Key: string;
  originalZipSize: number;
  originalZipChecksumSha256: string;
  uploadedFiles: FestivalPackUploadedFile[];
  clientLoginEnabled: boolean;
  employeeLoginEnabled: boolean;
  homepageEnabled: boolean;
  actorId: string;
}) {
  await ensureBuiltInHolidayThemes();
  const uploadedByPath = new Map(
    uploadedFiles.map((file) => [file.archivePath, file.s3Key])
  );
  const packId = crypto.randomUUID();
  await withDbTransaction(async (query) => {
    let resolvedThemeId = themeId || null;
    if (resolvedThemeId) {
      const existing = await query<{ id: string }>(
        "select id from holiday_themes where id = $1 and status <> 'archived' for update",
        [resolvedThemeId]
      );
      if (!existing[0]) throw badRequest("The selected festival theme was not found.");
    } else {
      const suffix = Date.now().toString(36);
      const created = await query<{ id: string }>(`
        insert into holiday_themes (
          slug, name, festival_type, description, status, mode, timezone,
          priority, is_enabled, scope, apply_to_header, apply_to_footer,
          apply_to_homepage, apply_to_login_screens, apply_to_client_login,
          apply_to_employee_login, apply_to_admin_login,
          apply_matching_website_palette, apply_axo_theme,
          apply_to_selected_routes, selected_routes, palette,
          palette_detection_status, palette_detection_message,
          palette_match_mode, experience_level, animation_level,
          experience_config, announcement_bar_enabled, motif, axo_accessory,
          built_in, created_by, updated_by
        )
        select
          $1, $2, $3, $4, 'draft', 'manual', 'Asia/Kolkata',
          50, true, 'entire_public', true, true, $5, true, $6, $7, false,
          true, true, false, '{}', palette, 'approved',
          'Safe WriteX palette retained until imported tokens are approved.',
          'balanced_writex', $8, animation_level,
          jsonb_set(experience_config, '{approvalStatus}', '"draft"'::jsonb),
          false, motif, axo_accessory, false, $9, $9
        from holiday_themes where slug = 'custom-event'
        returning id
      `, [
        `${slugify(packageName)}-${suffix}`,
        packageName,
        category,
        `Imported designer festival package: ${packageName}`,
        homepageEnabled,
        clientLoginEnabled,
        employeeLoginEnabled,
        experienceLevel,
        actorId
      ]);
      resolvedThemeId = created[0]?.id || null;
      if (!resolvedThemeId) throw new Error("The festival theme could not be created.");
    }

    const previous = replacePackId
      ? (await query<{ id: string; package_version: number | string; theme_id: string }>(
          "select id, package_version, theme_id from festival_pack_imports where id = $1 for update",
          [replacePackId]
        ))[0]
      : null;
    if (previous && previous.theme_id !== resolvedThemeId) {
      throw badRequest("A replacement pack must remain attached to the same theme.");
    }
    const versionRows = await query<{ version: number | string }>(
      "select coalesce(max(package_version), 0) + 1 as version from festival_pack_imports where theme_id = $1",
      [resolvedThemeId]
    );
    const packageVersion = Number(versionRows[0]?.version || 1);
    const state = scan.manualMappingCount > 0 ? "mapping_required" : "ready_for_review";
    await query(`
      insert into festival_pack_imports (
        id, theme_id, package_name, package_mode, package_version, state,
        original_file_name, original_zip_s3_key, original_zip_size,
        original_zip_checksum_sha256, manifest_json, completeness_flags,
        source_entry_count, safe_asset_count, blocked_entry_count,
        manual_mapping_count, client_login_enabled, employee_login_enabled,
        homepage_enabled, previous_pack_id, imported_by
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
    `, [
      packId,
      resolvedThemeId,
      packageName,
      scan.mode,
      packageVersion,
      state,
      originalFileName,
      originalZipS3Key,
      originalZipSize,
      originalZipChecksumSha256,
      scan.manifest ? JSON.stringify(scan.manifest) : null,
      scan.completenessFlags,
      scan.entryCount,
      scan.safeAssetCount,
      scan.blockedEntryCount,
      scan.manualMappingCount,
      clientLoginEnabled,
      employeeLoginEnabled,
      homepageEnabled,
      previous?.id || null,
      actorId
    ]);

    for (const file of scan.files) {
      const mappings = initialMappings(file);
      const extractedS3Key = uploadedByPath.get(file.archivePath) || null;
      let assetVersionId: string | null = null;
      let libraryAssetId: string | null = null;
      if (extractedS3Key && (file.kind === "image" || file.kind === "audio")) {
        assetVersionId = crypto.randomUUID();
        libraryAssetId = assetVersionId;
        const contract = mappingToAssetContract(mappings);
        const assetMetadata = {
          storage: "private_s3",
          purpose: contract.purpose,
          festivalPackId: packId,
          festivalPackVersion: packageVersion,
          archivePath: file.archivePath,
          responsiveVariant: file.responsiveVariant,
          packAssetKey: packAssetKey(file, mappings),
          approvedMappings: mappings,
          sourceDimensions: {
            width: file.width,
            height: file.height
          },
          embeddedUiState: file.embeddedUiState,
          singleRealLoginFormRequired: true
        };
        await query(`
          insert into holiday_theme_assets (
            id, theme_id, asset_role, variant, s3_key, safe_file_name,
            mime_type, file_size, checksum_sha256, duration_seconds,
            asset_metadata, status, review_status, quality_status,
            version_number, library_asset_id, version_state, uploaded_by
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, null, $10::jsonb,
            'staged', 'pending_review', 'needs_visual_review', 1, null,
            'current', $11
          )
        `, [
          assetVersionId,
          resolvedThemeId,
          contract.role,
          file.responsiveVariant,
          extractedS3Key,
          file.safeFileName,
          file.mimeType,
          file.uncompressedSize,
          file.checksumSha256,
          JSON.stringify(assetMetadata),
          actorId
        ]);
        await query(`
          insert into festival_asset_library (
            id, owner_theme_id, display_name, default_purpose, asset_type,
            approval_state, lifecycle_state, current_version_asset_id,
            uploaded_by, updated_by
          ) values ($1, $2, $3, $4, $5, 'pending_review', 'active', $1, $6, $6)
        `, [
          libraryAssetId,
          resolvedThemeId,
          file.safeFileName,
          contract.purpose,
          file.kind === "audio" ? "audio" : "image",
          actorId
        ]);
        await query(
          "update holiday_theme_assets set library_asset_id = $2 where id = $1",
          [assetVersionId, libraryAssetId]
        );
        for (const placement of [...new Set(contract.placements)]) {
          await query(`
            insert into festival_asset_assignments (
              library_asset_id, asset_version_id, theme_id, placement,
              state, assigned_by
            ) values ($1, $2, $3, $4, 'active', $5)
          `, [libraryAssetId, assetVersionId, resolvedThemeId, placement, actorId]);
        }
      }
      await query(`
        insert into festival_pack_files (
          pack_id, archive_path, safe_file_name, file_kind, mime_type,
          compressed_size, uncompressed_size, width, height, has_alpha,
          responsive_variant, detected_classification,
          classification_confidence, classification_reasons,
          suggested_mappings, approved_mappings, inspection_status,
          rejection_reason, declarative_json, extracted_s3_key,
          checksum_sha256, library_asset_id, asset_version_id
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14::jsonb, $15::jsonb, $16::jsonb, $17, $18, $19::jsonb,
          $20, $21, $22, $23
        )
      `, [
        packId,
        file.archivePath,
        file.safeFileName,
        file.kind,
        file.mimeType,
        file.compressedSize,
        file.uncompressedSize,
        file.width,
        file.height,
        file.hasAlpha,
        file.responsiveVariant,
        file.detectedClassification,
        file.confidence,
        JSON.stringify(file.reasons),
        JSON.stringify(file.suggestedMappings),
        JSON.stringify(mappings),
        file.inspectionStatus,
        file.rejectionReason,
        file.parsedJson ? JSON.stringify(file.parsedJson) : null,
        extractedS3Key,
        file.checksumSha256,
        libraryAssetId,
        assetVersionId
      ]);
    }
    await query(`
      insert into festival_pack_audit (
        pack_id, actor_admin_user_id, action, safe_metadata
      ) values ($1, $2, 'package_imported', $3::jsonb)
    `, [
      packId,
      actorId,
      JSON.stringify({
        packageMode: scan.mode,
        packageVersion,
        entries: scan.entryCount,
        safeAssets: scan.safeAssetCount,
        blockedEntries: scan.blockedEntryCount,
        originalStoredPrivately: true
      })
    ]);
  });
  return { packId, snapshot: await getFestivalPackSnapshot() };
}

function validateMappings(
  kind: FestivalPackFileRecord["kind"],
  embeddedUiState: FestivalPackFileRecord["embeddedUiState"],
  mappings: FestivalPackMapping[]
) {
  const unique = new Map<string, FestivalPackMapping>();
  for (const mapping of mappings) {
    if (!FESTIVAL_PACK_MAPPING_LOCATIONS.includes(mapping.location)) {
      throw badRequest("Choose a supported festival asset location.");
    }
    if (!FESTIVAL_PACK_RESPONSIVE_VARIANTS.includes(mapping.variant)) {
      throw badRequest("Choose a supported responsive asset variant.");
    }
    if (kind === "audio" && !["sound", "ignore"].includes(mapping.location)) {
      throw badRequest("Audio can only be assigned as Sound or Ignore.");
    }
    if (kind === "image" && mapping.location === "sound") {
      throw badRequest("Images cannot be assigned as Sound.");
    }
    if (
      kind === "design_tokens" &&
      !["palette_source", "reference_only", "ignore"].includes(mapping.location)
    ) {
      throw badRequest("Design tokens may only be a Palette Source, Reference Only or Ignore.");
    }
    if (
      ["unsafe", "design_reference", "manifest", "ignored"].includes(kind) &&
      !["reference_only", "ignore"].includes(mapping.location)
    ) {
      throw badRequest("Reference and blocked files cannot be rendered publicly.");
    }
    if (
      embeddedUiState === "contains_embedded_ui" &&
      !["reference_only", "ignore", "palette_source"].includes(mapping.location)
    ) {
      throw badRequest(
        "A flat mockup with embedded UI is Reference Only until separated artwork is supplied."
      );
    }
    unique.set(`${mapping.location}:${mapping.variant}`, mapping);
  }
  return [...unique.values()];
}

async function refreshPackReadiness(
  query: Parameters<Parameters<typeof withDbTransaction>[0]>[0],
  packId: string
) {
  const rows = await query<{
    file_kind: FestivalPackFileRecord["kind"];
    inspection_status: FestivalPackFileRecord["inspectionStatus"];
    approved_mappings: FestivalPackMapping[];
    embedded_ui_state: FestivalPackFileRecord["embeddedUiState"];
  }>(`
    select f.file_kind, f.inspection_status, f.approved_mappings,
      coalesce(a.asset_metadata->>'embeddedUiState', 'no_embedded_ui') as embedded_ui_state
    from festival_pack_files f
    left join holiday_theme_assets a on a.id = f.asset_version_id
    where f.pack_id = $1
  `, [packId]);
  const manualCount = rows.filter((row) =>
    ["image", "audio", "design_tokens"].includes(row.file_kind) &&
    row.approved_mappings.length === 0
  ).length;
  const files = rows.map((row) => ({
    inspectionStatus:
      row.approved_mappings.length > 0
        ? "validated" as const
        : "manual_mapping_required" as const,
    suggestedMappings: row.approved_mappings,
    embeddedUiState: row.embedded_ui_state
  }));
  const flags = computeFestivalPackCompleteness(files);
  await query(`
    update festival_pack_imports
    set manual_mapping_count = $2,
        completeness_flags = $3,
        state = case when $2 = 0 then 'ready_for_review' else 'mapping_required' end,
        updated_at = now()
    where id = $1 and state in ('uploaded','validated','mapping_required','ready_for_review')
  `, [packId, manualCount, flags]);
}

export async function updateFestivalPackMappings({
  packId,
  updates,
  actorId
}: {
  packId: string;
  updates: Array<{ fileId: string; mappings: FestivalPackMapping[] }>;
  actorId: string;
}) {
  await withDbTransaction(async (query) => {
    const pack = await query<{ id: string; theme_id: string; state: string }>(
      "select id, theme_id, state from festival_pack_imports where id = $1 for update",
      [packId]
    );
    if (!pack[0] || !["mapping_required", "ready_for_review"].includes(pack[0].state)) {
      throw badRequest("Only draft festival packs can be remapped.");
    }
    for (const update of updates) {
      const rows = await query<{
        id: string;
        file_kind: FestivalPackFileRecord["kind"];
        responsive_variant: FestivalPackFileRecord["responsiveVariant"];
        asset_version_id: string | null;
        library_asset_id: string | null;
        embedded_ui_state: FestivalPackFileRecord["embeddedUiState"];
      }>(`
        select f.id, f.file_kind, f.responsive_variant, f.asset_version_id,
          f.library_asset_id,
          coalesce(a.asset_metadata->>'embeddedUiState', 'no_embedded_ui') as embedded_ui_state
        from festival_pack_files f
        left join holiday_theme_assets a on a.id = f.asset_version_id
        where f.id = $1 and f.pack_id = $2
        for update of f
      `, [update.fileId, packId]);
      const file = rows[0];
      if (!file) throw badRequest("The festival package file was not found.");
      const mappings = validateMappings(
        file.file_kind,
        file.embedded_ui_state,
        update.mappings
      );
      await query(
        "update festival_pack_files set approved_mappings = $2::jsonb, updated_at = now() where id = $1",
        [file.id, JSON.stringify(mappings)]
      );
      if (file.asset_version_id && file.library_asset_id) {
        const pseudo = {
          responsiveVariant: file.responsive_variant,
          suggestedMappings: mappings
        } as ScannedFestivalPackFile;
        const contract = mappingToAssetContract(mappings);
        await query(`
          update holiday_theme_assets
          set asset_role = $2,
              asset_metadata = asset_metadata || $3::jsonb,
              updated_at = now()
          where id = $1
        `, [
          file.asset_version_id,
          contract.role,
          JSON.stringify({
            approvedMappings: mappings,
            responsiveVariant: file.responsive_variant,
            packAssetKey: packAssetKey(pseudo, mappings)
          })
        ]);
        await query(
          "delete from festival_asset_assignments where asset_version_id = $1 and state in ('active','pending_approval')",
          [file.asset_version_id]
        );
        for (const placement of [...new Set(contract.placements)]) {
          await query(`
            insert into festival_asset_assignments (
              library_asset_id, asset_version_id, theme_id, placement,
              state, assigned_by
            ) values ($1, $2, $3, $4, 'active', $5)
          `, [
            file.library_asset_id,
            file.asset_version_id,
            pack[0].theme_id,
            placement,
            actorId
          ]);
        }
      }
    }
    await refreshPackReadiness(query, packId);
    await query(`
      insert into festival_pack_audit (pack_id, actor_admin_user_id, action, safe_metadata)
      values ($1, $2, 'mappings_updated', $3::jsonb)
    `, [packId, actorId, JSON.stringify({ updatedFiles: updates.length })]);
  });
  return getFestivalPackSnapshot();
}

export async function approveFestivalPack(packId: string, actorId: string) {
  await withDbTransaction(async (query) => {
    const packs = await query<{
      id: string;
      theme_id: string;
      state: string;
      manual_mapping_count: number | string;
      completeness_flags: string[];
    }>(
      "select id, theme_id, state, manual_mapping_count, completeness_flags from festival_pack_imports where id = $1 for update",
      [packId]
    );
    const pack = packs[0];
    if (!pack || pack.state !== "ready_for_review") {
      throw badRequest("Complete manual asset mapping before approval.");
    }
    if (Number(pack.manual_mapping_count) > 0) {
      throw badRequest("Every safe package asset needs an explicit mapping or Ignore decision.");
    }
    const renderable = await query<{ count: number | string }>(`
      select count(*) as count from festival_pack_files
      where pack_id = $1 and approved_mappings @? '$[*] ? (@.location != "reference_only" && @.location != "ignore" && @.location != "palette_source" && @.location != "logo")'
    `, [packId]);
    if (Number(renderable[0]?.count || 0) === 0) {
      throw badRequest("The pack has no safe renderable artwork to approve.");
    }
    await query(`
      update holiday_theme_assets
      set status = 'active', review_status = 'approved',
          quality_status = 'approved', approved_at = now(), approved_by = $2,
          clarity_confirmation_at = now(), clarity_confirmation_by = $2,
          updated_at = now()
      where asset_metadata->>'festivalPackId' = $1
    `, [packId, actorId]);
    await query(`
      update festival_asset_library library
      set approval_state = 'approved', lifecycle_state = 'active',
          updated_by = $2, updated_at = now()
      where exists (
        select 1 from holiday_theme_assets asset
        where asset.library_asset_id = library.id
          and asset.asset_metadata->>'festivalPackId' = $1
      )
    `, [packId, actorId]);
    await query(`
      update holiday_themes
      set palette_detection_status = 'approved',
          palette_detection_message = 'Festival pack reviewed; safe WriteX-balanced palette approved.',
          palette_approved_at = now(), palette_approved_by = $2,
          experience_config = jsonb_set(experience_config, '{approvalStatus}', '"approved"'::jsonb),
          updated_by = $2, updated_at = now()
      where id = $1
    `, [pack.theme_id, actorId]);
    await query(`
      update festival_pack_imports
      set state = 'approved', approved_by = $2, approved_at = now(), updated_at = now()
      where id = $1
    `, [packId, actorId]);
    await query(`
      insert into festival_pack_audit (pack_id, actor_admin_user_id, action, safe_metadata)
      values ($1, $2, 'package_approved', '{"singleRealLoginFormRequired":true}'::jsonb)
    `, [packId, actorId]);
  });
  return getFestivalPackSnapshot();
}

function importedLoginComposition(packId: string) {
  const base = defaultHolidayLoginComposition();
  return {
    ...base,
    applyMode: "full_natural_background" as const,
    source: {
      ...base.source,
      mode: "designer_complete_pack" as const,
      packId: `festival-pack:${packId}`,
      mobileMode: "background_form" as const,
      usePackageLogo: true
    },
    layout: {
      ...base.layout,
      desktopColumns: "58_42" as const,
      formMaxWidthPx: 600,
      compositionBalance: 58
    },
    hero: {
      ...base.hero,
      embeddedUiState: "no_embedded_ui" as const,
      safeCropApproved: true
    },
    background: {
      ...base.background,
      strategy: "clean_ambient_surface" as const,
      mode: "theme_palette_gradient" as const,
      extendedBlurPx: 0,
      blendStrength: 0.62,
      seamSmoothing: 0.92,
      formSideAmbienceIntensity: 0.32,
      contrastProtection: 0.9
    },
    quality: Object.fromEntries(
      Object.keys(base.quality).map((key) => [key, true])
    ) as typeof base.quality
  };
}

export async function activateFestivalPack({
  packId,
  actorId,
  schedule,
  targets,
  studioConfigurationId
}: {
  packId: string;
  actorId: string;
  schedule?: { startAt: string; endAt: string; repeatYearly: boolean } | null;
  targets?: {
    clientLoginEnabled: boolean;
    employeeLoginEnabled: boolean;
  } | null;
  studioConfigurationId?: string | null;
}) {
  await withDbTransaction(async (query) => {
    const packs = await query<{
      id: string;
      theme_id: string;
      state: string;
      client_login_enabled: boolean;
      employee_login_enabled: boolean;
      homepage_enabled: boolean;
    }>(`
      select id, theme_id, state, client_login_enabled,
        employee_login_enabled, homepage_enabled
      from festival_pack_imports where id = $1 for update
    `, [packId]);
    const pack = packs[0];
    if (!pack || !["approved", "previous", "scheduled"].includes(pack.state)) {
      throw badRequest("Approve the festival pack before activation or scheduling.");
    }
    const clientLoginEnabled = targets?.clientLoginEnabled ?? pack.client_login_enabled;
    const employeeLoginEnabled =
      targets?.employeeLoginEnabled ?? pack.employee_login_enabled;
    if (!clientLoginEnabled && !employeeLoginEnabled && !pack.homepage_enabled) {
      throw badRequest("Choose Client Login, Employee Login or both before activation.");
    }
    if (targets) {
      await query(`
        update festival_pack_imports
        set client_login_enabled = $2, employee_login_enabled = $3,
            updated_at = now()
        where id = $1
      `, [packId, clientLoginEnabled, employeeLoginEnabled]);
    }
    if (schedule) {
      const start = new Date(schedule.startAt);
      const end = new Date(schedule.endAt);
      if (!Number.isFinite(start.valueOf()) || !Number.isFinite(end.valueOf()) || end <= start) {
        throw badRequest("Choose a valid festival schedule with an end after the start.");
      }
    }
    await query(`
      update festival_pack_imports
      set state = 'previous', updated_at = now()
      where theme_id = $1 and state in ('active','scheduled') and id <> $2
    `, [pack.theme_id, packId]);
    await query(`
      update festival_asset_assignments assignment
      set state = 'replaced', removed_by = $3, removed_at = now(),
          removal_reason = 'Replaced by an activated festival pack.', updated_at = now()
      from holiday_theme_assets asset
      where assignment.asset_version_id = asset.id
        and assignment.theme_id = $1
        and assignment.state = 'active'
        and coalesce(asset.asset_metadata->>'festivalPackId', '') <> $2
        and assignment.placement not in ('private_reference','palette_source','motif_interpretation_source')
        and (
          $4::uuid is null
          or not exists (
            select 1
            from festival_studio_configurations configuration
            where configuration.id = $4
              and asset.id in (
                configuration.client_login_hero_asset_id,
                configuration.employee_login_hero_asset_id,
                configuration.website_hero_asset_id,
                configuration.header_asset_id,
                configuration.axo_asset_id,
                configuration.background_asset_id,
                configuration.sound_asset_id
              )
          )
        )
    `, [pack.theme_id, packId, actorId, studioConfigurationId || null]);
    await query(`
      update festival_asset_assignments assignment
      set state = 'active', removed_by = null, removed_at = null,
          removal_reason = null, updated_at = now()
      from holiday_theme_assets asset
      where assignment.asset_version_id = asset.id
        and asset.asset_metadata->>'festivalPackId' = $1
    `, [packId]);

    const composition = importedLoginComposition(packId);
    for (const [channel, enabled] of [
      ["client", clientLoginEnabled],
      ["employee", employeeLoginEnabled]
    ] as const) {
      if (!enabled) continue;
      await query(`
        update holiday_login_theme_settings
        set mode = 'holiday', state = $2, theme_id = $3,
            start_at = $4, end_at = $5, enabled = true,
            composition_config = $6::jsonb, version_number = version_number + 1,
            approval_state = 'approved', approved_at = now(), approved_by = $7,
            last_failure_code = null, last_changed_by = $7, updated_at = now()
        where channel = $1
      `, [
        channel,
        schedule ? "theme_scheduled" : "theme_active",
        pack.theme_id,
        schedule?.startAt || null,
        schedule?.endAt || null,
        JSON.stringify(composition),
        actorId
      ]);
    }
    await query(`
      update holiday_themes
      set active_festival_pack_id = $2,
          status = $3,
          mode = $4,
          start_at = $5,
          end_at = $6,
          repeat_yearly = $7,
          apply_to_homepage = $8,
          apply_to_login_screens = $9,
          apply_to_client_login = $10,
          apply_to_employee_login = $11,
          is_enabled = true,
          activated_by = case when $3 = 'active' then $12 else activated_by end,
          updated_by = $12,
          updated_at = now()
      where id = $1
    `, [
      pack.theme_id,
      packId,
      schedule ? "scheduled" : "active",
      schedule ? "automatic" : "manual",
      schedule?.startAt || null,
      schedule?.endAt || null,
      schedule?.repeatYearly || false,
      pack.homepage_enabled,
      clientLoginEnabled || employeeLoginEnabled,
      clientLoginEnabled,
      employeeLoginEnabled,
      actorId
    ]);
    if (!schedule) {
      await query(
        "update holiday_themes set status = 'paused', updated_at = now() where status = 'active' and id <> $1",
        [pack.theme_id]
      );
      await query(`
        update website_experience_settings
        set holiday_mode_enabled = true, emergency_disabled = false,
            active_theme_id = $1, manual_override_theme_id = $1,
            last_resolved_theme_id = $1, last_switched_at = now(),
            last_switched_by = $2, updated_at = now()
        where singleton_key = 'global'
      `, [pack.theme_id, actorId]);
    }
    await query(`
      update festival_pack_imports
      set state = $2, activated_by = case when $2 = 'active' then $3 else activated_by end,
          activated_at = case when $2 = 'active' then now() else activated_at end,
          scheduled_start_at = $4, scheduled_end_at = $5,
          repeat_yearly = $6, updated_at = now()
      where id = $1
    `, [
      packId,
      schedule ? "scheduled" : "active",
      actorId,
      schedule?.startAt || null,
      schedule?.endAt || null,
      schedule?.repeatYearly || false
    ]);
    await query(`
      insert into festival_pack_audit (pack_id, actor_admin_user_id, action, safe_metadata)
      values ($1, $2, $3, $4::jsonb)
    `, [
      packId,
      actorId,
      schedule ? "package_scheduled" : "package_activated",
      JSON.stringify({
        clientLogin: clientLoginEnabled,
        employeeLogin: employeeLoginEnabled,
        homepage: pack.homepage_enabled,
        schedule: schedule || null
      })
    ]);
  });
  return getFestivalPackSnapshot();
}

export async function archiveFestivalPack(packId: string, actorId: string) {
  await withDbTransaction(async (query) => {
    const pack = (await query<{ state: string }>(
      "select state from festival_pack_imports where id = $1 for update",
      [packId]
    ))[0];
    if (!pack) throw badRequest("Festival pack was not found.");
    if (["active", "scheduled"].includes(pack.state)) {
      throw badRequest("Restore another pack or the default theme before archiving this pack.");
    }
    await query(
      "update festival_pack_imports set state = 'archived', archived_at = now(), updated_at = now() where id = $1",
      [packId]
    );
    await query(`
      insert into festival_pack_audit (pack_id, actor_admin_user_id, action)
      values ($1, $2, 'package_archived')
    `, [packId, actorId]);
  });
  return getFestivalPackSnapshot();
}

export async function restorePreviousFestivalPack(packId: string, actorId: string) {
  const result = await dbQuery<{ previous_pack_id: string | null }>(
    "select previous_pack_id from festival_pack_imports where id = $1",
    [packId]
  );
  const previousPackId = result.rows[0]?.previous_pack_id;
  if (!previousPackId) throw badRequest("This pack has no previous version to restore.");
  return activateFestivalPack({ packId: previousPackId, actorId });
}

export function festivalPackContainsPublicMappings(pack: FestivalPackRecord) {
  return pack.files.some((file) =>
    file.approvedMappings.some((mapping) => publicMappings.has(mapping.location))
  );
}
