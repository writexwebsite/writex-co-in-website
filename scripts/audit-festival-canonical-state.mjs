import pg from "pg";

const { Client } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  const configurations = await client.query(`
    select id, festival_slug, festival_name, selected_variant_pack_id,
      selected_variant_slug, activation_status, version,
      client_login_hero_asset_id, employee_login_hero_asset_id,
      website_hero_asset_id, header_asset_id, axo_asset_id,
      background_asset_id, sound_asset_id
    from festival_studio_configurations
    where festival_slug in ('christmas', 'independence-day')
    order by festival_slug
  `);
  const packs = await client.query(`
    select id, package_name, package_version, state,
      manifest_json->>'festivalSlug' as festival_slug,
      manifest_json->>'variantSlug' as variant_slug,
      manifest_json->>'variantName' as variant_name
    from festival_pack_imports
    where manifest_json->>'festivalSlug' = 'christmas'
    order by package_version, created_at
  `);
  const independencePacks = await client.query(`
    select id, package_name, package_version, state,
      manifest_json->>'festivalSlug' as festival_slug,
      manifest_json->>'variantSlug' as variant_slug,
      manifest_json->>'variantName' as variant_name,
      completeness_flags
    from festival_pack_imports
    where manifest_json->>'festivalSlug' = 'independence-day'
    order by package_version, created_at
  `);
  const independenceAssets = await client.query(`
    select pack.id as pack_id, pack.manifest_json->>'variantSlug' as variant_slug,
      pack.manifest_json->>'variantName' as variant_name,
      file.safe_file_name, file.file_kind as kind, file.mime_type,
      mapping.value->>'location' as location,
      mapping.value->>'variant' as responsive_variant,
      file.asset_version_id, asset.asset_role,
      asset.review_status, asset.quality_status
    from festival_pack_imports pack
    join festival_pack_files file on file.pack_id = pack.id
    left join lateral jsonb_array_elements(file.approved_mappings) mapping(value) on true
    left join holiday_theme_assets asset on asset.id = file.asset_version_id
    where pack.manifest_json->>'festivalSlug' = 'independence-day'
    order by variant_slug, file.safe_file_name, location
  `);
  const christmasAssets = await client.query(`
    select pack.id as pack_id, pack.manifest_json->>'variantSlug' as variant_slug,
      file.safe_file_name, file.file_kind as kind, file.mime_type,
      mapping.value->>'location' as location,
      mapping.value->>'variant' as responsive_variant,
      asset.asset_role, asset.review_status, asset.quality_status
    from festival_pack_imports pack
    join festival_pack_files file on file.pack_id = pack.id
    left join lateral jsonb_array_elements(file.approved_mappings) mapping(value) on true
    left join holiday_theme_assets asset on asset.id = file.asset_version_id
    where pack.manifest_json->>'festivalSlug' = 'christmas'
    order by variant_slug, file.safe_file_name, location
  `);
  const assignmentTypes = await client.query(`
    select configuration.festival_slug, configuration.selected_variant_slug,
      slot.slot, asset.safe_file_name, asset.asset_role, asset.mime_type,
      asset.review_status, asset.quality_status
    from festival_studio_configurations configuration
    cross join lateral (values
      ('clientLoginHero', configuration.client_login_hero_asset_id),
      ('employeeLoginHero', configuration.employee_login_hero_asset_id),
      ('websiteHero', configuration.website_hero_asset_id),
      ('header', configuration.header_asset_id),
      ('axo', configuration.axo_asset_id),
      ('background', configuration.background_asset_id),
      ('sound', configuration.sound_asset_id)
    ) slot(slot, asset_id)
    left join holiday_theme_assets asset on asset.id = slot.asset_id
    where configuration.festival_slug in ('christmas', 'independence-day')
    order by configuration.festival_slug, slot.slot
  `);

  console.log(JSON.stringify({
    configurations: configurations.rows,
    independencePacks: independencePacks.rows,
    independenceAssets: independenceAssets.rows,
    christmasPacks: packs.rows,
    christmasAssetCount: christmasAssets.rowCount,
    assignmentTypes: assignmentTypes.rows
  }, null, 2));
} finally {
  await client.end();
}
