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

const [libraryRoot] = process.argv.slice(2);
if (!libraryRoot) {
  throw new Error(
    "Usage: tsx scripts/register-pilot-festival-hero-variants.ts <pilot-library-root>"
  );
}

const sha256 = (buffer: Buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

const admin = await dbQuery<{ id: string }>(`
  select id from admin_users
  where role = 'super_admin' and is_active is true
  order by created_at asc
  limit 1
`);
const actorId = admin.rows[0]?.id;
if (!actorId) throw new Error("An active Super Admin is required for pilot registration.");

const index = JSON.parse(
  await fs.readFile(path.join(libraryRoot, "pilot-index.json"), "utf8")
) as {
  groups: Array<{
    festivalName: string;
    slug: string;
    sourceStatus: "ready" | "source_required";
    sourceMessage: string | null;
    defaultVariant: string | null;
    variants: Array<{
      slug: string;
      name: string;
      package: string;
    }>;
  }>;
};

const summary = {
  groupsRegistered: 0,
  groupsSourceRequired: 0,
  variantsImported: 0,
  variantsApproved: 0,
  variantsSkipped: 0,
  publicActivations: 0,
  failed: [] as Array<{ festival: string; variant: string; error: string }>
};

for (const group of index.groups) {
  await dbQuery(
    `
      insert into festival_hero_groups (
        festival_name, festival_slug, source_status, source_message,
        default_variant_slug, created_by, updated_by
      ) values ($1, $2, $3, $4, $5, $6, $6)
      on conflict (festival_slug) do update set
        festival_name = excluded.festival_name,
        source_status = excluded.source_status,
        source_message = excluded.source_message,
        default_variant_slug = excluded.default_variant_slug,
        updated_by = excluded.updated_by,
        updated_at = now()
    `,
    [
      group.festivalName,
      group.slug,
      group.sourceStatus,
      group.sourceMessage,
      group.defaultVariant,
      actorId
    ]
  );
  summary.groupsRegistered += 1;
  if (group.sourceStatus === "source_required") summary.groupsSourceRequired += 1;

  for (const variant of group.variants) {
    try {
      const existing = await dbQuery<{ id: string }>(
        `
          select id from festival_pack_imports
          where manifest_json->>'packType' = 'responsive_festival_hero'
            and manifest_json->>'festivalSlug' = $1
            and manifest_json->>'variantSlug' = $2
            and coalesce((manifest_json->>'version')::integer, 0) = 1
            and state <> 'archived'
          limit 1
        `,
        [group.slug, variant.slug]
      );
      if (existing.rows[0]) {
        summary.variantsSkipped += 1;
        continue;
      }

      const zipPath = path.join(libraryRoot, group.slug, variant.package);
      const zipBuffer = await fs.readFile(zipPath);
      const scan = await scanFestivalZip({
        buffer: zipBuffer,
        sourceFileName: path.basename(zipPath),
        requestedMode: "auto_detected"
      });
      if (
        scan.manualMappingCount > 0 ||
        scan.blockedEntryCount > 0 ||
        !scan.completenessFlags.includes("ready_to_activate")
      ) {
        throw new Error("The responsive variant did not pass safe automatic mapping.");
      }

      const originalUpload = await uploadFileToS3(zipBuffer, {
        fileName: path.basename(zipPath),
        mimeType: "application/zip",
        assetType: "festival_pack_zip",
        invoiceId: `${group.slug}-${variant.slug}`
      });
      const uploadedFiles: Array<{ archivePath: string; s3Key: string }> = [];
      try {
        for (const file of scan.files) {
          if (!file.buffer || file.kind !== "image") continue;
          const upload = await uploadFileToS3(file.buffer, {
            fileName: file.safeFileName,
            mimeType: file.mimeType || "application/octet-stream",
            assetType: "holiday_theme_asset",
            invoiceId: `${group.slug}-${variant.slug}`,
            holidayAssetRole: "login_background"
          });
          uploadedFiles.push({ archivePath: file.archivePath, s3Key: upload.s3Key });
        }

        const result = await createFestivalPackImport({
          packageName: `${group.festivalName} - ${variant.name}`,
          category:
            group.slug === "independence-day"
              ? "national_holiday"
              : group.slug === "christmas"
                ? "religious_festival"
                : "cultural_festival",
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
        summary.variantsImported += 1;
        await approveFestivalPack(result.packId, actorId);
        summary.variantsApproved += 1;
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
        festival: group.slug,
        variant: variant.slug,
        error: error instanceof Error ? error.message : "Pilot registration failed."
      });
    }
  }
}

console.log(JSON.stringify(summary, null, 2));
if (summary.failed.length > 0) process.exitCode = 1;
