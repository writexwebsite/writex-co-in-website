import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  defaultHolidayLoginComposition,
  LOGIN_HERO_RESPONSIVE_WIDTHS,
  loginCompositionActivationErrors,
  loginCompositionUsesThemedForm,
  resolveHolidayLoginComposition
} from "../../lib/holiday/login-theme";
import {
  LOGIN_HERO_ASPECT_RATIO_FAMILIES,
  LOGIN_HERO_VARIANTS,
  resolveLoginHeroCrop
} from "../../lib/holiday/login-hero";
import type { HolidayLoginCompositionConfig } from "../../lib/holiday/types";
import {
  DESIGNER_LOGIN_PACKS,
  findDesignerLoginPack
} from "../../lib/holiday/designer-login-packs";

test("login composition defaults to a safe hero rail and one themed real form", () => {
  const config = defaultHolidayLoginComposition();
  assert.equal(config.applyMode, "hero_themed_form");
  assert.equal(config.hero.mobileMode, "form_first");
  assert.equal(config.hero.safeCropApproved, true);
  assert.equal(config.hero.focalX, 25);
  assert.equal(config.hero.fitMode, "smart_crop");
  assert.equal(config.hero.crops.desktopSplit.zoom, 1.08);
  assert.equal(config.background.mode, "theme_palette_gradient");
  assert.equal(config.background.pattern, "subtle_festival");
  assert.equal(config.layout.transition, "soft_blend");
  assert.equal(config.background.strategy, "auto_best_fit");
  assert.equal(config.quality.uniformCanvasApproved, true);
  assert.equal(config.quality.noHardSeam, true);
  assert.equal(config.source.mode, "standard_festival_theme");
  assert.equal(loginCompositionUsesThemedForm(config), true);
  assert.deepEqual(LOGIN_HERO_RESPONSIVE_WIDTHS, [
    480, 768, 960, 1280, 1536, 1920, 2560, 3840, 5120, 7680
  ]);
});

test("designer Independence Day pack uses the approved reference in responsive 8K canvases", () => {
  const pack = findDesignerLoginPack("independence-day-designer-v1");
  assert.equal(DESIGNER_LOGIN_PACKS.length, 1);
  assert.ok(pack);
  assert.ok(pack.assets.hero);
  assert.equal(pack.version, 5);
  assert.equal(pack.completeness.heroLayer, "approved_reference_8k");
  assert.equal(pack.completeness.usesSceneBackgroundFallback, false);
  assert.equal(pack.completeness.containsEmbeddedLoginUi, false);
  assert.equal(pack.activationReady, true);

  const assets = [
    [pack.assets.backgroundFourThree, pack.integrity.backgroundFourThreeSha256],
    [pack.assets.backgroundWide, pack.integrity.backgroundWideSha256],
    [
      pack.assets.backgroundUltrawide,
      pack.integrity.backgroundUltrawideSha256
    ],
    [pack.assets.logo, pack.integrity.logoSha256]
  ] as const;
  for (const [publicPath, expectedHash] of assets) {
    const filePath = `public${publicPath.split("?")[0]}`;
    assert.equal(existsSync(filePath), true);
    assert.equal(
      createHash("sha256").update(readFileSync(filePath)).digest("hex"),
      expectedHash
    );
  }

  const manifest = readFileSync(
    "public/designer-login-packs/independence-day-v2/manifest.json",
    "utf8"
  );
  assert.match(manifest, /"declarativeOnly": true/);
  assert.match(manifest, /"scriptsAllowed": false/);
  assert.match(manifest, /"source": "Design 2\.png"/);
  assert.match(manifest, /"mockLoginCardExcluded": true/);
  assert.match(manifest, /"backgroundWide": \[7680, 4320\]/);
  assert.match(manifest, /"version": 5/);
  assert.match(manifest, /"mode": "single_canvas_floating_form"/);
  assert.match(manifest, /"backgroundStrategy": "responsive_approved_canvas"/);
  assert.match(manifest, /"backgroundFullScene21x9": \[4032, 1707\]/);
  assert.match(manifest, /"ambience": "none"/);
  assert.match(manifest, /"solidFormSideFill": false/);
  const styles = readFileSync("app/globals.css", "utf8");
  assert.match(styles, /background-size: contain/);
  assert.match(
    styles,
    /\.wx-auth-shell:has\(\.wx-designer-login-pack\) \.wx-auth-form-panel \{\s+background: transparent;/
  );
});

test("designer pack activation requires a whitelisted pack id", () => {
  const config = defaultHolidayLoginComposition();
  config.source.mode = "designer_complete_pack";
  config.source.packId = "unknown-pack";
  assert.match(
    loginCompositionActivationErrors(config).join(" "),
    /validated Designer Complete Theme Pack/i
  );
  config.source.packId = "independence-day-designer-v1";
  assert.deepEqual(loginCompositionActivationErrors(config), []);
});

test("partial stored compositions are resolved without losing safe defaults", () => {
  const config = resolveHolidayLoginComposition({
    version: 1,
    applyMode: "hero_default_form",
    hero: {
      focalX: 44
    } as HolidayLoginCompositionConfig["hero"]
  });
  assert.equal(config.applyMode, "hero_default_form");
  assert.equal(config.hero.focalX, 44);
  assert.equal(config.hero.crops.desktopSplit.focalX, 44);
  assert.equal(config.formSkin.cardOpacity, 0.9);
  assert.equal(config.background.seamSmoothing, 0.86);
});

test("legacy designer full composition upgrades to natural full background", () => {
  const config = resolveHolidayLoginComposition({
    ...defaultHolidayLoginComposition(),
    applyMode: "full_composition",
    source: {
      ...defaultHolidayLoginComposition().source,
      mode: "designer_complete_pack",
      packId: "independence-day-designer-v1"
    }
  });
  assert.equal(config.applyMode, "full_natural_background");
  assert.equal(config.layout.desktopColumns, "58_42");
  assert.equal(config.layout.formMaxWidthPx, 600);
  assert.equal(config.background.strategy, "clean_ambient_surface");
  assert.equal(config.background.extendedBlurPx, 0);
  assert.equal(loginCompositionUsesThemedForm(config), true);
});

test("smart crop is art-directed per breakpoint and excludes a right-side baked form", () => {
  const config = defaultHolidayLoginComposition();
  config.hero.embeddedUiState = "contains_embedded_ui";
  const crop = resolveLoginHeroCrop({
    config,
    breakpoint: "desktopSplit",
    sourceWidth: 2000,
    sourceHeight: 1000
  });
  assert.equal(crop.fit, "cover");
  assert.ok(crop.source.left + crop.source.width <= 1240);
  assert.equal(LOGIN_HERO_VARIANTS.desktopSplit.ratio, 4 / 5);
  assert.deepEqual(LOGIN_HERO_ASPECT_RATIO_FAMILIES, [
    "16:10",
    "3:2",
    "4:5",
    "3:4",
    "4:3",
    "1:1",
    "16:9"
  ]);
});

test("embedded UI cannot activate until the safe crop is approved", () => {
  const config = defaultHolidayLoginComposition();
  config.hero.embeddedUiState = "contains_embedded_ui";
  config.hero.safeCropApproved = false;
  assert.match(
    loginCompositionActivationErrors(config)[0],
    /embedded login UI is excluded/i
  );
  config.hero.safeCropApproved = true;
  assert.deepEqual(loginCompositionActivationErrors(config), []);
});

test("quality failures block activation with a specific reason", () => {
  const config = defaultHolidayLoginComposition();
  config.quality.formBackgroundComplete = false;
  assert.match(
    loginCompositionActivationErrors(config).join(" "),
    /background does not cover the complete panel/i
  );
});

test("public login architecture renders one full canvas behind one real form", () => {
  const shell = readFileSync("components/auth/AuthShell.tsx", "utf8");
  const decorations = readFileSync(
    "components/holiday/HolidayDecorations.tsx",
    "utf8"
  );
  const clientPage = readFileSync("app/client-login/page.tsx", "utf8");
  const clientForm = readFileSync(
    "components/client/ClientLoginForm.tsx",
    "utf8"
  );
  const employeeForm = readFileSync(
    "components/employee/EmployeeLoginForm.tsx",
    "utf8"
  );
  const designerRenderer = readFileSync(
    "components/auth/DesignerLoginThemeRenderer.tsx",
    "utf8"
  );
  const previewAppearance = readFileSync(
    "components/auth/LoginPreviewAppearance.tsx",
    "utf8"
  );

  const brandPanelStart = shell.indexOf('aria-label="WriteX brand"');
  const heroStart = shell.indexOf("<HolidayLoginHero />");
  const formAsideStart = shell.indexOf("<aside");
  assert.ok(heroStart > brandPanelStart);
  assert.ok(heroStart < formAsideStart);
  assert.doesNotMatch(decorations, /className="wx-holiday-login-art/);
  assert.match(decorations, /wx-holiday-login-hero/);
  assert.match(decorations, /loginVariant=/);
  assert.match(decorations, /desktopWide/);
  assert.match(decorations, /desktopSplit/);
  assert.match(shell, /wx-auth-form-ambience/);
  assert.match(shell, /wx-auth-panel-transition/);
  assert.match(shell, /DesignerLoginThemeRenderer/);
  assert.match(designerRenderer, /backgroundFourThree/);
  assert.match(designerRenderer, /backgroundWide/);
  assert.match(designerRenderer, /backgroundUltrawide/);
  assert.match(designerRenderer, /<picture/);
  assert.match(designerRenderer, /wx-festival-login-canvas/);
  assert.match(designerRenderer, /data-layout-contract="single-canvas-v1"/);
  assert.match(designerRenderer, /data-composition-mode/);
  assert.match(designerRenderer, /data-background-strategy/);
  assert.match(designerRenderer, /min-aspect-ratio: 7\/3/);
  assert.match(designerRenderer, /min-aspect-ratio: 2\/1/);
  assert.match(designerRenderer, /min-aspect-ratio: 17\/10/);
  assert.match(designerRenderer, /min-aspect-ratio: 3\/2/);
  assert.doesNotMatch(
    designerRenderer,
    /responsiveAssets\?\.(?:heroMobile|heroTablet|heroDesktop)/,
  );
  assert.match(
    designerRenderer,
    /!theme\.experienceConfig\.interpretation\.regions\.login && !experience\.preview/,
  );
  assert.match(previewAppearance, /"data-holiday-preview", "data-theme"/);
  assert.doesNotMatch(designerRenderer, /preview\/app\.js|login\.component\.ts/);
  assert.equal((clientPage.match(/<ClientLoginForm/g) || []).length, 1);
  assert.equal((clientForm.match(/<form\b/g) || []).length, 1);
  assert.equal((employeeForm.match(/<form\b/g) || []).length, 1);

  const styles = readFileSync("app/globals.css", "utf8");
  assert.match(styles, /\.wx-festival-login-canvas img\s*\{/);
  assert.match(styles, /object-fit:\s*cover/);
  assert.match(designerRenderer, /background-full-scene-wide-v3\.webp/);
  assert.match(designerRenderer, /background-full-scene-ultrawide-v3\.webp/);
  assert.match(designerRenderer, /background-full-scene-21x9-v3\.webp/);
  assert.match(styles, /filter:\s*none\s*!important/);
  assert.match(
    styles,
    /\.wx-auth-shell:has\(\.wx-designer-login-pack\) \.wx-auth-form-panel[\s\S]*?background:\s*transparent\s*!important/
  );
  assert.match(
    styles,
    /data-layout-contract="single-canvas-v1"[\s\S]*?\.wx-auth-card[\s\S]*?backdrop-filter:\s*none\s*!important/
  );
});

test("composer settings are persisted, versioned and activation guarded", () => {
  const migration = readFileSync(
    "database/migrations/20260729_login_theme_composer.sql",
    "utf8"
  );
  const repository = readFileSync("lib/holiday/repository.ts", "utf8");
  const admin = readFileSync(
    "components/admin/LoginThemeComposer.tsx",
    "utf8"
  );
  const nextConfig = readFileSync("next.config.mjs", "utf8");
  const derivativeRoute = readFileSync(
    "app/api/website-experience/assets/[assetId]/route.ts",
    "utf8"
  );
  const designerMigration = readFileSync(
    "database/migrations/20260731_independence_day_designer_login_pack.sql",
    "utf8"
  );

  assert.match(migration, /composition_config jsonb/i);
  assert.match(migration, /holiday_login_theme_versions/i);
  assert.match(repository, /loginCompositionActivationErrors/);
  assert.match(repository, /update_login_composition/);
  assert.match(admin, /Contains Embedded Login UI/);
  assert.match(admin, /Smart Crop \(Recommended\)/);
  assert.match(admin, /Regenerate Derivatives/);
  assert.match(admin, /Theme Gradient/);
  assert.match(admin, /Full Natural Background \(Recommended\)/);
  assert.match(admin, /Form size preset/);
  assert.match(admin, /Clean Surface/);
  assert.match(admin, /Minimal Blur/);
  assert.match(admin, /Form-side background strategy/);
  assert.match(admin, /Canvas blend strength/);
  assert.match(admin, /No hard hero-to-form seam/);
  assert.match(admin, /Soft Blend/);
  assert.match(admin, /1440/);
  assert.match(admin, /390/);
  assert.match(admin, /Single real form guarantee/);
  assert.match(admin, /Designer Complete Theme Pack/);
  assert.match(admin, /Background \+ Form/);
  assert.match(admin, /Approved reference artwork active/);
  assert.match(admin, /Restore .* Default/);
  assert.match(designerMigration, /independence-day-designer-v1/);
  assert.match(designerMigration, /channel in \('client', 'employee'\)/);
  assert.match(designerMigration, /singleRealForm/);
  assert.match(nextConfig, /5120,\s*7680/);
  assert.match(
    nextConfig,
    /pathname:\s*"\/api\/website-experience\/assets\/\*\*"/
  );
  assert.match(nextConfig, /pathname:\s*"\/images\/\*\*"/);
  assert.match(derivativeRoute, /resolveLoginHeroCrop/);
  assert.match(derivativeRoute, /\.webp\(/);
});

test("authenticated pack review renders the exact staged pack without weakening public approval", () => {
  const provider = readFileSync(
    "components/holiday/HolidayExperienceProvider.tsx",
    "utf8"
  );
  const themeRoute = readFileSync(
    "app/api/website-experience/theme/route.ts",
    "utf8"
  );
  const publicResolver = readFileSync("lib/holiday/public.ts", "utf8");
  const assetRoute = readFileSync(
    "app/api/website-experience/assets/[assetId]/route.ts",
    "utf8"
  );

  assert.match(provider, /festivalPackPreview/);
  assert.match(themeRoute, /getFestivalPackPreviewContext/);
  assert.match(publicResolver, /exactPrivatePackPreview/);
  assert.match(publicResolver, /festivalPackPreview=/);
  assert.match(assetRoute, /exactPrivatePackPreview/);
  assert.match(assetRoute, /getAdminSessionFromRequest/);
  assert.match(assetRoute, /library_approval_state[\s\S]*exactPrivatePackPreview/);
});

test("default branding remains visible until a custom festive Axo asset loads", () => {
  const decorations = readFileSync(
    "components/holiday/HolidayDecorations.tsx",
    "utf8"
  );
  const provider = readFileSync(
    "components/holiday/HolidayExperienceProvider.tsx",
    "utf8"
  );
  const globalStyles = readFileSync("app/globals.css", "utf8");

  assert.match(decorations, /holidayCustomAxoLoaded = "on"/);
  assert.match(
    decorations,
    /delete document\.documentElement\.dataset\.holidayCustomAxoLoaded/
  );
  assert.match(provider, /delete root\.dataset\.holidayCustomAxoLoaded/);
  assert.match(
    globalStyles,
    /html\[data-holiday-custom-axo-loaded="on"\] \.wx-auth-art-stage/
  );
  assert.doesNotMatch(
    globalStyles,
    /html\[data-holiday-custom-axo="on"\] \.wx-auth-art-stage/
  );
});
