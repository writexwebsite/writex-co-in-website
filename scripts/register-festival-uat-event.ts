import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { dbQuery } from "@/lib/db";
import {
  assertFestivalUatAssetIsUnique,
  registerFestivalUatReviewAsset
} from "@/lib/holiday/festival-review-batch";
import { createFestivalPackImport } from "@/lib/holiday/festival-pack-repository";
import type {
  FestivalPackMapping,
  FestivalPackScanResult,
  ScannedFestivalPackFile
} from "@/lib/holiday/festival-pack-types";
import { saveHolidayThemeAsset } from "@/lib/holiday/repository";
import type {
  FestivalAssetPlacement,
  FestivalAssetPurpose
} from "@/lib/holiday/asset-governance-types";
import type {
  HolidayAssetRole,
  HolidayThemeCategory
} from "@/lib/holiday/types";
import {
  deleteFileFromS3,
  uploadFileToS3
} from "@/lib/storage/s3";

type ReviewCategory = "header" | "ground" | "axo" | "ambient" | "feature";

type ReviewAsset = {
  fileName: string;
  displayName: string;
  category: ReviewCategory;
  role: HolidayAssetRole;
  purpose: FestivalAssetPurpose;
  placement: FestivalAssetPlacement;
  supportedRegions: string[];
  presentation: string;
  supportedMotions: string[];
  axoAnchor?: string;
};

type EventConfig = {
  slug: string;
  name: string;
  category: HolidayThemeCategory;
  variantSlug: string;
  variantName: string;
  heroSource: string;
  heroMobile: string;
  decorations: ReviewAsset[];
};

const configs: Record<string, EventConfig> = {
  "annual-report-season": {
    slug: "annual-report-season",
    name: "Annual Report Season",
    category: "business_season",
    variantSlug: "annual-report-intelligence",
    variantName: "Annual Report Intelligence",
    heroSource: "annual-report-intelligence-8k.webp",
    heroMobile: "annual-report-intelligence-mobile.webp",
    decorations: [
      {
        fileName: "annual-report-executive-header.svg",
        displayName: "Annual Report Executive Header Pack",
        category: "header",
        role: "header",
        purpose: "header_decoration",
        placement: "header_decoration_rail",
        supportedRegions: ["navigation_rail"],
        presentation: "border",
        supportedMotions: ["static", "glowing"]
      },
      {
        fileName: "annual-report-document-ground.svg",
        displayName: "Annual Report Document Ground",
        category: "ground",
        role: "footer",
        purpose: "footer_decoration",
        placement: "footer_accent",
        supportedRegions: ["footer_decoration"],
        presentation: "scene",
        supportedMotions: ["static", "floating"]
      },
      {
        fileName: "annual-report-insight-footer.svg",
        displayName: "Annual Report Insight Footer Divider",
        category: "ground",
        role: "footer",
        purpose: "footer_decoration",
        placement: "footer_accent",
        supportedRegions: ["section_dividers"],
        presentation: "border",
        supportedMotions: ["static", "glowing"]
      },
      {
        fileName: "annual-report-analyst-axo.svg",
        displayName: "Annual Report Analyst AXO",
        category: "axo",
        role: "axo",
        purpose: "axo_reference",
        placement: "axo_theme_reference",
        supportedRegions: ["axo_area"],
        presentation: "axo",
        supportedMotions: ["static", "axo_interaction"],
        axoAnchor: "right_hand"
      },
      {
        fileName: "executive-data-sparkles.svg",
        displayName: "Executive Data Sparkles",
        category: "ambient",
        role: "particle_overlay",
        purpose: "inner_page_decoration",
        placement: "inner_page_accent",
        supportedRegions: ["page_ambience"],
        presentation: "overlay",
        supportedMotions: ["static", "twinkling"]
      },
      {
        fileName: "report-insight-sweep.svg",
        displayName: "Report Insight Sweep",
        category: "feature",
        role: "decorative_overlay",
        purpose: "inner_page_decoration",
        placement: "inner_page_accent",
        supportedRegions: ["floating_edges"],
        presentation: "overlay",
        supportedMotions: ["static", "glowing"]
      }
    ]
  }
};

const [eventSlug, sourceRoot, flag] = process.argv.slice(2);
const dryRun = flag === "--dry-run";
const config = configs[eventSlug || ""];

if (!config || !sourceRoot) {
  throw new Error(
    "Usage: tsx scripts/register-festival-uat-event.ts <event-slug> <source-root> [--dry-run]"
  );
}

const checksum = (buffer: Buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

const heroWidths = [5120, 3840, 2560, 1920, 1536, 1280, 1024, 768, 480] as const;
const heroFormats = ["avif", "webp", "jpeg"] as const;

function heroMappings(width: number): FestivalPackMapping[] {
  const variant = width <= 480 ? "mobile" : width <= 1024 ? "tablet" : "desktop";
  return [
    { location: "client_login_hero", variant },
    { location: "employee_login_hero", variant }
  ];
}

const summary = {
  event: config.slug,
  dryRun,
  hero: "pending" as "pending" | "validated" | "imported" | "existing",
  reviewAssetsValidated: 0,
  reviewAssetsImported: 0,
  reviewAssetsExisting: 0,
  publicActivations: 0,
  schedulesCreated: 0,
  failures: [] as Array<{ item: string; message: string }>
};

const actorId = dryRun
  ? "00000000-0000-0000-0000-000000000000"
  : (
      await dbQuery<{ id: string }>(`
        select id
        from admin_users
        where role = 'super_admin' and is_active is true
        order by created_at asc
        limit 1
      `)
    ).rows[0]?.id;
if (!actorId) throw new Error("An active Super Admin is required for UAT import.");

const theme = dryRun
  ? {
      id: "00000000-0000-0000-0000-000000000000",
      name: config.name,
      festival_type: config.category
    }
  : (
      await dbQuery<{
        id: string;
        name: string;
        festival_type: HolidayThemeCategory;
      }>(`
        select id, name, festival_type
        from holiday_themes
        where slug = $1 and status <> 'archived'
        limit 1
      `, [config.slug])
    ).rows[0];
if (!theme) throw new Error(`The canonical ${config.name} theme was not found.`);

if (theme.festival_type !== config.category) {
  throw new Error(
    `${config.name} has type ${theme.festival_type}; expected ${config.category}. No data was changed.`
  );
}

const heroSourcePath = path.join(sourceRoot, config.heroSource);
const heroMobilePath = path.join(sourceRoot, config.heroMobile);
const heroSource = await fs.readFile(heroSourcePath);
const heroMobile = await fs.readFile(heroMobilePath);
const heroMetadata = await sharp(heroSource, { limitInputPixels: 120_000_000 }).metadata();
const heroMobileMetadata = await sharp(heroMobile, { limitInputPixels: 120_000_000 }).metadata();
if ((heroMetadata.width || 0) < 7000 || (heroMetadata.height || 0) < 3000) {
  throw new Error("The main Designer Hero source must be at least 7000 x 3000 pixels.");
}
if ((heroMobileMetadata.width || 0) < 1080 || (heroMobileMetadata.height || 0) < 1600) {
  throw new Error("The mobile Designer Hero source must be at least 1080 x 1600 pixels.");
}
summary.hero = "validated";

for (const reviewAsset of config.decorations) {
  const sourcePath = path.join(sourceRoot, reviewAsset.fileName);
  const buffer = await fs.readFile(sourcePath);
  const metadata = await sharp(buffer, { limitInputPixels: false }).metadata();
  if (!metadata.width || !metadata.height || metadata.format !== "svg") {
    summary.failures.push({
      item: reviewAsset.displayName,
      message: "The source-controlled decoration is not a measurable SVG."
    });
    continue;
  }
  summary.reviewAssetsValidated += 1;
}

if (!dryRun && summary.failures.length === 0) {
  const existingPack = await dbQuery<{ id: string }>(`
    select id
    from designer_hero_packs
    where festival_slug = $1 and variant_slug = $2 and status <> 'archived'
    limit 1
  `, [config.slug, config.variantSlug]);

  if (existingPack.rows[0]) {
    summary.hero = "existing";
  } else {
    const uploadedKeys: string[] = [];
    try {
      const original = await uploadFileToS3(heroSource, {
        fileName: config.heroSource,
        mimeType: "image/webp",
        assetType: "holiday_theme_asset",
        invoiceId: `${config.slug}-${config.variantSlug}`
      });
      uploadedKeys.push(original.s3Key);
      const mobileOriginal = await uploadFileToS3(heroMobile, {
        fileName: config.heroMobile,
        mimeType: "image/webp",
        assetType: "holiday_theme_asset",
        invoiceId: `${config.slug}-${config.variantSlug}`
      });
      uploadedKeys.push(mobileOriginal.s3Key);
      const uploadedFiles: Array<{ archivePath: string; s3Key: string }> = [];
      const derivativeRows: Array<{
        width: number;
        format: string;
        key: string;
        size: number;
        checksum: string;
      }> = [];
      const rendererFiles: ScannedFestivalPackFile[] = [];
      for (const width of heroWidths) {
        for (const format of heroFormats) {
          const derivativeSource = width <= 768 ? heroMobile : heroSource;
          let pipeline = sharp(derivativeSource, { limitInputPixels: 120_000_000 })
            .rotate()
            .resize({ width, withoutEnlargement: true, fit: "inside" });
          pipeline = format === "avif"
            ? pipeline.avif({ quality: 72, effort: 5 })
            : format === "webp"
              ? pipeline.webp({ quality: 82, effort: 5 })
              : pipeline.jpeg({ quality: 86, progressive: true });
          const buffer = await pipeline.toBuffer();
          const mimeType = format === "jpeg" ? "image/jpeg" : `image/${format}`;
          const archivePath = `designer-hero/${width}.${format}`;
          const uploaded = await uploadFileToS3(buffer, {
            fileName: `${config.slug}-${config.variantSlug}-${width}.${format === "jpeg" ? "jpg" : format}`,
            mimeType,
            assetType: "holiday_theme_asset",
            invoiceId: `${config.slug}-${config.variantSlug}`,
            holidayAssetRole: "hero_art"
          });
          uploadedKeys.push(uploaded.s3Key);
          derivativeRows.push({
            width,
            format,
            key: uploaded.s3Key,
            size: buffer.byteLength,
            checksum: checksum(buffer)
          });
          if (format === "webp" && [3840, 1024, 480].includes(width)) {
            const dimensions = await sharp(buffer).metadata();
            const mappings = heroMappings(width);
            uploadedFiles.push({ archivePath, s3Key: uploaded.s3Key });
            rendererFiles.push({
              archivePath,
              safeFileName: uploaded.fileName,
              kind: "image",
              mimeType,
              compressedSize: buffer.byteLength,
              uncompressedSize: buffer.byteLength,
              width: dimensions.width || width,
              height: dimensions.height || null,
              hasAlpha: false,
              responsiveVariant: width === 480 ? "mobile" : width === 1024 ? "tablet" : "desktop",
              detectedClassification: "clean_designer_hero",
              confidence: 1,
              reasons: [
                "Founder-confirmed clean background artwork",
                "Generated responsive derivative"
              ],
              suggestedMappings: mappings,
              inspectionStatus: "validated",
              rejectionReason: null,
              checksumSha256: checksum(buffer),
              embeddedUiState: "no_embedded_ui"
            });
          }
        }
      }
      const scan: FestivalPackScanResult = {
        mode: "standard_writex",
        manifest: {
          packType: "responsive_festival_hero",
          sourceType: "designer_hero_pack",
          festivalSlug: config.slug,
          festivalName: config.name,
          variantSlug: config.variantSlug,
          variantName: config.variantName,
          formPlacement: "right",
          overlayMode: "auto",
          originalImmutable: true,
          publicActivation: false
        },
        files: rendererFiles,
        entryCount: rendererFiles.length,
        safeAssetCount: rendererFiles.length,
        blockedEntryCount: 0,
        manualMappingCount: 0,
        completenessFlags: ["complete", "ready_to_activate"]
      };
      const created = await createFestivalPackImport({
        packageName: `${config.name} - ${config.variantName}`,
        category: config.category,
        experienceLevel: "standard",
        themeId: theme.id,
        scan,
        originalFileName: config.heroSource,
        originalZipS3Key: original.s3Key,
        originalZipSize: heroSource.byteLength,
        originalZipChecksumSha256: checksum(heroSource),
        uploadedFiles,
        clientLoginEnabled: true,
        employeeLoginEnabled: true,
        homepageEnabled: false,
        actorId
      });
      const designer = await dbQuery<{ id: string }>(`
        insert into designer_hero_packs (
          festival_pack_id,theme_id,festival_slug,variant_slug,display_name,
          target_support,source_s3_key,source_file_name,source_checksum_sha256,
          source_width,source_height,mobile_source_s3_key,overlay_mode,
          form_placement,status,notes,artwork_only_confirmed,created_by
        ) values (
          $1,$2,$3,$4,$5,'both',$6,$7,$8,$9,$10,$11,'auto','right','ready',
          $12,true,$13
        ) returning id
      `, [
        created.packId,
        theme.id,
        config.slug,
        config.variantSlug,
        config.variantName,
        original.s3Key,
        original.fileName,
        checksum(heroSource),
        heroMetadata.width,
        heroMetadata.height,
        mobileOriginal.s3Key,
        "Private UAT Designer Hero; no logo, form, CTA, text or embedded UI.",
        actorId
      ]);
      for (const row of derivativeRows) {
        await dbQuery(`
          insert into designer_hero_pack_derivatives (
            designer_hero_pack_id,width,format,s3_key,file_size,checksum_sha256
          ) values ($1,$2,$3,$4,$5,$6)
        `, [designer.rows[0].id, row.width, row.format, row.key, row.size, row.checksum]);
      }
      summary.hero = "imported";
    } catch (error) {
      await Promise.all(
        uploadedKeys.map((s3Key) => deleteFileFromS3(s3Key).catch(() => undefined))
      );
      throw error;
    }
  }

  for (const reviewAsset of config.decorations) {
    try {
      const sourcePath = path.join(sourceRoot, reviewAsset.fileName);
      const buffer = await fs.readFile(sourcePath);
      const sourceChecksum = checksum(buffer);
      const existing = await dbQuery<{ id: string }>(`
        select id
        from holiday_theme_assets
        where theme_id = $1
          and checksum_sha256 = $2
          and intended_festival = $3
          and asset_category = $4
          and status in ('staged','active','replaced')
        limit 1
      `, [theme.id, sourceChecksum, config.slug, reviewAsset.category]);
      if (existing.rows[0]) {
        summary.reviewAssetsExisting += 1;
        continue;
      }
      await assertFestivalUatAssetIsUnique({
        checksumSha256: sourceChecksum,
        festivalSlug: config.slug,
        category: reviewAsset.category
      });
      const dimensions = await sharp(buffer, { limitInputPixels: false }).metadata();
      if (!dimensions.width || !dimensions.height) {
        throw new Error("The SVG dimensions could not be validated.");
      }
      const sourceUpload = await uploadFileToS3(buffer, {
        fileName: reviewAsset.fileName,
        mimeType: "image/svg+xml",
        assetType: "holiday_theme_asset",
        invoiceId: theme.id,
        holidayAssetRole: reviewAsset.role
      });
      const thumbnail = await sharp(buffer, { limitInputPixels: false })
        .resize(640, 360, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality: 88, alphaQuality: 100 })
        .toBuffer();
      const thumbnailUpload = await uploadFileToS3(thumbnail, {
        fileName: `${path.parse(reviewAsset.fileName).name}-thumbnail.webp`,
        mimeType: "image/webp",
        assetType: "holiday_theme_asset",
        invoiceId: theme.id,
        holidayAssetRole: "supporting"
      });
      try {
        const asset = await saveHolidayThemeAsset({
          themeId: theme.id,
          role: reviewAsset.role,
          variant: `${config.variantSlug}-${reviewAsset.category}`,
          s3Key: sourceUpload.s3Key,
          safeFileName: sourceUpload.fileName,
          mimeType: sourceUpload.mimeType,
          fileSize: sourceUpload.fileSize,
          checksumSha256: sourceChecksum,
          durationSeconds: null,
          actorId,
          purpose: reviewAsset.purpose,
          placements: [reviewAsset.placement],
          sourceDimensions: {
            width: dimensions.width,
            height: dimensions.height,
            format: dimensions.format || "svg"
          },
          embeddedUiState: "no_embedded_ui"
        });
        await registerFestivalUatReviewAsset({
          versionAssetId: asset.id,
          libraryAssetId: asset.libraryAssetId,
          displayName: reviewAsset.displayName,
          festivalSlug: config.slug,
          festivalName: config.name,
          category: reviewAsset.category,
          sourceS3Key: sourceUpload.s3Key,
          thumbnailS3Key: thumbnailUpload.s3Key,
          checksumSha256: sourceChecksum,
          mimeType: sourceUpload.mimeType,
          width: dimensions.width,
          height: dimensions.height,
          fileSize: sourceUpload.fileSize,
          supportedRegions: reviewAsset.supportedRegions,
          provenance: "WriteX source-controlled UAT vector; generated for private Admin review.",
          axoAnchor: reviewAsset.axoAnchor || null,
          presentation: reviewAsset.presentation,
          supportedMotions: reviewAsset.supportedMotions,
          actorId
        });
        summary.reviewAssetsImported += 1;
      } catch (error) {
        await Promise.all([
          deleteFileFromS3(sourceUpload.s3Key).catch(() => undefined),
          deleteFileFromS3(thumbnailUpload.s3Key).catch(() => undefined)
        ]);
        throw error;
      }
    } catch (error) {
      summary.failures.push({
        item: reviewAsset.displayName,
        message: error instanceof Error ? error.message : "UAT asset import failed."
      });
    }
  }
}

console.log(JSON.stringify(summary, null, 2));
if (summary.failures.length > 0) process.exitCode = 1;
