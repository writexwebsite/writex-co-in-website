import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  isThemeInWindow,
  resolveHolidayTheme,
  themeAppliesToRoute
} from "../../lib/holiday/resolver";
import { BUILT_IN_HOLIDAY_THEMES } from "../../lib/holiday/themes";
import {
  holidayAdminActionSchema,
  isValidHolidayImageSignature
} from "../../lib/holiday/validation";
import {
  describeHolidayImageDimensions,
  describeHolidayMediaAsset,
  normalizeHolidayMediaMimeType,
  validateHolidayAudioAsset,
  validateHolidayHeaderOrnamentAsset,
  validateHolidayImageAsset
} from "../../lib/holiday/assets";
import { resolveHolidayPlaybackRange } from "../../lib/holiday/playback";
import sharp from "sharp";
import {
  contrastRatio,
  extractHolidayPalette,
  toApprovedHolidayPalette
} from "../../lib/holiday/palette";
import {
  DEFAULT_EXPERIENCE_PACK,
  STARTER_EXPERIENCE_PACKS,
  assetAvailabilityForPack
} from "../../lib/holiday/packs";
import type {
  HolidayExperienceSettings,
  HolidayTheme
} from "../../lib/holiday/types";
import {
  getBuiltInFestivalAssetPack,
  isBuiltInFestivalAssetPath,
  resolveBuiltInFestivalSlug
} from "../../lib/holiday/built-in-assets";

const baseTheme = (overrides: Partial<HolidayTheme> = {}): HolidayTheme => ({
  id: "00000000-0000-4000-8000-000000000001",
  slug: "diwali",
  name: "Diwali",
  festivalType: "religious_festival",
  description: "Test theme",
  status: "scheduled",
  mode: "automatic",
  startAt: "2026-10-20T00:00:00.000Z",
  endAt: "2026-10-22T00:00:00.000Z",
  timezone: "Asia/Kolkata",
  repeatYearly: false,
  priority: 50,
  isEnabled: true,
  scope: "entire_public",
  applyToHeader: true,
  applyToFooter: true,
  applyToHomepage: true,
  applyToLoginScreens: false,
  applyToClientLogin: true,
  applyToEmployeeLogin: true,
  applyToAdminLogin: false,
  applyMatchingWebsitePalette: true,
  applyAxoTheme: true,
  applyToSelectedRoutes: false,
  selectedRoutes: [],
  palette: {
    accent: "#7C2DCC",
    accentSoft: "#F2D9FF",
    accentWarm: "#D97706",
    textOnAccent: "#FFFFFF",
    surfaceTint: "#FFF8E8"
  },
  detectedPalette: null,
  paletteDetectionStatus: "not_started",
  paletteDetectionMessage: null,
  paletteMatchMode: "balanced_writex",
  paletteSourceAssetId: null,
  paletteApprovedAt: null,
  experienceLevel: "standard",
  animationLevel: "subtle",
  experienceConfig: DEFAULT_EXPERIENCE_PACK,
  assetAvailability: ["partial", "ready_to_activate"],
  announcementBarEnabled: true,
  announcementBarText: "Test",
  announcementBarCtaLabel: null,
  announcementBarCtaHref: null,
  motif: "diya-lights",
  axoAccessory: "diya",
  builtIn: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  assets: [],
  ...overrides
});

const settings = (
  overrides: Partial<HolidayExperienceSettings> = {}
): HolidayExperienceSettings => ({
  holidayModeEnabled: true,
  autoScheduleEnabled: true,
  emergencyDisabled: false,
  activeThemeId: null,
  manualOverrideThemeId: null,
  lastResolvedThemeId: null,
  lastSwitchedAt: null,
  lastSwitchedBy: null,
  defaultThemeSlug: "default",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

test("starter library contains the complete event-agnostic catalogue", () => {
  assert.ok(BUILT_IN_HOLIDAY_THEMES.length >= 70);
  const slugs = new Set(BUILT_IN_HOLIDAY_THEMES.map((theme) => theme.slug));
  for (const slug of [
      "republic-day",
      "independence-day",
      "gandhi-jayanti",
      "netaji-jayanti",
      "holi",
      "diwali",
      "dussehra",
      "durga-puja",
      "saraswati-puja",
      "kali-puja",
      "raksha-bandhan",
      "janmashtami",
      "ganesh-chaturthi",
      "makar-sankranti",
      "pongal",
      "onam",
      "baisakhi",
      "eid-al-fitr",
      "eid-al-adha",
      "muharram",
      "christmas",
      "easter",
      "new-year",
      "valentines-day",
      "halloween",
      "womens-day",
      "teachers-day",
      "childrens-day",
      "labour-day",
      "world-environment-day",
      "international-yoga-day",
      "company-anniversary",
      "founders-day",
      "recruitment-drive",
      "annual-report-season",
      "admission-season",
      "financial-year-end",
      "constitution-day",
      "armed-forces-flag-day",
      "ramadan",
      "gurpurab",
      "buddha-purnima",
      "poila-boishakh",
      "earth-day",
      "customer-appreciation-week",
      "trust-safety-campaign",
      "custom-event",
      "default"
  ]) {
    assert.equal(slugs.has(slug), true, slug);
  }
  assert.equal(slugs.size, BUILT_IN_HOLIDAY_THEMES.length);
});

test("all starter themes use controlled categories and experience levels", () => {
  const allowedCategories = new Set([
    "national_holiday",
    "religious_festival",
    "cultural_festival",
    "global_observance",
    "company_event",
    "recruitment_campaign",
    "business_season",
    "internal_milestone",
    "custom_one_time_event",
    "system_default"
  ]);
  const allowedLevels = new Set(["accent_only", "standard", "enhanced"]);
  for (const theme of BUILT_IN_HOLIDAY_THEMES) {
    assert.equal(allowedCategories.has(theme.festivalType), true, theme.slug);
    assert.equal(allowedLevels.has(theme.experienceLevel), true, theme.slug);
  }
});

test("manual override wins over an automatic scheduled theme", () => {
  const manual = baseTheme({
    id: "00000000-0000-4000-8000-000000000002",
    slug: "holi",
    status: "active",
    mode: "manual"
  });
  const automatic = baseTheme();
  const result = resolveHolidayTheme({
    settings: settings({ manualOverrideThemeId: manual.id }),
    themes: [automatic, manual],
    now: new Date("2026-10-21T00:00:00.000Z")
  });
  assert.equal(result?.id, manual.id);
});

test("automatic conflict chooses priority then latest activation", () => {
  const lower = baseTheme({ priority: 10 });
  const higherOld = baseTheme({
    id: "00000000-0000-4000-8000-000000000002",
    slug: "holi",
    priority: 80,
    startAt: "2026-10-19T00:00:00.000Z"
  });
  const higherNew = baseTheme({
    id: "00000000-0000-4000-8000-000000000003",
    slug: "eid",
    priority: 80,
    startAt: "2026-10-20T12:00:00.000Z"
  });
  const result = resolveHolidayTheme({
    settings: settings(),
    themes: [lower, higherOld, higherNew],
    now: new Date("2026-10-21T00:00:00.000Z")
  });
  assert.equal(result?.id, higherNew.id);
});

test("expiry and emergency disable restore the default experience", () => {
  assert.equal(
    resolveHolidayTheme({
      settings: settings(),
      themes: [baseTheme()],
      now: new Date("2026-10-23T00:00:00.000Z")
    }),
    null
  );
  assert.equal(
    resolveHolidayTheme({
      settings: settings({ emergencyDisabled: true }),
      themes: [baseTheme()],
      now: new Date("2026-10-21T00:00:00.000Z")
    }),
    null
  );
});

test("yearly schedules resolve in a future year", () => {
  const yearly = baseTheme({ repeatYearly: true });
  assert.equal(
    isThemeInWindow(yearly, new Date("2028-10-21T00:00:00.000Z")),
    true
  );
});

test("route scopes include public legal pages and exclude internal applications", () => {
  const baselineTheme = baseTheme();
  const theme = {
    ...baselineTheme,
    experienceConfig: {
      ...baselineTheme.experienceConfig,
      interpretation: {
        ...baselineTheme.experienceConfig.interpretation,
        pageCoverage: "full_website" as const
      }
    }
  };
  assert.equal(themeAppliesToRoute(theme, "/pricing"), true);
  assert.equal(themeAppliesToRoute(theme, "/terms"), true);
  assert.equal(themeAppliesToRoute(theme, "/privacy"), true);
  assert.equal(themeAppliesToRoute(theme, "/academic-integrity"), true);
  assert.equal(themeAppliesToRoute(theme, "/admin/dashboard"), false);
  assert.equal(themeAppliesToRoute(theme, "/client/overview"), false);
  assert.equal(themeAppliesToRoute(theme, "/client-login"), false);
  assert.equal(
    themeAppliesToRoute(
      { ...theme, applyToLoginScreens: true },
      "/client-login"
    ),
    true
  );
  assert.equal(
    themeAppliesToRoute(
      {
        ...theme,
        applyToLoginScreens: true,
        applyToClientLogin: false
      },
      "/client-login"
    ),
    false
  );
  assert.equal(
    themeAppliesToRoute(
      { ...theme, applyToLoginScreens: true },
      "/admin/login"
    ),
    false
  );
});

test("selected page and homepage scopes do not leak", () => {
  assert.equal(
    themeAppliesToRoute(
      {
        ...baseTheme(),
        scope: "selected_pages",
        applyToSelectedRoutes: true,
        selectedRoutes: ["/careers"]
      },
      "/careers/writer"
    ),
    true
  );
  assert.equal(
    themeAppliesToRoute(
      { ...baseTheme(), scope: "homepage" },
      "/pricing"
    ),
    false
  );
});

test("invalid scheduled windows fail validation", () => {
  const result = holidayAdminActionSchema.safeParse({
    action: "update",
    themeId: "00000000-0000-4000-8000-000000000001",
    name: "Diwali",
    description: "",
    festivalType: "religious_festival",
    experienceLevel: "standard",
    status: "scheduled",
    mode: "automatic",
    startAt: "2026-10-22T00:00:00.000Z",
    endAt: "2026-10-21T00:00:00.000Z",
    timezone: "Asia/Kolkata",
    repeatYearly: true,
    priority: 50,
    isEnabled: true,
    scope: "entire_public",
    applyToHeader: true,
    applyToFooter: true,
    applyToHomepage: true,
    applyToLoginScreens: false,
    applyToClientLogin: true,
    applyToEmployeeLogin: true,
    applyToAdminLogin: false,
    applyMatchingWebsitePalette: true,
    applyAxoTheme: true,
    applyToSelectedRoutes: false,
    selectedRoutes: [],
    palette: baseTheme().palette,
    paletteMatchMode: "balanced_writex",
    experienceConfig: baseTheme().experienceConfig,
    announcementBarEnabled: false,
    announcementBarText: null,
    announcementBarCtaLabel: null,
    announcementBarCtaHref: null
  });
  assert.equal(result.success, false);
});

test("experience packs encode safe festival-specific motion and sound policy", () => {
  assert.equal(STARTER_EXPERIENCE_PACKS["durga-puja"].headerPreset, "alpana");
  assert.equal(STARTER_EXPERIENCE_PACKS.holi.animationPreset, "pichkari_spray");
  assert.equal(
    STARTER_EXPERIENCE_PACKS.diwali.animationPreset,
    "controlled_fireworks"
  );
  assert.equal(STARTER_EXPERIENCE_PACKS.christmas.particlePreset, "snow");
  assert.equal(
    STARTER_EXPERIENCE_PACKS.christmas.animationPreset,
    "reindeer_movement"
  );
  assert.equal(
    STARTER_EXPERIENCE_PACKS["durga-puja"].interpretation.publicArtworkMode,
    "interpreted_motifs"
  );
  assert.equal(
    STARTER_EXPERIENCE_PACKS["durga-puja"].interpretation.motifs.garlands,
    true
  );
  assert.equal(
    STARTER_EXPERIENCE_PACKS["durga-puja"].interpretation.motifs.diyaGlow,
    true
  );
  for (const pack of Object.values(STARTER_EXPERIENCE_PACKS)) {
    assert.equal(typeof pack.heroPreset, "string");
    assert.equal(typeof pack.innerPagePreset, "string");
    assert.equal(typeof pack.footerPreset, "string");
    assert.ok(pack.sound.volume <= 0.5);
    assert.equal(pack.sound.defaultState === "off" || pack.sound.defaultState === "muted", true);
    assert.equal(pack.accessibility.avoidRapidFlashing, true);
    assert.equal(pack.accessibility.avoidFormOverlap, true);
    assert.equal(pack.accessibility.silentFallback, true);
    assert.equal(pack.sound.startMode, "user_interaction");
    assert.equal(pack.sound.stopOnThemeEnd, true);
    assert.equal(pack.sound.showUserControl, true);
    assert.ok(pack.headerOrnaments.items.length <= 12);
    assert.ok(pack.headerOrnaments.ornamentCount <= 12);
    assert.equal(pack.headerOrnaments.railEnabled, true);
    assert.equal(
      ["left", "centre", "right", "spread", "safe_auto"].includes(
        pack.headerOrnaments.horizontalPlacement
      ),
      true
    );
    assert.equal(
      ["below_navbar", "slightly_lower", "hero_edge"].includes(
        pack.headerOrnaments.verticalPlacement
      ),
      true
    );
  }
});

test("built-in festival artwork resolves to source-controlled safe SVG assets", () => {
  for (const slug of [
    "durga-puja",
    "diwali",
    "holi",
    "christmas",
    "eid-al-fitr",
    "independence-day",
    "janmashtami",
    "ganesh-chaturthi",
    "onam",
    "raksha-bandhan",
    "navratri",
    "poila-boishakh",
    "valentines-day",
    "halloween",
    "teachers-day",
    "womens-day",
    "company-anniversary"
  ]) {
    const pack = getBuiltInFestivalAssetPack(slug);
    for (const assetPath of [
      pack.headerScene,
      pack.heroAccent,
      pack.axoOutfit,
      pack.loginOverlay,
      pack.icon
    ]) {
      assert.equal(isBuiltInFestivalAssetPath(assetPath), true, assetPath);
      const sourcePath = assetPath.split("?", 1)[0];
      assert.equal(
        existsSync(`public${sourcePath}`),
        true,
        `${slug}: ${assetPath}`
      );
    }
  }
  assert.equal(resolveBuiltInFestivalSlug("ramadan"), "eid-al-fitr");
  assert.equal(resolveBuiltInFestivalSlug("unknown-event"), "custom-event");
  assert.equal(
    existsSync("public/festival-assets/christmas/header/reindeer.svg"),
    true
  );
  assert.equal(
    existsSync("public/festival-assets/christmas/header/gift.svg"),
    true
  );
});

test("festival-specific hanging ornament packs remain configuration driven", () => {
  for (const slug of [
    "durga-puja",
    "diwali",
    "holi",
    "christmas",
    "eid-al-fitr",
    "independence-day",
    "republic-day",
    "janmashtami",
    "ganesh-chaturthi",
    "onam",
    "new-year",
    "custom-event"
  ]) {
    const config = STARTER_EXPERIENCE_PACKS[slug].headerOrnaments;
    assert.equal(config.enabled, true, slug);
    assert.notEqual(config.mode, "none", slug);
    assert.ok(config.items.length > 0, slug);
    assert.equal(new Set(config.items.map((item) => item.id)).size, config.items.length);
  }
  assert.equal(
    STARTER_EXPERIENCE_PACKS["durga-puja"].headerOrnaments.items.some(
      (item) => item.icon === "drum"
    ),
    true
  );
  assert.equal(
    STARTER_EXPERIENCE_PACKS["durga-puja"].headerOrnaments.items.some(
      (item) => item.type === "text_badge"
    ),
    true
  );
});

test("asset availability preserves generic fallback until reviewed assets exist", () => {
  assert.deepEqual(
    assetAvailabilityForPack({
      assets: [],
      level: "accent_only",
      soundAvailable: false
    }),
    [
      "login_assets_missing",
      "axo_assets_missing",
      "fallback_only",
      "partial",
      "ready_to_activate"
    ]
  );
});

test("custom event creation accepts controlled category and level only", () => {
  assert.equal(
    holidayAdminActionSchema.safeParse({
      action: "create",
      name: "Quarterly Recognition",
      description: "A one-time internal milestone.",
      festivalType: "internal_milestone",
      experienceLevel: "accent_only"
    }).success,
    true
  );
  assert.equal(
    holidayAdminActionSchema.safeParse({
      action: "create",
      name: "Unsafe category",
      description: "",
      festivalType: "arbitrary",
      experienceLevel: "standard"
    }).success,
    false
  );
});

test("asset validation accepts real PNG signature and rejects disguised files", () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  assert.equal(isValidHolidayImageSignature(png, "image/png"), true);
  assert.equal(
    isValidHolidayImageSignature(Buffer.from("not an image"), "image/png"),
    false
  );
});

test("strict SVG validation accepts static artwork and rejects active content", () => {
  const safeSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#6D28D9"/></svg>'
  );
  assert.equal(
    validateHolidayImageAsset(safeSvg, "image/svg+xml").length > 0,
    true
  );
  assert.throws(() =>
    validateHolidayImageAsset(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
      ),
      "image/svg+xml"
    )
  );
});

test("SVG dimensions use an explicit viewBox for governed review registration", async () => {
  const dimensions = await describeHolidayImageDimensions(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 220"><path d="M0 0h1"/></svg>'
    ),
    "image/svg+xml"
  );
  assert.deepEqual(dimensions, { width: 1600, height: 220, format: "svg" });
  await assert.rejects(() =>
    describeHolidayImageDimensions(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
      "image/svg+xml"
    )
  );
});

test("uploaded header ornaments require transparent high-resolution artwork", async () => {
  const transparent = await sharp({
    create: {
      width: 320,
      height: 320,
      channels: 4,
      background: { r: 85, g: 22, b: 242, alpha: 0.45 }
    }
  })
    .png()
    .toBuffer();
  assert.equal(
    (await validateHolidayHeaderOrnamentAsset(transparent, "image/png"))
      .length > 0,
    true
  );
  const opaque = await sharp({
    create: {
      width: 320,
      height: 320,
      channels: 3,
      background: { r: 85, g: 22, b: 242 }
    }
  })
    .png()
    .toBuffer();
  await assert.rejects(() =>
    validateHolidayHeaderOrnamentAsset(opaque, "image/png")
  );
});

test("audio validation accepts owned media signatures and rejects disguised audio", () => {
  assert.equal(
    validateHolidayAudioAsset(
      Buffer.from("OggS\u0000\u0002reviewed-audio"),
      "audio/ogg"
    ).length > 0,
    true
  );
  assert.throws(() =>
    validateHolidayAudioAsset(Buffer.from("not audio"), "audio/mpeg")
  );
});

test("holiday audio aliases are canonicalised without trusting the extension", () => {
  assert.equal(normalizeHolidayMediaMimeType("audio/mp3"), "audio/mpeg");
  assert.equal(normalizeHolidayMediaMimeType("application/ogg"), "audio/ogg");
  assert.equal(normalizeHolidayMediaMimeType("audio/vnd.wave"), "audio/wav");
  assert.throws(() =>
    validateHolidayAudioAsset(Buffer.from("not audio"), "audio/mp3")
  );
});

test("holiday media metadata records checksum and WAV duration", () => {
  const sampleRate = 8_000;
  const dataBytes = sampleRate;
  const wav = Buffer.alloc(44 + dataBytes);
  wav.write("RIFF", 0, "ascii");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVE", 8, "ascii");
  wav.write("fmt ", 12, "ascii");
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate, 28);
  wav.writeUInt16LE(1, 32);
  wav.writeUInt16LE(8, 34);
  wav.write("data", 36, "ascii");
  wav.writeUInt32LE(dataBytes, 40);

  const metadata = describeHolidayMediaAsset(wav, "audio/wav", "audio");
  assert.match(metadata.checksumSha256, /^[0-9a-f]{64}$/);
  assert.equal(metadata.durationSeconds, 1);
});

test("holiday audio playback supports browser byte ranges safely", () => {
  assert.deepEqual(resolveHolidayPlaybackRange(null, 100), {
    start: 0,
    end: 99,
    partial: false
  });
  assert.deepEqual(resolveHolidayPlaybackRange("bytes=10-19", 100), {
    start: 10,
    end: 19,
    partial: true
  });
  assert.deepEqual(resolveHolidayPlaybackRange("bytes=-10", 100), {
    start: 90,
    end: 99,
    partial: true
  });
  assert.equal(resolveHolidayPlaybackRange("bytes=100-110", 100), null);
  assert.equal(resolveHolidayPlaybackRange("items=0-10", 100), null);
});

test("palette extraction produces a reviewable accessible colour proposal", async () => {
  const image = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80"><rect width="80" height="80" fill="#6524C9"/><rect x="80" width="80" height="80" fill="#168AAD"/></svg>'
  );
  const detected = await extractHolidayPalette(image);
  const approved = toApprovedHolidayPalette(detected, "balanced_writex");
  assert.match(detected.primary, /^#[0-9A-F]{6}$/);
  assert.equal(detected.contrast.passes, true);
  assert.ok(contrastRatio(approved.accent, approved.textOnAccent) >= 4.5);
  assert.equal(approved.ctaAccent?.startsWith("#"), true);
});

test("canonical public activation resolves its theme before legacy login controls", () => {
  const publicThemeRoute = readFileSync(
    "app/api/website-experience/theme/route.ts",
    "utf8"
  );
  assert.match(
    publicThemeRoute,
    /canonicalFestivalSnapshot\?\.themeId \|\| previewThemeId/
  );
  assert.match(
    publicThemeRoute,
    /previewThemeId: resolvedSnapshotThemeId/
  );
});

test("shared public chrome interprets private references instead of placing them", () => {
  const decorations = readFileSync(
    "components/holiday/HolidayDecorations.tsx",
    "utf8"
  );
  const motifComposer = readFileSync(
    "components/holiday/FestivalMotifs.tsx",
    "utf8"
  );
  const publicSerializer = readFileSync("lib/holiday/public.ts", "utf8");
  const headerOrnaments = readFileSync(
    "components/holiday/FestivalHeaderOrnaments.tsx",
    "utf8"
  );
  const headerRail = readFileSync(
    "components/holiday/FestivalHeaderRail.tsx",
    "utf8"
  );
  const publicHeader = readFileSync("components/Header.tsx", "utf8");
  const adminHeaderEditor = readFileSync(
    "components/admin/HolidayHeaderRailEditor.tsx",
    "utf8"
  );
  const globalStyles = readFileSync("app/globals.css", "utf8");
  const appChrome = readFileSync("components/AppChrome.tsx", "utf8");
  assert.doesNotMatch(
    decorations,
    /theme\?\.assets\.hero_art\s*\|\|\s*theme\?\.assets\.supporting/
  );
  assert.match(decorations, /FestiveHeroLayer/);
  assert.match(decorations, /publicArtworkMode === "banner_asset"/);
  assert.match(motifComposer, /FestiveGarlandTop/);
  assert.match(motifComposer, /FestiveHangingBellCluster/);
  assert.match(motifComposer, /FestivePaperFanCluster/);
  assert.match(motifComposer, /FestiveLeafVineCorner/);
  assert.match(motifComposer, /FestiveDiyaGlowLine/);
  assert.match(motifComposer, /FestiveWarmLightParticles/);
  assert.match(motifComposer, /FestivalLightString/);
  assert.match(motifComposer, /FestivalLanternCluster/);
  assert.match(motifComposer, /FestivalSnowLayer/);
  assert.match(motifComposer, /FestivalColourBurst/);
  assert.match(motifComposer, /FestivalFireworkLayer/);
  assert.match(motifComposer, /FestivalMoonLanternLayer/);
  assert.match(publicSerializer, /asset\.role === "reference_image"/);
  assert.match(publicSerializer, /ornamentAssets/);
  assert.match(headerOrnaments, /FestivalHeaderOrnamentLayer/);
  assert.match(headerOrnaments, /HangingStreamer/);
  assert.match(headerOrnaments, /HangingMedallion/);
  assert.match(headerOrnaments, /HangingBell/);
  assert.match(headerOrnaments, /HangingLantern/);
  assert.match(headerOrnaments, /HangingFestivalIcon/);
  assert.match(headerOrnaments, /HangingTextBadge/);
  assert.match(headerOrnaments, /GarlandBand/);
  assert.match(headerOrnaments, /CornerCluster/);
  assert.match(headerOrnaments, /AnimatedRibbon/);
  assert.match(headerOrnaments, /HeaderAmbientGlow/);
  assert.match(headerRail, /wx-festival-decoration-rail/);
  assert.match(publicHeader, /HolidayHeaderDecoration compact=\{scrolled\}/);
  assert.ok(
    publicHeader.indexOf("<HolidayHeaderDecoration compact={scrolled} />") >
      publicHeader.indexOf("<BrandLogo")
  );
  assert.match(adminHeaderEditor, /Decoration Rail/);
  assert.match(adminHeaderEditor, /Safe-zone overlays/);
  assert.match(adminHeaderEditor, /Restore Header Default/);
  assert.match(adminHeaderEditor, /Save Header Controls/);
  assert.match(adminHeaderEditor, /Advanced ornament controls/);
  assert.match(
    globalStyles,
    /\.wx-festival-header-ornament-layer\s*\{[\s\S]*?height:\s*100%/
  );
  assert.match(
    globalStyles,
    /\.wx-festival-decoration-rail\s*\{[\s\S]*?height:\s*3rem/
  );
  assert.match(
    globalStyles,
    /\.wx-header-ornament\s*\{[\s\S]*?height:\s*100%/
  );
  assert.match(
    globalStyles,
    /data-mobile-simplified="true"[\s\S]*?nth-child\(n \+ 4\)/
  );
  assert.match(globalStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(appChrome, /<HolidayPageDecoration \/>/);
});

test("Independence Day header tiers preserve baseline and gate stronger treatments by density", () => {
  const headerRail = readFileSync(
    "components/holiday/FestivalHeaderRail.tsx",
    "utf8"
  );
  const globalStyles = readFileSync("app/globals.css", "utf8");

  assert.match(
    headerRail,
    /"baseline",[\s\S]*"enhanced",[\s\S]*"festival_full"/
  );
  assert.match(headerRail, /density === "rich"\) return "festival_full"/);
  assert.match(headerRail, /density === "balanced"\) return "enhanced"/);
  assert.match(headerRail, /data-header-tier=\{headerTier\}/);
  assert.match(
    readFileSync("components/holiday/HolidayDecorations.tsx", "utf8"),
    /previewSnapshotId[\s\S]*festivalHeaderTier[\s\S]*tierOverride=\{headerTierOverride\}/
  );
  assert.match(globalStyles, /data-header-tier="enhanced"/);
  assert.match(globalStyles, /data-header-tier="festival_full"/);
  assert.match(globalStyles, /border-bottom-color: transparent/);
});

test("event platform migration and admin authoring controls are present", () => {
  const migration = readFileSync(
    "database/migrations/20260727_holiday_event_platform_expansion.sql",
    "utf8"
  );
  const manager = readFileSync(
    "components/admin/HolidayExperienceManager.tsx",
    "utf8"
  );
  assert.match(migration, /experience_level/);
  assert.match(migration, /custom_one_time_event/);
  assert.match(manager, /Create event theme/);
  assert.match(manager, /paletteAccent/);
  assert.match(manager, /Repeat yearly/);
  assert.match(manager, /Accept Detected Palette/);
  assert.match(manager, /Apply Matching Website Palette|Website palette/);
  assert.match(manager, /Customer Login/);
  assert.match(manager, /Employee Login/);
  const uploadMigration = readFileSync(
    "database/migrations/20260727_holiday_upload_palette_adaptation.sql",
    "utf8"
  );
  assert.match(uploadMigration, /palette_detection_status/);
  assert.match(uploadMigration, /apply_to_client_login/);
  assert.match(uploadMigration, /logo_overlay/);
  const completionMigration = readFileSync(
    "database/migrations/20260728_festival_experience_completion.sql",
    "utf8"
  );
  assert.match(completionMigration, /holiday_login_theme_settings/);
  assert.match(completionMigration, /integration_health_snapshots/);
  assert.match(completionMigration, /review_status/);
  assert.match(manager, /Apply Theme Login to Client and Employee/);
  assert.match(manager, /Play Festive Ambience|Sound available/);
  assert.match(manager, /Reference Image \(interpreted\)/);
  assert.match(manager, /Interpreted Motifs/);
  assert.match(manager, /Marigold garlands/);
  assert.match(manager, /Festive light strings/);
  assert.match(manager, /Controlled fireworks/);
  assert.match(manager, /Pack approval/);
  assert.match(manager, /Hero preset/);
  assert.match(manager, /Inner-page preset/);
  assert.match(manager, /Footer preset/);
  assert.match(manager, /Stop when theme ends/);
  assert.match(manager, /Show user sound control/);
  assert.match(manager, /Trust Centre/);
  assert.match(manager, /Hanging header ornament system/);
  assert.match(manager, /Approved custom asset/);
  assert.match(manager, /Mobile simplification/);
  const interpretationMigration = readFileSync(
    "database/migrations/20260728_holiday_reference_interpretation.sql",
    "utf8"
  );
  assert.match(interpretationMigration, /reference_image/);
});

test("unapproved packs never win live resolution but remain privately previewable", () => {
  const unapproved = baseTheme({
    experienceConfig: {
      ...DEFAULT_EXPERIENCE_PACK,
      approvalStatus: "awaiting_approval"
    }
  });
  assert.equal(
    resolveHolidayTheme({
      settings: settings(),
      themes: [unapproved],
      now: new Date("2026-10-21T00:00:00.000Z")
    }),
    null
  );
  assert.equal(
    resolveHolidayTheme({
      settings: settings(),
      themes: [unapproved],
      previewThemeId: unapproved.id
    })?.id,
    unapproved.id
  );
});

test("login resolution and mutations enforce complete-pack approval", () => {
  const repository = readFileSync("lib/holiday/repository.ts", "utf8");
  assert.match(
    repository,
    /item\.experienceConfig\.approvalStatus === "approved"/
  );
  assert.match(
    repository,
    /Approve the complete festival pack before login activation/
  );
  assert.match(
    repository,
    /Approve the complete festival pack before scheduling it/
  );
});

test("festival-specific packs enable controlled visual families", () => {
  assert.equal(
    STARTER_EXPERIENCE_PACKS["durga-puja"].interpretation.motifs.alpana,
    true
  );
  assert.equal(
    STARTER_EXPERIENCE_PACKS.holi.interpretation.motifs.colourBursts,
    true
  );
  assert.equal(
    STARTER_EXPERIENCE_PACKS.diwali.interpretation.motifs.lightStrings,
    true
  );
  assert.equal(
    STARTER_EXPERIENCE_PACKS.christmas.interpretation.motifs.snow,
    true
  );
  assert.equal(
    STARTER_EXPERIENCE_PACKS["eid-al-fitr"].interpretation.motifs.moonLanterns,
    true
  );
  assert.equal(
    STARTER_EXPERIENCE_PACKS["independence-day"].interpretation.motifs.ribbons,
    true
  );
  assert.equal(
    STARTER_EXPERIENCE_PACKS["new-year"].interpretation.motifs.confetti,
    true
  );
});

test("holiday uploads use isolated role-based private prefixes", () => {
  const storage = readFileSync("lib/storage/s3.ts", "utf8");
  assert.equal(storage.includes("/writex/holiday/${holidayFolder}/"), true);
  assert.match(storage, /holidayAssetRole === "audio"/);
  assert.match(storage, /holidayAssetRole\?\.startsWith\("login_"\)/);
  assert.match(storage, /holidayAssetRole === "axo"/);
});

test("festival admin backend persists audio metadata and exposes protected playback", () => {
  const migration = readFileSync(
    "database/migrations/20260728_holiday_admin_backend_hardening.sql",
    "utf8"
  );
  const uploadRoute = readFileSync(
    "app/api/admin/website-experience/assets/route.ts",
    "utf8"
  );
  const playbackRoute = readFileSync(
    "app/api/website-experience/assets/[assetId]/route.ts",
    "utf8"
  );
  const manager = readFileSync(
    "components/admin/HolidayExperienceManager.tsx",
    "utf8"
  );
  const soundControl = readFileSync(
    "components/holiday/HolidayDecorations.tsx",
    "utf8"
  );
  const cleanupRoute = readFileSync(
    "app/api/jobs/holiday-asset-cleanup/route.ts",
    "utf8"
  );

  assert.match(migration, /checksum_sha256/);
  assert.match(migration, /duration_seconds/);
  assert.match(uploadRoute, /Audio upload failed while saving to private storage/);
  assert.match(uploadRoute, /x-correlation-id/);
  assert.match(
    uploadRoute,
    /Audio files must not exceed 12 MB and master images must not exceed 40 MB/
  );
  assert.match(playbackRoute, /accept-ranges/);
  assert.match(playbackRoute, /content-range/);
  assert.match(manager, /<audio/);
  assert.match(soundControl, /Sound preview could not start/);
  assert.match(cleanupRoute, /x-job-secret/);
});
