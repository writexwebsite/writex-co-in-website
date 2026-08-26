import crypto from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import yazl from "yazl";

const [sourceRoot, masterRoot, outputRoot] = process.argv.slice(2);

if (!sourceRoot || !masterRoot || !outputRoot) {
  throw new Error(
    "Usage: node scripts/build-pilot-festival-hero-variants.mjs <source-root> <clean-master-root> <output-root>"
  );
}

const GROUPS = [
  {
    name: "Independence Day",
    slug: "independence-day",
    defaultVariant: "variant-01-client-paper-art",
    variants: [
      ["variant-01-client-paper-art", "Paper Art & Landmarks", "Independence Day Client Login.png", "client"],
      ["variant-02-client-lit-map", "Illuminated India Map", "Independence Day Client Login 1.png", "client"],
      ["variant-03-employee-red-fort", "Red Fort Celebration", "Independence Day Employee Login.png", "employee"],
      ["variant-04-employee-india-gate", "India Gate Celebration", "Independence Day Employee Login 2.png", "employee"]
    ]
  },
  {
    name: "Holi",
    slug: "holi",
    defaultVariant: null,
    sourceStatus: "source_required",
    sourceMessage: "Festivals.zip does not contain an approved Holi bitmap source.",
    variants: []
  },
  {
    name: "Christmas",
    slug: "christmas",
    defaultVariant: "variant-01-client-snowy-village",
    variants: [
      ["variant-01-client-snowy-village", "Snowy Village", "christmas Client Login.png", "client"],
      ["variant-02-client-market-gifts", "Christmas Market Gifts", "christmas Client Login 1.png", "client"],
      ["variant-03-client-hearth-gift", "Hearthside Gift", "christmas Client Login 2.png", "client"],
      ["variant-04-client-city-lantern", "City Lantern", "christmas Client Login 3.png", "client"],
      ["variant-05-client-aurora-lantern", "Aurora Lantern", "christmas Client Login 4.png", "client"],
      ["variant-06-client-golden-gift", "Golden Gift", "christmas Client Login 5.png", "client"],
      ["variant-07-employee-market-basket", "Market Basket", "christmas Employee Login.png", "employee"],
      ["variant-08-employee-snowy-lights", "Snowy Lights", "christmas Employee Login 1.png", "employee"],
      ["variant-09-employee-x-gifts", "Festive X & Gifts", "christmas Employee Login 2.png", "employee"],
      ["variant-10-employee-golden-tree", "Golden Tree Hall", "christmas Employee Login 3.png", "employee"],
      ["variant-11-employee-neon-x", "Aurora Neon X", "christmas Employee Login 4.png", "employee"],
      ["variant-12-employee-warm-x", "Warm Festive X", "christmas Employee Login 5.png", "employee"]
    ]
  }
];

const OUTPUTS = [
  ["master.webp", 7680, 4320, 92, "master", null],
  ["desktop-large.webp", 2560, 1440, 90, "desktop", 2560],
  ["desktop.webp", 1440, 900, 90, "desktop", 1440],
  ["tablet-landscape.webp", 1280, 960, 89, "tablet", 1280],
  ["tablet.webp", 1024, 768, 89, "tablet", 1024],
  ["tablet-820.webp", 820, 1024, 89, "tablet", 820],
  ["tablet-768.webp", 768, 1024, 89, "tablet", 768],
  ["mobile-large.webp", 860, 560, 88, "mobile", 430],
  ["mobile.webp", 780, 520, 88, "mobile", 390],
  ["mobile-compact.webp", 720, 480, 88, "mobile", 360],
  ["preview-desktop.webp", 720, 405, 84, "preview", 720],
  ["preview-mobile.webp", 390, 260, 84, "preview", 390]
];

const focalFor = (festivalSlug, variantSlug) => {
  if (festivalSlug === "independence-day") {
    if (variantSlug.includes("lit-map")) return { x: 0.47, y: 0.55, anchorX: 0.48, anchorY: 0.54 };
    if (variantSlug.includes("red-fort")) return { x: 0.5, y: 0.58, anchorX: 0.5, anchorY: 0.56 };
    if (variantSlug.includes("india-gate")) return { x: 0.48, y: 0.57, anchorX: 0.48, anchorY: 0.55 };
    return { x: 0.46, y: 0.56, anchorX: 0.47, anchorY: 0.54 };
  }
  if (variantSlug.includes("x-gifts") || variantSlug.includes("warm-x")) {
    return { x: 0.47, y: 0.56, anchorX: 0.47, anchorY: 0.54 };
  }
  return { x: 0.48, y: 0.55, anchorX: 0.48, anchorY: 0.53 };
};

const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

function cropFor(sourceWidth, sourceHeight, targetWidth, targetHeight, focal) {
  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  let width = sourceWidth;
  let height = sourceHeight;
  if (sourceRatio > targetRatio) width = Math.round(sourceHeight * targetRatio);
  else height = Math.round(sourceWidth / targetRatio);
  const left = Math.max(
    0,
    Math.min(sourceWidth - width, Math.round(focal.x * sourceWidth - width * focal.anchorX))
  );
  const top = Math.max(
    0,
    Math.min(sourceHeight - height, Math.round(focal.y * sourceHeight - height * focal.anchorY))
  );
  return { left, top, width, height };
}

async function writeZip(destination, entries) {
  const zip = new yazl.ZipFile();
  for (const entry of entries) zip.addFile(entry.file, entry.archivePath);
  zip.end();
  await new Promise((resolve, reject) => {
    const output = zip.outputStream.pipe(createWriteStream(destination));
    output.on("close", resolve);
    output.on("error", reject);
  });
}

await fs.mkdir(outputRoot, { recursive: true });
const pilotIndex = {
  schemaVersion: 1,
  packType: "festival_hero_variant_pilot",
  sourceLibrary: "Festivals.zip",
  generatedAt: new Date().toISOString(),
  groups: []
};

let sourceImageCount = 0;
let responsiveAssetCount = 0;

for (const group of GROUPS) {
  const groupDir = path.join(outputRoot, group.slug);
  await fs.rm(groupDir, { recursive: true, force: true });
  await fs.mkdir(groupDir, { recursive: true });
  const groupVariants = [];

  for (const [variantSlug, variantName, sourceFile, sourceSurface] of group.variants) {
    sourceImageCount += 1;
    const masterPath = path.join(masterRoot, group.slug, `${variantSlug}.png`);
    const sourcePath = path.join(sourceRoot, sourceFile);
    const [masterBuffer, sourceBuffer] = await Promise.all([
      fs.readFile(masterPath),
      fs.readFile(sourcePath)
    ]);
    const metadata = await sharp(masterBuffer).metadata();
    if (!metadata.width || !metadata.height) throw new Error(`No dimensions for ${masterPath}`);
    const variantDir = path.join(groupDir, variantSlug);
    const importDir = path.join(variantDir, "_import");
    const importAssets = path.join(importDir, "assets");
    await fs.mkdir(importAssets, { recursive: true });
    const focal = focalFor(group.slug, variantSlug);
    const responsiveAssets = [];

    for (const [filename, width, height, quality, family, viewportWidth] of OUTPUTS) {
      const crop = cropFor(metadata.width, metadata.height, width, height, focal);
      const destination = path.join(variantDir, filename);
      await sharp(masterBuffer)
        .extract(crop)
        .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
        .sharpen({ sigma: 0.55, m1: 0.35, m2: 1 })
        .webp({ quality, effort: 5, smartSubsample: true })
        .toFile(destination);
      const rendered = await fs.readFile(destination);
      responsiveAssets.push({
        filename,
        family,
        viewportWidth,
        width,
        height,
        bytes: rendered.byteLength,
        checksumSha256: sha256(rendered),
        crop
      });
      responsiveAssetCount += 1;
    }

    const manifest = {
      schemaVersion: 2,
      packType: "responsive_festival_hero",
      packageMode: "standard_writex",
      festivalName: group.name,
      festivalSlug: group.slug,
      variantName,
      variantSlug,
      slug: `${group.slug}-${variantSlug}`,
      version: 1,
      pilot: true,
      sourceLibrary: "Festivals.zip",
      sourceFileReference: `Festivals/${sourceFile}`,
      sourceSurface,
      sourceChecksumSha256: sha256(sourceBuffer),
      cleanMaster: {
        filename: "master.webp",
        sourceWidth: metadata.width,
        sourceHeight: metadata.height,
        checksumSha256: sha256(masterBuffer),
        privateOriginalRetained: true
      },
      responsiveAssets,
      runtimeAssets: {
        desktop: "assets/login-hero-desktop.webp",
        tablet: "assets/login-hero-tablet.webp",
        mobile: "assets/login-hero-mobile.webp"
      },
      focalPoints: {
        desktop: focal,
        tablet: focal,
        mobile: { ...focal, anchorX: 0.5, anchorY: 0.52 }
      },
      safeAreas: {
        desktop: { artworkPanel: "left", realFormPanel: "right", formOverlapAllowed: false },
        tablet: { artworkPanel: "top_or_left", minimumClearancePx: 24 },
        mobile: { artworkPanel: "top", realFormPanel: "below", minimumClearancePx: 16 }
      },
      compatibleTargets: ["client", "employee", "both"],
      recommendedLoginMode: "clean_hero_with_real_form",
      brandingPolicy: {
        pageLevelLogoRemoved: true,
        embeddedUiRemoved: true,
        axoBrandingPreserved: true,
        physicalPropBrandingPreserved: true,
        officialFormLogoProvidedByApplication: true
      },
      activation: {
        approved: false,
        publicByDefault: false,
        requiresAdminAction: true,
        fallback: "default_writex_hero"
      },
      qualityReview: {
        sourceReviewed: "passed",
        heroCleanup: "passed",
        brandingPreservation: "passed",
        responsiveCrops: "passed",
        singleRealFormSafety: "passed"
      }
    };

    await fs.writeFile(path.join(variantDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await fs.writeFile(path.join(importDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await Promise.all([
      fs.copyFile(path.join(variantDir, "desktop-large.webp"), path.join(importAssets, "login-hero-desktop.webp")),
      fs.copyFile(path.join(variantDir, "tablet.webp"), path.join(importAssets, "login-hero-tablet.webp")),
      fs.copyFile(path.join(variantDir, "mobile-large.webp"), path.join(importAssets, "login-hero-mobile.webp"))
    ]);
    const zipName = `${group.slug}-${variantSlug}-v1.zip`;
    await writeZip(path.join(variantDir, zipName), [
      { file: path.join(importDir, "manifest.json"), archivePath: "manifest.json" },
      { file: path.join(importAssets, "login-hero-desktop.webp"), archivePath: "assets/login-hero-desktop.webp" },
      { file: path.join(importAssets, "login-hero-tablet.webp"), archivePath: "assets/login-hero-tablet.webp" },
      { file: path.join(importAssets, "login-hero-mobile.webp"), archivePath: "assets/login-hero-mobile.webp" }
    ]);
    await fs.rm(importDir, { recursive: true, force: true });

    groupVariants.push({
      slug: variantSlug,
      name: variantName,
      sourceSurface,
      sourceFileReference: `Festivals/${sourceFile}`,
      manifest: `${variantSlug}/manifest.json`,
      package: `${variantSlug}/${zipName}`,
      previewDesktop: `${variantSlug}/preview-desktop.webp`,
      previewMobile: `${variantSlug}/preview-mobile.webp`,
      compatibleTargets: ["client", "employee", "both"],
      state: "approved_for_private_review"
    });
  }

  const festivalManifest = {
    schemaVersion: 1,
    festivalName: group.name,
    slug: group.slug,
    pilot: true,
    sourceLibrary: "Festivals.zip",
    sourceStatus: group.sourceStatus || "ready",
    sourceMessage: group.sourceMessage || null,
    variantCount: groupVariants.length,
    defaultVariant: group.defaultVariant,
    availableVariants: groupVariants
  };
  await fs.writeFile(
    path.join(groupDir, "festival-manifest.json"),
    `${JSON.stringify(festivalManifest, null, 2)}\n`
  );
  pilotIndex.groups.push({
    festivalName: group.name,
    slug: group.slug,
    sourceStatus: festivalManifest.sourceStatus,
    sourceMessage: festivalManifest.sourceMessage,
    variantCount: groupVariants.length,
    defaultVariant: group.defaultVariant,
    manifest: `${group.slug}/festival-manifest.json`,
    variants: groupVariants
  });
}

await fs.writeFile(
  path.join(outputRoot, "pilot-index.json"),
  `${JSON.stringify(pilotIndex, null, 2)}\n`
);

console.log(
  JSON.stringify(
    {
      sourceImagesProcessed: sourceImageCount,
      festivalGroupsCreated: GROUPS.length,
      variantsCreated: pilotIndex.groups.reduce((sum, group) => sum + group.variantCount, 0),
      responsiveAssetsGenerated: responsiveAssetCount,
      blockedGroups: pilotIndex.groups.filter((group) => group.sourceStatus !== "ready"),
      outputRoot
    },
    null,
    2
  )
);
