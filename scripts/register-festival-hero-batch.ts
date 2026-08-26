import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { dbQuery } from "@/lib/db";
import {
  approveFestivalPack,
  createFestivalPackImport
} from "@/lib/holiday/festival-pack-repository";
import { scanFestivalZip } from "@/lib/holiday/festival-pack-scanner";
import { deleteFileFromS3, uploadFileToS3 } from "@/lib/storage/s3";
import { canonicalFestivalEvent } from "@/lib/holiday/festival-event-registry";
import { BUILT_IN_HOLIDAY_THEMES } from "@/lib/holiday/themes";

const [sourceArchivePath, inventoryPath, libraryRoot] = process.argv.slice(2);
if (!sourceArchivePath || !inventoryPath || !libraryRoot) {
  throw new Error(
    "Usage: tsx scripts/register-festival-hero-batch.ts <Festivals.zip> <inventory.json> <library-root>"
  );
}

const sha256 = (buffer: Buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

function categoryForSlug(slug: string) {
  if (["gandhi-jayanti", "independence-day", "republic-day"].includes(slug)) {
    return "national_holiday" as const;
  }
  if (
    [
      "chaat-puja",
      "diwali",
      "durga-puja",
      "dussehra",
      "eid-festival",
      "ganesh-chaturthi",
      "gurunanak-jayanti",
      "raksha-bandhan",
      "rath-yatra",
      "saraswati-puja",
      "thaipusam",
      "christmas"
    ].includes(slug)
  ) {
    return "religious_festival" as const;
  }
  if (
    [
      "children-day",
      "fathers-day",
      "halloween",
      "happy-new-year",
      "mothers-day",
      "st-patrick-day",
      "valentine-day",
      "yoga-day"
    ].includes(slug)
  ) {
    return "global_observance" as const;
  }
  return "cultural_festival" as const;
}

const admin = await dbQuery<{ id: string }>(`
  select id from admin_users
  where role = 'super_admin' and is_active is true
  order by created_at asc
  limit 1
`);
const actorId = admin.rows[0]?.id;
if (!actorId) throw new Error("An active Super Admin is required for audited registration.");

const inventory = JSON.parse(await fs.readFile(inventoryPath, "utf8"));
const sourceArchive = await fs.readFile(sourceArchivePath);
const sourceChecksum = sha256(sourceArchive);
const existingArchive = await dbQuery<{ id: string }>(
  "select id from festival_source_archives where checksum_sha256 = $1 limit 1",
  [sourceChecksum]
);

let sourceArchiveCreated = false;
if (!existingArchive.rows[0]) {
  const upload = await uploadFileToS3(sourceArchive, {
    fileName: path.basename(sourceArchivePath),
    mimeType: "application/zip",
    assetType: "festival_pack_zip",
    invoiceId: "source-library"
  });
  try {
    await dbQuery(`
      insert into festival_source_archives (
        safe_file_name, original_s3_key, checksum_sha256, file_size,
        source_image_count, event_group_count, inventory_summary, uploaded_by
      ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
    `, [
      path.basename(sourceArchivePath),
      upload.s3Key,
      sourceChecksum,
      sourceArchive.byteLength,
      inventory.total_images,
      inventory.unique_event_groups,
      JSON.stringify(inventory),
      actorId
    ]);
    sourceArchiveCreated = true;
  } catch (error) {
    await deleteFileFromS3(upload.s3Key).catch(() => undefined);
    throw error;
  }
}

const index = JSON.parse(
  await fs.readFile(path.join(libraryRoot, "index.json"), "utf8")
) as {
  packs: Array<{
    eventName: string;
    slug: string;
    package: string;
  }>;
};

const summary = {
  sourceArchiveCreated,
  imported: 0,
  approved: 0,
  skippedExisting: 0,
  failed: [] as Array<{ slug: string; error: string }>
};

for (const target of BUILT_IN_HOLIDAY_THEMES.filter((theme) => theme.slug !== "default")) {
  await dbQuery(`
    insert into festival_hero_groups (
      festival_name, festival_slug, source_status, source_message,
      default_variant_slug, created_by, updated_by
    ) values ($1, $2, 'source_required', $3, null, $4, $4)
    on conflict (festival_slug) do nothing
  `, [target.name, target.slug,
    "No processed Hero/Background asset exists in the current Festivals.zip package.", actorId]);
}

for (const pack of index.packs) {
  try {
    const canonical = canonicalFestivalEvent(pack.eventName || pack.slug);
    const manifestPath = path.join(libraryRoot, pack.slug, "manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    const variantSlug = `source-${pack.slug}`;
    await dbQuery(`
      insert into festival_hero_groups (
        festival_name, festival_slug, source_status, source_message,
        default_variant_slug, created_by, updated_by
      ) values ($1, $2, 'ready', $3, $4, $5, $5)
      on conflict (festival_slug) do update set
        festival_name = excluded.festival_name,
        source_status = 'ready', source_message = excluded.source_message,
        default_variant_slug = coalesce(festival_hero_groups.default_variant_slug, excluded.default_variant_slug),
        updated_by = excluded.updated_by, updated_at = now()
    `, [canonical.canonicalName, canonical.canonicalSlug,
      JSON.stringify({ sourceName: pack.eventName, family: canonical.family,
        sourceImageCount: manifest.sourceImageCount || 0 }), variantSlug, actorId]);
    const existing = await dbQuery<{ id: string }>(`
      select id from festival_pack_imports
      where manifest_json->>'packType' = 'responsive_festival_hero'
        and manifest_json->>'festivalSlug' = $1
        and manifest_json->>'variantSlug' = $2
        and coalesce((manifest_json->>'version')::integer, 0) = 1
        and state <> 'archived'
      limit 1
    `, [canonical.canonicalSlug, variantSlug]);
    if (existing.rows[0]) {
      summary.skippedExisting += 1;
      continue;
    }

    const zipPath = path.join(libraryRoot, pack.package);
    const zipBuffer = await fs.readFile(zipPath);
    const scan = await scanFestivalZip({
      buffer: zipBuffer,
      sourceFileName: path.basename(zipPath),
      requestedMode: "auto_detected"
    });
    scan.manifest = {
      ...(scan.manifest || {}),
      festivalName: canonical.canonicalName,
      festivalSlug: canonical.canonicalSlug,
      variantName: "Default Variant",
      variantSlug,
      sourceEventName: pack.eventName,
      eventFamily: canonical.family,
      sourceImageCount: manifest.sourceImageCount || 0,
      clientCompatible: true,
      employeeCompatible: true
    };
    if (
      scan.manualMappingCount > 0 ||
      !scan.completenessFlags.includes("ready_to_activate")
    ) {
      throw new Error("Generated pack did not pass automatic responsive mapping.");
    }

    const originalUpload = await uploadFileToS3(zipBuffer, {
      fileName: path.basename(zipPath),
      mimeType: "application/zip",
      assetType: "festival_pack_zip",
      invoiceId: pack.slug
    });
    const uploadedFiles: Array<{ archivePath: string; s3Key: string }> = [];
    try {
      for (const file of scan.files) {
        if (!file.buffer || file.kind !== "image") continue;
        const upload = await uploadFileToS3(file.buffer, {
          fileName: file.safeFileName,
          mimeType: file.mimeType || "application/octet-stream",
          assetType: "holiday_theme_asset",
          invoiceId: pack.slug,
          holidayAssetRole: "login_background"
        });
        uploadedFiles.push({ archivePath: file.archivePath, s3Key: upload.s3Key });
      }
      const result = await createFestivalPackImport({
        packageName: `${canonical.canonicalName} Responsive Hero`,
        category: categoryForSlug(canonical.canonicalSlug),
        experienceLevel: "standard",
        scan,
        originalFileName: path.basename(zipPath),
        originalZipS3Key: originalUpload.s3Key,
        originalZipSize: zipBuffer.byteLength,
        originalZipChecksumSha256: sha256(zipBuffer),
        uploadedFiles,
        clientLoginEnabled: true,
        employeeLoginEnabled: true,
        homepageEnabled: false,
        actorId
      });
      summary.imported += 1;
      await approveFestivalPack(result.packId, actorId);
      summary.approved += 1;
    } catch (error) {
      await Promise.all([
        deleteFileFromS3(originalUpload.s3Key).catch(() => undefined),
        ...uploadedFiles.map((file) =>
          deleteFileFromS3(file.s3Key).catch(() => undefined)
        )
      ]);
      throw error;
    }
  } catch (error) {
    summary.failed.push({
      slug: pack.slug,
      error: error instanceof Error ? error.message : "Registration failed."
    });
  }
}

console.log(JSON.stringify(summary, null, 2));
if (summary.failed.length > 0) process.exitCode = 1;
