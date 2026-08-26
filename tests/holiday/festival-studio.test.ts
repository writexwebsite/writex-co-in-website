import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PUBLIC_FESTIVAL_ASSET_PLACEMENTS,
  placementPublicRole
} from "../../lib/holiday/asset-governance-types";
import { DEFAULT_EXPERIENCE_PACK } from "../../lib/holiday/packs";
import {
  activeFestivalSceneAssignments,
  normalizeFestivalStudioScene
} from "../../lib/holiday/canonical-scene";
import { studioSchema } from "../../lib/holiday/validation";

test("legacy scene assignment ids are canonicalized when a festival is selected", () => {
  const studio = structuredClone(DEFAULT_EXPERIENCE_PACK.studio);
  studio.motifAssignments = [{
    id: "recommended_onam_navigation_rail",
    assetId: "marigold-garland",
    region: "navigation_rail",
    enabled: true,
    size: "medium",
    density: "festive",
    motion: "gentle_wind",
    layer: 20,
    visibility: { desktop: true, tablet: true, mobile: true },
    religiousArtworkApproved: true
  }];

  const parsed = studioSchema.parse(studio);
  assert.equal(parsed.motifAssignments[0].id, "recommended-onam-navigation-rail");
});

test("scene editor keeps rollback state while synchronizing canonical draft refreshes", () => {
  const editor = readFileSync("components/admin/FestivalPackStudio.tsx", "utf8");
  const studio = readFileSync("components/admin/FestivalStudio.tsx", "utf8");

  assert.match(editor, /Restore Previous/);
  assert.match(studio, /setSceneEditorRevision\(\(value\) => value \+ 1\)/);
  assert.match(studio, /key=\{`\$\{selected\.id\}:\$\{decorationSection\}:\$\{sceneEditorRevision\}`\}/);
  assert.doesNotMatch(studio, /selected\.id\}:\$\{selected\.version\}:\$\{decorationSection/);
  assert.doesNotMatch(editor, /useEffect\(/);
});

test("custom website decorations outrank recommended assets without reviving legacy defaults", () => {
  const studio = structuredClone(DEFAULT_EXPERIENCE_PACK.studio);
  studio.regions.navigation_rail.enabled = true;
  studio.motifAssignments = [
    {
      id: "recommended-independence-header",
      assetId: "recommended-ribbon",
      sourceMode: "recommended",
      region: "navigation_rail",
      enabled: true,
      size: "medium",
      density: "festive",
      motion: "static",
      layer: 10,
      visibility: { desktop: true, tablet: true, mobile: true },
      religiousArtworkApproved: true
    },
    {
      id: "custom-independence-header",
      assetId: "tricolour-ribbon",
      sourceMode: "custom",
      region: "navigation_rail",
      enabled: true,
      size: "medium",
      density: "festive",
      motion: "gentle_wind",
      layer: 20,
      visibility: { desktop: true, tablet: true, mobile: true },
      religiousArtworkApproved: true
    }
  ];

  const canonical = normalizeFestivalStudioScene(studio);
  const active = activeFestivalSceneAssignments(canonical, ["navigation_rail"]);
  assert.deepEqual(active.map((assignment) => assignment.assetId), [
    "tricolour-ribbon"
  ]);
  assert.equal(
    canonical.motifAssignments.find(
      (assignment) => assignment.assetId === "recommended-ribbon"
    )?.enabled,
    false
  );
});

test("Axo assignments resolve publicly while retaining default fallback semantics", () => {
  assert.equal(PUBLIC_FESTIVAL_ASSET_PLACEMENTS.has("axo_theme_reference"), true);
  assert.equal(
    placementPublicRole({ placement: "axo_theme_reference", route: "/" }),
    "axo"
  );
  assert.equal(
    placementPublicRole({
      placement: "axo_theme_reference",
      route: "/trust-centre"
    }),
    "axo"
  );
});

test("canonical migration preserves legacy history and repairs the Independence Day Axo slot", () => {
  const migration = readFileSync(
    "database/migrations/20260731_festival_studio_canonical.sql",
    "utf8"
  );
  assert.match(migration, /create table if not exists festival_studio_configurations/i);
  assert.match(migration, /create table if not exists festival_studio_configuration_versions/i);
  assert.match(migration, /create table if not exists festival_studio_legacy_records/i);
  assert.match(migration, /lower\(library\.display_name\) = 'mascot-1\.png'/i);
  assert.match(migration, /placement = 'axo_theme_reference'/i);
  assert.match(migration, /existing\.state = 'active'/i);
  assert.doesNotMatch(migration, /delete\s+from\s+(holiday_theme_assets|festival_asset_library)/i);
});

test("all legacy Website Experience pages converge on Festival Studio", () => {
  const redirects: Array<[string, RegExp]> = [
    ["app/admin/website-experience/page.tsx", /festival-studio/],
    ["app/admin/website-experience/holiday-themes/page.tsx", /festival-studio\?section=schedule/],
    ["app/admin/website-experience/import-festival-pack/page.tsx", /festival-studio\?section=configure&tool=import/],
    ["app/admin/website-experience/festival-assets/page.tsx", /festival-studio\?section=configure&tool=asset-library/],
    ["app/admin/website-experience/festival-hero-library/page.tsx", /festival-studio\?section=configure/]
  ];
  for (const [path, expected] of redirects) {
    assert.match(readFileSync(path, "utf8"), expected);
  }
  const navigation = readFileSync("lib/admin/navigation.ts", "utf8");
  assert.equal((navigation.match(/label: "Festival Studio"/g) || []).length, 1);
  assert.doesNotMatch(
    navigation,
    /label: "Holiday Themes"|label: "Festival Assets"|label: "Festival Hero Library"/
  );
});

test("Festival Studio provides one guided configure, preview, activation and diagnostic flow", () => {
  const component = readFileSync("components/admin/FestivalStudio.tsx", "utf8");
  for (const text of [
    "1. Select Festival",
    "2. Decorate Website",
    "3. Behaviour",
    "Preview & Activate",
    "Approve & Activate",
    "Restore Default",
    "Full Festival Reset",
    "Why is this not showing?",
    "Advanced Settings"
  ]) {
    assert.match(component, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Festival Studio invalidates stale preview approval and exposes an explicit refresh path", () => {
  const studio = readFileSync(
    "components/admin/FestivalStudio.tsx",
    "utf8"
  );

  assert.match(studio, /function invalidatePreviewApproval\(\)/);
  assert.match(studio, /\["preview", "preview_exact"\]/);
  assert.match(studio, /changed after preview/i);
  assert.match(studio, /Fresh Preview Required/);
  assert.match(studio, /Refresh Private Preview/);
  assert.match(
    studio,
    /Create and review a fresh private preview before activation\./
  );
  assert.match(
    studio,
    /selectedPack && exactPreview\?\.packId === selectedPack\.id/
  );
  assert.match(studio, /!exactPreviewIsCurrent/);
});

test("Festival Studio keeps visual customisation visible while recommended setup, search and help simplify operation", () => {
  const component = readFileSync("components/admin/FestivalStudio.tsx", "utf8");
  const navigation = readFileSync("lib/admin/navigation.ts", "utf8");
  const guidance = readFileSync("lib/admin/guidance-content.ts", "utf8");
  const repository = readFileSync("lib/holiday/festival-studio-repository.ts", "utf8");
  const migration = readFileSync("database/migrations/20260801_admin_feature_notice_state.sql", "utf8");
  for (const label of ["Use Recommended Festival Setup", "Decorate Header", "Decorate Ground & Page Bottom", "Decorate AXO", "Festival Scene Effects", "Sound", "Turn Off Festival", "Restore Normal Website", "Advanced Customisation"]) {
    assert.match(component, new RegExp(label));
  }
  assert.match(component, /soundEnabled: false/);
  assert.match(component, /applyRecommendedDecorationPacks/);
  assert.match(component, /user-started/);
  assert.match(navigation, /maala/);
  assert.match(navigation, /Restore Normal Website/);
  assert.match(guidance, /Festival Studio Quick Start/);
  assert.match(guidance, /Emergency Festival Reset/);
  assert.match(repository, /festival-studio-simplified-v2/);
  assert.match(migration, /primary key \(admin_user_id, notice_key\)/);
});

test("Festival Studio simplified notice uses theme-aware contrast tokens", () => {
  const studio = readFileSync("components/admin/FestivalStudio.tsx", "utf8");

  assert.match(
    studio,
    /border-wxBorder bg-wxSurfaceSoft[\s\S]*?Festival Studio has been simplified/
  );
  assert.doesNotMatch(
    studio,
    /border-wxViolet700\/30 bg-violet-50/
  );
});

test("religious approval is enforced from governed motif metadata, not an inverted request flag", () => {
  const validation = readFileSync("lib/holiday/validation.ts", "utf8");
  const repository = readFileSync("lib/holiday/festival-studio-repository.ts", "utf8");
  assert.doesNotMatch(
    validation,
    /assignment\.religiousArtworkApproved\s*&&\s*!value\.religiousArtworkApproved/
  );
  assert.match(repository, /motif\.religiousApprovalRequired/);
  assert.match(repository, /religiousArtworkConfirmed/);
});

test("Festival Studio save casts nullable UUID parameters before status evaluation", () => {
  const repository = readFileSync("lib/holiday/festival-studio-repository.ts", "utf8");
  assert.match(repository, /when \$2::uuid is null then 'incomplete'/);
});

test("Festival Studio keeps the selected festival in the URL across refresh", () => {
  const component = readFileSync("components/admin/FestivalStudio.tsx", "utf8");
  const page = readFileSync(
    "app/admin/website-experience/festival-studio/page.tsx",
    "utf8"
  );
  assert.match(component, /url\.searchParams\.set\("festival", config\.festivalSlug\)/);
  assert.match(component, /configuration\.festivalSlug === initialFestivalSlug/);
  assert.match(page, /initialFestivalSlug=\{params\.festival\}/);
});

test("approved variants use exact preview snapshots for direct per-surface activation", () => {
  const component = readFileSync("components/admin/FestivalStudio.tsx", "utf8");
  const route = readFileSync(
    "app/api/admin/website-experience/festival-studio/route.ts",
    "utf8"
  );
  const repository = readFileSync(
    "lib/holiday/festival-studio-repository.ts",
    "utf8"
  );
  const migration = readFileSync(
    "database/migrations/20260801_festival_studio_snapshots.sql",
    "utf8"
  );

  for (const text of [
    "Current Active Hero",
    "Selected Design",
    "Preview Selected Hero",
    "Apply to Client + Employee",
    "Use This Hero",
    "Replace Active Hero?",
    "Restore Previous Hero",
    "Restore Previous Public Theme",
    "Restore Default Hero"
  ]) {
    assert.match(component, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(component, /websiteHero: "Website Hero"/);
  assert.match(component, /clientLoginHero: "Client Login Hero"/);
  assert.match(component, /employeeLoginHero: "Employee Login Hero"/);
  assert.match(component, /Use as \{surfaceLabels\[surface\]\}/);
  assert.match(route, /preview_exact/);
  assert.match(route, /activate_snapshot/);
  assert.match(route, /restore_previous_hero/);
  assert.match(route, /restore_previous_public_snapshot/);
  assert.match(repository, /configuration_hash/);
  assert.match(repository, /allowExpiredSnapshot: true/);
  assert.match(repository, /previous_public_snapshot_restored/);
  assert.match(repository, /Replaced by exact previous public theme restoration/);
  assert.match(repository, /jsonb_build_object\('enabled', \$9::boolean/);
  assert.match(repository, /activeSurfacePackIds/);
  assert.match(repository, /manifest\.festivalSlug \|\| row\.theme_slug/);
  assert.match(repository, /Festival ended and WriteX defaults restored/);
  assert.match(repository, /Reconciled with the default WriteX experience/);
  assert.match(repository, /Full Festival Reset restored WriteX defaults/);
  assert.match(repository, /auto_schedule_enabled = false/);
  assert.match(repository, /full_festival_reset/);
  assert.match(repository, /order by lower\(configuration\.festival_name\)/);
  assert.match(component, /Apply to All Selected Surfaces/);
  assert.match(component, /surfaceLabels\[surface\].*is not included in this approved pack/);
  assert.match(migration, /create table if not exists festival_variant_manifests/i);
  assert.match(migration, /create table if not exists festival_draft_configurations/i);
  assert.match(migration, /create table if not exists festival_preview_snapshots/i);
  assert.match(migration, /create table if not exists active_festival_snapshots/i);
  assert.doesNotMatch(migration, /delete\s+from\s+(holiday_theme_assets|festival_pack_imports)/i);
});

test("Festival Studio keeps asset identity immutable and validates placement compatibility", () => {
  const repository = readFileSync(
    "lib/holiday/festival-studio-repository.ts",
    "utf8"
  );
  const types = readFileSync("lib/holiday/festival-studio-types.ts", "utf8");
  const assignmentStart = repository.indexOf(
    "export async function assignFestivalStudioAsset"
  );
  const assignmentEnd = repository.indexOf(
    "export async function restorePreviousFestivalStudioSlot"
  );
  const assignment = repository.slice(assignmentStart, assignmentEnd);

  assert.match(types, /isFestivalStudioRoleCompatible/);
  assert.match(assignment, /isFestivalStudioRoleCompatible/);
  assert.doesNotMatch(assignment, /set\s+asset_role\s*=/i);
});

test("complete packs expose normal preview, removal and restore controls", () => {
  const editor = readFileSync(
    "components/admin/FestivalPackStudio.tsx",
    "utf8"
  );
  const completePackStart = editor.indexOf(
    'aria-label="Complete festival decoration packs"'
  );
  const advancedBuilderStart = editor.indexOf(
    "Advanced Pack Builder - individual motifs"
  );
  const completePackControls = editor.slice(
    completePackStart,
    advancedBuilderStart
  );
  assert.match(completePackControls, /Preview Complete Pack/);
  assert.match(completePackControls, /Remove Pack/);
  assert.match(completePackControls, /clearFestivalRegion/);
  assert.match(editor, /Restore Previous/);
});

test("source-backed canonical groups receive additive Festival Studio rows", () => {
  const migration = readFileSync(
    "database/migrations/20260804_festival_studio_source_group_configurations.sql",
    "utf8"
  );
  assert.match(migration, /packType' = 'responsive_festival_hero'/);
  assert.match(migration, /where not exists[\s\S]*festival_group_id/);
  assert.match(migration, /website_enabled,[\s\S]*false/);
  assert.match(migration, /activation_status,[\s\S]*'ready'/);
  assert.match(migration, /on conflict \(festival_slug\) do update/);
  assert.match(
    migration,
    /festival_studio_configurations\.festival_group_id is null/
  );
  assert.doesNotMatch(migration, /delete from|truncate|drop table/i);
});

test("pack activation preserves assets selected by the canonical Studio", () => {
  const repository = readFileSync(
    "lib/holiday/festival-pack-repository.ts",
    "utf8"
  );
  assert.match(repository, /studioConfigurationId/);
  assert.match(repository, /festival_studio_configurations configuration/);
  assert.match(repository, /configuration\.axo_asset_id/);
  assert.match(repository, /configuration\.website_hero_asset_id/);
});

test("designer login dark mode uses the official dark logo treatment without a logo box", () => {
  const styles = readFileSync("app/globals.css", "utf8");
  assert.match(
    styles,
    /html\[data-theme="dark"\][\s\S]*\.wx-protected-login-brand[\s\S]*\.wx-brand-logo-image,[\s\S]*\.wx-auth-card-logo[\s\S]*\.wx-brand-logo-image\s*\{[\s\S]*filter:\s*grayscale\(1\) brightness\(0\) invert\(1\)\s*!important;[\s\S]*opacity:\s*0\.94\s*!important/
  );
  assert.match(
    styles,
    /\.wx-auth-shell:has\(\.wx-designer-login-pack\)[\s\S]*\.wx-protected-login-brand[\s\S]*a\[aria-label="WriteX trademark home"\],[\s\S]*\.wx-auth-card-logo[\s\S]*a\[aria-label="WriteX trademark home"\][\s\S]*pointer-events:\s*auto\s*!important/
  );
});

test("festival desktop login composition uses one canvas and keeps the form secondary", () => {
  const styles = readFileSync("app/globals.css", "utf8");
  assert.match(styles, /data-layout-contract="single-canvas-v1"[\s\S]*height:\s*100dvh/);
  assert.match(styles, /width:\s*clamp\(26\.25rem, 29vw, 30rem\)/);
  assert.match(styles, /@media \(max-width: 47\.999rem\)[\s\S]*max-width:\s*520px/);
});

test("festival logos remain transparent while the functional card stays solid", () => {
  const styles = readFileSync("app/globals.css", "utf8");
  assert.match(
    styles,
    /\.wx-auth-shell:has\(\.wx-designer-login-pack\) \.wx-protected-login-brand,[\s\S]*?\.wx-auth-card-logo[\s\S]*?background:\s*transparent\s*!important;[\s\S]*?box-shadow:\s*none\s*!important;[\s\S]*?backdrop-filter:\s*none\s*!important;/
  );
  assert.match(
    styles,
    /data-layout-contract="single-canvas-v1"[\s\S]*?\.wx-auth-card\s*\{[\s\S]*?background:\s*rgb\(255 255 255\)\s*!important;[\s\S]*?backdrop-filter:\s*none\s*!important;/
  );
});

test("festival variants are scoped by canonical ownership and reset on festival change", () => {
  const repository = readFileSync("lib/holiday/festival-studio-repository.ts", "utf8");
  const studio = readFileSync("components/admin/FestivalStudio.tsx", "utf8");
  const migration = readFileSync(
    "database/migrations/20260801_festival_variant_ownership_scope.sql",
    "utf8"
  );
  assert.match(repository, /assertCanonicalPackOwnership/);
  assert.match(repository, /owner\.id !== configuration\.festival_group_id/);
  assert.match(studio, /compatible\.find\([\s\S]*config\.selectedVariantPackId/);
  assert.match(studio, /Reset to \{selected\.festivalName\} Default/);
  assert.match(migration, /festival_variant_manifest_scoped_identity_idx/);
  assert.match(migration, /selected_variant_pack_id = defaults\.pack_id/);
});

test("Decorate Website uses four focused builders and one canonical scene draft", () => {
  const studio = readFileSync("components/admin/FestivalStudio.tsx", "utf8");
  const visualEditor = readFileSync("components/admin/FestivalPackStudio.tsx", "utf8");
  const repository = readFileSync("lib/holiday/festival-studio-repository.ts", "utf8");
  const route = readFileSync("app/api/admin/website-experience/festival-studio/route.ts", "utf8");

  for (const label of [
    "Decorate Header",
    "Decorate Ground & Page Bottom",
    "Decorate AXO",
    "Festival Scene Effects"
  ]) assert.match(studio, new RegExp(label.replace("&", "\\&")));
  assert.match(studio, /Your selected Login design is already configured/);
  assert.match(studio, /Draft Preview - Not Public/);
  assert.match(visualEditor, /Recommended for/);
  assert.match(visualEditor, /Show all approved assets/);
  assert.match(visualEditor, /asset\.intendedFestivals\.includes\(festivalSlug\)/);
  assert.match(route, /action: z\.literal\("save_scene"\)/);
  assert.match(repository, /sceneConfiguration: canonicalStudio/);
  assert.match(repository, /The draft changed in another session; refresh and retry/);
});

test("governed reviewed assets flow through the Scene Builder by exact private version", () => {
  const studio = readFileSync("components/admin/FestivalStudio.tsx", "utf8");
  const editor = readFileSync("components/admin/FestivalPackStudio.tsx", "utf8");
  const governed = readFileSync("lib/holiday/governed-motifs.ts", "utf8");
  const renderer = readFileSync("components/holiday/HolidayDecorations.tsx", "utf8");
  const repository = readFileSync("lib/holiday/festival-studio-repository.ts", "utf8");

  assert.match(studio, /governedFestivalMotifs/);
  assert.match(studio, /governedAssets=\{governedSceneAssets\}/);
  assert.match(editor, /libraryAssetId/);
  assert.match(editor, /assetVersionId/);
  assert.match(governed, /reviewStatus !== "approved"/);
  assert.match(governed, /lifecycleState !== "active"/);
  assert.match(governed, /\/api\/website-experience\/assets\/\$\{version\.id\}/);
  assert.match(renderer, /assignment\.assetVersionId/);
  assert.match(renderer, /\/api\/website-experience\/assets\/\$\{assignment\.assetVersionId\}/);
  assert.match(repository, /The governed asset version is not approved for this festival draft/);
  assert.match(repository, /governed\.library_lifecycle_state !== "active"/);
  assert.doesNotMatch(repository, /governed\.theme_id !== themeId/);
  assert.match(repository, /ensureGovernedSceneAssignments/);
  assert.match(repository, /scene_assignment_enabled/);
  assert.match(repository, /publicActivation: false/);
  assert.match(repository, /The governed asset category is incompatible with the selected website region/);
  assert.doesNotMatch(repository, /Approve the exact asset version for this website placement before saving the scene/);
});

test("governed Ambient and Feature compositions retain explicit compatible regions", () => {
  const repository = readFileSync(
    "lib/holiday/festival-studio-repository.ts",
    "utf8"
  );
  assert.match(repository, /page_ambience:\s*\["ambient"\]/);
  assert.match(repository, /floating_edges:\s*\["feature",\s*"ground",\s*"header"\]/);
});

test("public festival rendering is projected from one canonical activation snapshot", () => {
  const activation = readFileSync(
    "lib/holiday/active-festival-snapshot.ts",
    "utf8"
  );
  const route = readFileSync(
    "app/api/website-experience/theme/route.ts",
    "utf8"
  );
  const repository = readFileSync(
    "lib/holiday/festival-studio-repository.ts",
    "utf8"
  );
  const decorations = readFileSync(
    "components/holiday/HolidayDecorations.tsx",
    "utf8"
  );
  const chrome = readFileSync("components/AppChrome.tsx", "utf8");
  const axo = readFileSync("components/axo/AxoMascot.tsx", "utf8");

  assert.match(activation, /from active_festival_snapshots snapshot/);
  assert.match(activation, /where snapshot\.state = 'active'/);
  assert.match(activation, /theme\.id !== snapshot\.themeId/);
  assert.doesNotMatch(activation, /theme\.slug !== snapshot\.festivalSlug/);
  assert.match(activation, /slug: snapshot\.festivalSlug/);
  assert.match(activation, /animationEnabled: snapshot\.sceneState\.motionEnabled/);
  assert.match(activation, /header: snapshot\.sceneState\.headerEnabled/);
  assert.match(activation, /footer: snapshot\.sceneState\.groundEnabled/);
  assert.match(activation, /axo: snapshot\.sceneState\.axoEnabled/);
  assert.match(route, /applyPublicFestivalActivationSnapshot/);
  assert.match(route, /previewIdentity/);
  assert.match(route, /previewVariant\.variantName/);
  assert.match(route, /canonicalActivation: Boolean\(canonicalFestivalSnapshot\)/);
  assert.match(repository, /draft changed after preview\. Refresh Preview before activation/);
  assert.match(repository, /sceneConfiguration: activeScene/);
  assert.match(repository, /apply_to_header = \$3/);
  assert.match(repository, /apply_to_footer = \$4/);
  assert.match(repository, /apply_axo_theme = \$5/);
  assert.match(repository, /\$10::uuid/);
  assert.match(decorations, /data-festival-region="ground-page-bottom"/);
  assert.match(decorations, /data-festival-region="approved-axo-area"/);
  assert.match(decorations, /data-effect-kind=\{featureEffect \? "feature" : "ambient"\}/);
  assert.match(chrome, /HolidayFestivalAxoRegion/);
  assert.match(chrome, /HolidayGroundDecoration/);
  assert.doesNotMatch(axo, /HolidayAxoAccessory/);
});

test("scene assignment persists enabled regions and uses collision-safe public layers", () => {
  const editor = readFileSync(
    "components/admin/FestivalPackStudio.tsx",
    "utf8"
  );
  const styles = readFileSync("app/globals.css", "utf8");
  const validation = readFileSync("lib/holiday/validation.ts", "utf8");
  const decorations = readFileSync(
    "components/holiday/HolidayDecorations.tsx",
    "utf8"
  );
  assert.match(editor, /enabled: true/);
  assert.match(editor, /await onSave\(nextStudio\)/);
  assert.match(styles, /\.wx-festival-ground-region/);
  assert.match(styles, /\.wx-festival-axo-region/);
  assert.match(styles, /\.wx-festival-axo-region\[data-private-preview="true"\]/);
  assert.match(styles, /\.wx-festival-header-pack-connected/);
  assert.match(styles, /data-connected-canvas="true"/);
  assert.match(styles, /wx-festival-connected-rail-glow/);
  assert.match(styles, /width: 100%/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(decorations, /wx-festival-ground-region pointer-events-none/);
  assert.match(decorations, /wx-festival-axo-region pointer-events-none fixed/);
  assert.match(decorations, /data-private-preview=/);
  const headerRail = readFileSync(
    "components/holiday/FestivalHeaderRail.tsx",
    "utf8"
  );
  assert.match(headerRail, /wx-festival-header-pack-connected/);
  assert.match(headerRail, /connectedSegmentFrame/);
  assert.match(headerRail, /data-festival-header-viewport/);
  assert.match(headerRail, /asset\.visibility\.mobile/);
  assert.match(headerRail, /preserveAspectRatio="none"/);
  assert.match(headerRail, /ASHOKA_CHAKRA_SPOKE_COUNT = 24/);
  assert.match(headerRail, /wx-festival-ashoka-chakra/);
  assert.match(headerRail, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(headerRail, /festivalSlug === "independence-day"/);
  assert.match(headerRail, /festivalSlug === "republic-day"/);
  assert.match(styles, /\.wx-festival-ashoka-chakra/);
  assert.match(styles, /aspect-ratio: 1/);
  assert.doesNotMatch(headerRail, /gap-3 px-4/);
  const motifLibrary = readFileSync("lib/holiday/motif-library.ts", "utf8");
  const decorationPacks = readFileSync("lib/holiday/decoration-packs.ts", "utf8");
  const builtInAssets = readFileSync("lib/holiday/built-in-assets.ts", "utf8");
  const independenceFlag = readFileSync(
    "public/festival-assets/library/axo_accessories/axo-independence-flag.svg",
    "utf8"
  );
  assert.match(motifLibrary, /id: "axo-independence-flag"/);
  assert.match(decorationPacks, /axo\("independence-day", "Independence Day", "axo-independence-flag"\)/);
  assert.match(builtInAssets, /axo-independence-flag\.svg\?v=3/);
  assert.match(independenceFlag, /viewBox="0 0 752 1159"/);
  assert.match(independenceFlag, /raised left hand/);
  assert.equal((independenceFlag.match(/<line /g) || []).length, 24);
  assert.match(
    validation,
    /assetPackId:[\s\S]*?\^\[a-z0-9\]\[a-z0-9:_-\]\*\$/
  );
});

test("page-level Save Draft persists pending visual scene edits before general settings", () => {
  const studio = readFileSync("components/admin/FestivalStudio.tsx", "utf8");
  const editor = readFileSync(
    "components/admin/FestivalPackStudio.tsx",
    "utf8"
  );

  assert.match(studio, /const \[pendingSceneStudio, setPendingSceneStudio\]/);
  assert.match(studio, /if \(pendingSceneStudio\)[\s\S]*?action: "save_scene"/);
  assert.match(studio, /studio: pendingSceneStudio/);
  assert.match(
    studio,
    /onPendingStudioChange=\{\(studio\) => \{[\s\S]*?setPendingSceneStudio\(studio\)[\s\S]*?invalidatePreviewApproval\(\)/
  );
  assert.match(editor, /onPendingStudioChange\?\.\(cloneStudio\(next\)\)/);
  assert.match(editor, /onPendingStudioChange\?\.\(null\)/);
});

test("failed scene saves roll the optimistic editor back to persisted state", () => {
  const editor = readFileSync(
    "components/admin/FestivalPackStudio.tsx",
    "utf8"
  );

  assert.match(editor, /const restorePersistedStudio =/);
  assert.match(editor, /if \(saved\)[\s\S]*?else \{\s*restorePersistedStudio\(studio\)/);
  assert.match(
    editor,
    /restorePreviousSceneChange[\s\S]*?if \(saved\)[\s\S]*?else \{\s*restorePersistedStudio\(currentStudio\)/
  );
});

test("removing a festival decoration persists the valid default fallback", () => {
  const editor = readFileSync(
    "components/admin/FestivalPackStudio.tsx",
    "utf8"
  );
  const clearStart = editor.indexOf("const clearFestivalRegion = async");
  const clearEnd = editor.indexOf("const applyRecommendedForRegion", clearStart);
  const clearRegion = editor.slice(clearStart, clearEnd);

  assert.match(clearRegion, /enabled: false/);
  assert.match(clearRegion, /assetPackId: "built-in:default"/);
  assert.doesNotMatch(clearRegion, /assetPackId: ""/);
});

test("exact preview URLs remain bound to their immutable festival snapshot", () => {
  const provider = readFileSync(
    "components/holiday/HolidayExperienceProvider.tsx",
    "utf8"
  );
  const themeRoute = readFileSync(
    "app/api/website-experience/theme/route.ts",
    "utf8"
  );
  const assetRoute = readFileSync(
    "app/api/website-experience/assets/[assetId]/route.ts",
    "utf8"
  );
  const projection = readFileSync("lib/holiday/public.ts", "utf8");
  const decorations = readFileSync(
    "components/holiday/HolidayDecorations.tsx",
    "utf8"
  );
  const activeSnapshot = readFileSync(
    "lib/holiday/active-festival-snapshot.ts",
    "utf8"
  );

  assert.match(provider, /window\.location\.search/);
  assert.match(provider, /festivalPreviewSnapshot/);
  assert.match(provider, /!nextExperience\?\.preview/);
  assert.match(provider, /searchParams\.delete\("festivalPreviewSnapshot"\)/);
  assert.match(themeRoute, /requestedPreviewSnapshotId/);
  assert.match(themeRoute, /canonicalFestivalSnapshot\?\.themeId \|\| previewThemeId/);
  assert.match(assetRoute, /requestedPreviewSnapshotId/);
  assert.match(assetRoute, /previewSnapshot\?\.variantPackId/);
  assert.match(projection, /previewSnapshotId/);
  assert.match(projection, /previewIdentity/);
  assert.match(projection, /exactSnapshotAssets/);
  assert.match(projection, /exactSnapshotAssets\.clientLoginHero/);
  assert.match(projection, /asset\.packAssetKey/);
  assert.match(themeRoute, /canonicalFestivalSnapshot\.surfaceAssets/);
  assert.match(activeSnapshot, /surfaceAssets:\s*row\.snapshot_payload\.surfaceAssets/);
  assert.match(activeSnapshot, /login:\s*clientActive \|\| employeeActive/);
  assert.match(activeSnapshot, /innerPages:\s*innerPagesActive/);
  assert.match(activeSnapshot, /pageCoverage:\s*publicPageCoverage/);
  assert.match(decorations, /festivalPreviewSnapshot/);
  assert.match(
    decorations,
    /!experience\?\.preview \|\| !experience\.previewSnapshotId/
  );
});

test("Independence Day uses the shared sitewide shell and explicit effect regions", () => {
  const appChrome = readFileSync("components/AppChrome.tsx", "utf8");
  const decorations = readFileSync(
    "components/holiday/HolidayDecorations.tsx",
    "utf8"
  );
  const packs = readFileSync("lib/holiday/decoration-packs.ts", "utf8");
  const styles = readFileSync("app/globals.css", "utf8");

  assert.match(appChrome, /HolidaySitewideDecoration/);
  assert.match(decorations, /data-festival-region="sitewide-page-frame"/);
  assert.match(decorations, /\["page_ambience", "floating_edges"\]/);
  assert.match(decorations, /theme\.slug === "independence-day"\s*\? 6/);
  assert.match(
    decorations,
    /theme\?\.slug === "independence-day"\s*\? \["floating_decorations", "kite_movement"\]/
  );
  assert.match(packs, /"independence-day", "Independence Day", "feature_effect"/);
  assert.match(styles, /\.wx-independence-site-frame/);
  assert.match(styles, /@keyframes wx-holiday-feature-cycle/);
});

test("authenticated exact previews can render governed versions across canonical theme records", () => {
  const assetRoute = readFileSync(
    "app/api/website-experience/assets/[assetId]/route.ts",
    "utf8"
  );

  assert.match(assetRoute, /FESTIVAL_PREVIEW_SNAPSHOT_COOKIE/);
  assert.match(assetRoute, /getPublicFestivalPreviewSnapshot\(previewSnapshotId\)/);
  assert.match(assetRoute, /assignment\.assetVersionId === asset\.id/);
  assert.match(assetRoute, /assignment\.libraryAssetId === asset\.library_asset_id/);
  assert.match(assetRoute, /!exactPreviewAssignment/);
  assert.match(assetRoute, /if \(\s*!previewThemeId[\s\S]*?activePublicAssignments\.length === 0/);
});

test("public canonical snapshots authorize their exact responsive login assets", () => {
  const assetRoute = readFileSync(
    "app/api/website-experience/assets/[assetId]/route.ts",
    "utf8"
  );

  assert.match(assetRoute, /getPublicFestivalActivationSnapshot/);
  assert.match(assetRoute, /canonicalSnapshot\?\.surfaceAssets\[routeSurface\]/);
  assert.match(assetRoute, /entry\.assetId === asset\.id/);
  assert.match(assetRoute, /publicActivationSnapshot\?\.surfaceState\[routeSurface\]\?\.packId/);
  assert.match(assetRoute, /!exactPublicAssignment && activePublicAssignments\.length === 0/);
});

test("exact Festival Studio preview and activation share one unblurred full-canvas composition", () => {
  const loginTheme = readFileSync("lib/holiday/login-theme.ts", "utf8");
  const projection = readFileSync("lib/holiday/public.ts", "utf8");
  const repository = readFileSync(
    "lib/holiday/festival-studio-repository.ts",
    "utf8"
  );
  const styles = readFileSync("app/globals.css", "utf8");

  assert.match(loginTheme, /festivalPackFullCanvasComposition/);
  assert.match(loginTheme, /applyMode:\s*"full_canvas_floating_form"/);
  assert.match(loginTheme, /extendedBlurPx:\s*0/);
  assert.match(loginTheme, /darkOverlayOpacity:\s*0/);
  assert.match(projection, /festivalPackFullCanvasComposition\(selectedPackId\)/);
  assert.match(repository, /festivalPackFullCanvasComposition\(pack\.id\)/);
  assert.match(styles, /\.wx-festival-login-canvas img[\s\S]*filter:\s*none\s*!important/);
  assert.match(styles, /\.wx-auth-form-panel,[\s\S]*background:\s*transparent\s*!important/);
  assert.match(styles, /background:\s*rgb\(12 18 48\)\s*!important/);
  assert.match(styles, /backdrop-filter:\s*none\s*!important/);
});

test("official login branding is protected from festival assets and remains configurable through safe presets", () => {
  const shell = readFileSync("components/auth/AuthShell.tsx", "utf8");
  const studio = readFileSync("components/admin/FestivalStudio.tsx", "utf8");
  const provider = readFileSync(
    "components/holiday/HolidayExperienceProvider.tsx",
    "utf8"
  );
  const types = readFileSync("lib/holiday/types.ts", "utf8");
  const styles = readFileSync("app/globals.css", "utf8");

  assert.match(shell, /wx-protected-login-brand/);
  assert.match(shell, /<BrandLogo/);
  assert.match(studio, /Official WriteX Branding/);
  assert.match(studio, /Logo: Protected \/ Always Visible/);
  assert.match(studio, /Tagline: Protected \/ Always Visible/);
  assert.match(studio, /Automatic Safe Area/);
  assert.match(types, /HolidayProtectedLoginBrandConfig/);
  assert.match(provider, /holidayLoginBrandPlacement/);
  assert.match(styles, /\.wx-protected-login-brand[\s\S]*\.wx-brand-logo-image[\s\S]*filter:\s*none\s*!important/);
});

test("Website Experience Admin and read-only auditor receive scoped preview access", () => {
  const permissions = readFileSync("lib/admin/permissions.ts", "utf8");
  const themeRoute = readFileSync("app/api/website-experience/theme/route.ts", "utf8");
  const assetRoute = readFileSync(
    "app/api/website-experience/assets/[assetId]/route.ts",
    "utf8"
  );
  assert.match(permissions, /website_experience_admin/);
  assert.match(permissions, /read_only_auditor/);
  assert.match(themeRoute, /canViewWebsiteExperience\(admin\)/);
  assert.match(assetRoute, /canViewWebsiteExperience\(admin\)/);
});

test("Designer Hero Pack migration is additive and cannot rewrite canonical festival data", () => {
  const migration = readFileSync("database/migrations/20260801_designer_hero_packs.sql", "utf8");
  assert.match(migration, /create table if not exists designer_hero_packs/i);
  assert.match(migration, /create table if not exists designer_hero_pack_derivatives/i);
  assert.match(migration, /references festival_pack_imports\(id\) on delete restrict/i);
  assert.doesNotMatch(migration, /\b(update|delete|truncate|alter)\s+(holiday_themes|festival_pack_imports|festival_studio_configurations|holiday_theme_assets)/i);
});

test("Designer Hero Pack upload remains private and creates responsive art without changing login logic", () => {
  const route = readFileSync("app/api/admin/website-experience/designer-hero-packs/route.ts", "utf8");
  const manager = readFileSync("components/admin/DesignerHeroPackManager.tsx", "utf8");
  const studio = readFileSync("components/admin/FestivalStudio.tsx", "utf8");
  assert.match(route, /\[5120, 3840, 2560, 1920, 1536, 1280, 1024, 768, 480\]/);
  assert.match(route, /\["avif", "webp", "jpeg"\]/);
  assert.match(route, /metadata\.width < 7000 \|\| metadata\.height < 3000/);
  assert.match(route, /mobileSource && width <= 768/);
  assert.match(route, /artworkOnlyConfirmed/);
  assert.match(route, /publicActive: false/);
  assert.doesNotMatch(route, /activateFestivalPack|activate_snapshot/);
  assert.match(manager, /Festival choose karo/);
  assert.match(manager, /Create Private Hero Pack/);
  assert.match(studio, /Advanced Festival Management/);
  assert.match(studio, /Add New Event Pack/);
});
