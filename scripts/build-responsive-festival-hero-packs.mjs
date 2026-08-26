import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";

import sharp from "sharp";
import yazl from "yazl";

const [masterDir, sourceDir, inventoryPath, outputRoot] = process.argv.slice(2);

if (!masterDir || !sourceDir || !inventoryPath || !outputRoot) {
  console.error(
    "Usage: node scripts/build-responsive-festival-hero-packs.mjs <clean-master-dir> <source-dir> <inventory.json> <output-root>",
  );
  process.exit(1);
}

const EVENTS = [
  ["Bhogali Bihu", "bhogali-bihu"],
  ["Chaat Puja", "chaat-puja"],
  ["Children Day", "children-day"],
  ["Diwali", "diwali"],
  ["Durga puja", "durga-puja"],
  ["Dussehra", "dussehra"],
  ["Eid Festival", "eid-festival"],
  ["Father's Day", "fathers-day"],
  ["Gandhi Jayanti", "gandhi-jayanti"],
  ["Ganesh Chaturthi", "ganesh-chaturthi"],
  ["GuruNanak Jayanti", "gurunanak-jayanti"],
  ["Halloween", "halloween"],
  ["Happy New Year", "happy-new-year"],
  ["Independence Day", "independence-day"],
  ["Kati Bihu", "kati-bihu"],
  ["Mother's Day", "mothers-day"],
  ["Onam", "onam"],
  ["Pongal", "pongal"],
  ["Raksha Bandhan", "raksha-bandhan"],
  ["Rath Yatra", "rath-yatra"],
  ["Republic Day", "republic-day"],
  ["Rongali Bihu", "rongali-bihu"],
  ["Saraswati Puja", "saraswati-puja"],
  ["St Patrick Day", "st-patrick-day"],
  ["Thaipusam", "thaipusam"],
  ["Valentine Day", "valentine-day"],
  ["Yoga Day", "yoga-day"],
  ["christmas", "christmas"],
];

const VARIANTS = [
  { filename: "master.webp", width: 7680, height: 4320, quality: 92 },
  { filename: "desktop-2560.webp", width: 2560, height: 1440, quality: 90 },
  { filename: "desktop-1440.webp", width: 1440, height: 900, quality: 90 },
  { filename: "tablet.webp", width: 1280, height: 960, quality: 89 },
  { filename: "tablet-landscape.webp", width: 1366, height: 1024, quality: 89 },
  { filename: "tablet-portrait.webp", width: 1024, height: 768, quality: 89 },
  { filename: "mobile-430.webp", width: 860, height: 560, quality: 88 },
  { filename: "mobile-390.webp", width: 780, height: 520, quality: 88 },
  { filename: "mobile-360.webp", width: 720, height: 480, quality: 88 },
  { filename: "preview-desktop.webp", width: 720, height: 405, quality: 84 },
  { filename: "preview-mobile.webp", width: 390, height: 260, quality: 84 },
];

const inventory = JSON.parse(await fs.readFile(inventoryPath, "utf8"));
const sourceFilenames = await fs.readdir(sourceDir);
await fs.mkdir(outputRoot, { recursive: true });

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function cropForFocalPoint(sourceWidth, sourceHeight, targetWidth, targetHeight, focal) {
  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  let width = sourceWidth;
  let height = sourceHeight;
  if (sourceRatio > targetRatio) width = Math.round(sourceHeight * targetRatio);
  else height = Math.round(sourceWidth / targetRatio);
  const focalX = focal.x * sourceWidth;
  const focalY = focal.y * sourceHeight;
  const left = Math.max(0, Math.min(sourceWidth - width, Math.round(focalX - width * focal.anchorX)));
  const top = Math.max(0, Math.min(sourceHeight - height, Math.round(focalY - height * focal.anchorY)));
  return { left, top, width, height };
}

function sourceFilesForEvent(eventName) {
  const normalized = eventName.toLowerCase();
  return sourceFilenames
    .filter((filename) => filename.toLowerCase().startsWith(normalized))
    .sort((left, right) => left.localeCompare(right));
}

function selectedSourceForEvent(eventName, files) {
  return (
    files.find((filename) =>
      new RegExp(`^${eventName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} Client Login\\.png$`, "i").test(filename),
    ) || files.find((filename) => /client/i.test(filename)) || files[0]
  );
}

async function writeZip(zipPath, files) {
  const zip = new yazl.ZipFile();
  for (const file of files) zip.addFile(file.absolutePath, file.archivePath);
  zip.end();
  await new Promise((resolve, reject) => {
    const stream = zip.outputStream.pipe(createWriteStream(zipPath));
    stream.on("close", resolve);
    stream.on("error", reject);
  });
}

const index = [];

for (const [eventName, slug] of EVENTS) {
  const masterPath = path.join(masterDir, `${slug}.png`);
  const masterInput = await fs.readFile(masterPath);
  const metadata = await sharp(masterInput).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Missing dimensions for ${slug}.`);

  const packDir = path.join(outputRoot, slug);
  const importDir = path.join(packDir, "_import");
  const importAssetDir = path.join(importDir, "assets");
  await fs.rm(packDir, { recursive: true, force: true });
  await fs.mkdir(importAssetDir, { recursive: true });
  await fs.copyFile(masterPath, path.join(packDir, "master-original.png"));

  const focalPoint = { x: 0.34, y: 0.52, anchorX: 0.42, anchorY: 0.5 };
  const generatedVariants = [];
  for (const variant of VARIANTS) {
    const crop = cropForFocalPoint(
      metadata.width,
      metadata.height,
      variant.width,
      variant.height,
      focalPoint,
    );
    const destination = path.join(packDir, variant.filename);
    await sharp(masterInput)
      .extract(crop)
      .resize(variant.width, variant.height, {
        fit: "fill",
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: false,
      })
      .sharpen({ sigma: 0.65, m1: 0.35, m2: 1.1 })
      .webp({ quality: variant.quality, effort: 5, smartSubsample: true })
      .toFile(destination);
    const output = await fs.readFile(destination);
    generatedVariants.push({
      ...variant,
      checksumSha256: sha256(output),
      bytes: output.length,
      crop,
    });
  }

  const eventSourceFiles = sourceFilesForEvent(eventName);
  const selectedSource = selectedSourceForEvent(eventName, eventSourceFiles);
  const sourceReferences = [];
  for (const filename of eventSourceFiles) {
    const source = await fs.readFile(path.join(sourceDir, filename));
    sourceReferences.push({
      filename: `Festivals/${filename}`,
      checksumSha256: sha256(source),
      selectedForMaster: filename === selectedSource,
    });
  }

  const manifest = {
    schemaVersion: 1,
    eventName: eventName === "christmas" ? "Christmas" : eventName,
    slug,
    packType: "responsive_festival_hero",
    packageMode: "standard_writex",
    version: 1,
    sourceLibrary: inventory.zip,
    sourceImageCount: sourceReferences.length,
    sourceReferences,
    cleanMaster: {
      filename: "master-original.png",
      width: metadata.width,
      height: metadata.height,
      checksumSha256: sha256(masterInput),
      privateOriginalsRetained: true,
    },
    responsiveAssets: generatedVariants,
    runtimeAssets: {
      desktop: "assets/login-hero-desktop.webp",
      tablet: "assets/login-hero-tablet.webp",
      mobile: "assets/login-hero-mobile.webp",
    },
    focalPoints: {
      desktop: focalPoint,
      tablet: focalPoint,
      mobile: { x: 0.3, y: 0.5, anchorX: 0.4, anchorY: 0.5 },
    },
    safeAreas: {
      desktop: { formSide: "right_42_percent", artworkSide: "left_58_percent" },
      tablet: { formPlacement: "below_or_right", minimumClearancePx: 24 },
      mobile: { formPlacement: "below_hero", heroMaxHeightPx: 280 },
    },
    recommendedLoginMode: "clean_hero_with_real_form",
    clientCompatible: true,
    employeeCompatible: true,
    brandingPolicy: {
      pageLevelLogoRemoved: true,
      bakedLoginUiRemoved: true,
      axoBrandingPreserved: true,
      physicalPropBrandingPreserved: true,
      officialFormLogoProvidedByApplication: true,
    },
    activation: {
      approved: false,
      publicByDefault: false,
      requiresAdminAction: true,
      fallback: "default_writex_hero",
    },
    qualityReview: {
      automatedResponsiveBuild: "passed",
      visualMasterReview: "pending",
      desktopReview: "pending",
      tabletReview: "pending",
      mobileReview: "pending",
    },
  };

  await fs.writeFile(path.join(packDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(importDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.copyFile(path.join(packDir, "desktop-2560.webp"), path.join(importAssetDir, "login-hero-desktop.webp"));
  await fs.copyFile(path.join(packDir, "tablet.webp"), path.join(importAssetDir, "login-hero-tablet.webp"));
  await fs.copyFile(path.join(packDir, "mobile-430.webp"), path.join(importAssetDir, "login-hero-mobile.webp"));

  const zipPath = path.join(packDir, `${slug}-festival-hero-pack-v1.zip`);
  await writeZip(zipPath, [
    { absolutePath: path.join(importDir, "manifest.json"), archivePath: "manifest.json" },
    { absolutePath: path.join(importAssetDir, "login-hero-desktop.webp"), archivePath: "assets/login-hero-desktop.webp" },
    { absolutePath: path.join(importAssetDir, "login-hero-tablet.webp"), archivePath: "assets/login-hero-tablet.webp" },
    { absolutePath: path.join(importAssetDir, "login-hero-mobile.webp"), archivePath: "assets/login-hero-mobile.webp" },
  ]);
  await fs.rm(importDir, { recursive: true, force: true });

  index.push({
    eventName: manifest.eventName,
    slug,
    packType: manifest.packType,
    sourceImageCount: sourceReferences.length,
    manifest: `${slug}/manifest.json`,
    previewDesktop: `${slug}/preview-desktop.webp`,
    previewMobile: `${slug}/preview-mobile.webp`,
    package: `${slug}/${slug}-festival-hero-pack-v1.zip`,
    state: "awaiting_visual_approval",
  });
}

await fs.writeFile(
  path.join(outputRoot, "index.json"),
  `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), packs: index }, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      sourceImagesProcessed: inventory.total_images,
      eventGroups: EVENTS.length,
      heroPacksCreated: index.length,
      responsiveAssetsCreated: index.length * VARIANTS.length,
      outputRoot,
    },
    null,
    2,
  ),
);
